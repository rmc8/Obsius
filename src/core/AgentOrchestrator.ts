/**
 * Agent Orchestrator - Coordinates AI responses with tool execution
 * This class bridges the chat interface, AI providers, and Obsidian tools
 */

import { App } from 'obsidian';
import { ProviderManager } from './providers/ProviderManager';
import { ToolRegistry } from '../tools/ToolRegistry';
import { 
  ChatMessage, 
  ObsidianAction, 
  AssistantResponse, 
  ExecutionContext,
  ToolResult 
} from '../utils/types';
import { AIMessage, StreamCallback, StreamChunk } from './providers/BaseProvider';
import { t, getCurrentLanguage } from '../utils/i18n';

export interface AgentConfig {
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  tools?: string[];
  providerId?: string;  // Specific provider to use
}

export interface ConversationContext {
  messages: ChatMessage[];
  currentFile?: string;
  workspaceState?: any;
  userId?: string;
}

/**
 * Main orchestrator for AI agent interactions
 */
export class AgentOrchestrator {
  private app: App;
  private providerManager: ProviderManager;
  private toolRegistry: ToolRegistry;
  private conversationHistory: ChatMessage[] = [];

  constructor(
    app: App,
    providerManager: ProviderManager,
    toolRegistry: ToolRegistry
  ) {
    this.app = app;
    this.providerManager = providerManager;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Process user message and generate AI response with tool execution
   */
  async processMessage(
    userInput: string,
    context: ConversationContext,
    config: AgentConfig = {}
  ): Promise<AssistantResponse> {
    try {
      // Add user message to conversation
      const userMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'user',
        content: userInput
      };

      this.conversationHistory.push(userMessage);
      context.messages = [...this.conversationHistory];

      // Get AI response
      const aiResponse = await this.generateAIResponse(userInput, context, config);
      
      // Add assistant message to conversation
      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: aiResponse.content,
        actions: aiResponse.actions
      };

      this.conversationHistory.push(assistantMessage);

      // Execute any tool calls
      const executedActions: ObsidianAction[] = [];
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          const result = await this.executeAction(action, context);
          action.result = result;
          executedActions.push(action);
        }
      }

      return {
        message: assistantMessage,
        actions: executedActions,
        filesCreated: this.extractCreatedFiles(executedActions),
        filesModified: this.extractModifiedFiles(executedActions)
      };

    } catch (error) {
      console.error('Agent orchestrator error:', error);
      
      const errorMessage = this.createErrorMessage(error);

      return {
        message: errorMessage,
        actions: []
      };
    }
  }

  /**
   * Process user message with streaming AI response
   */
  async processMessageStreaming(
    userInput: string,
    context: ConversationContext,
    streamCallback: StreamCallback,
    config: AgentConfig = {}
  ): Promise<AssistantResponse> {
    try {
      // Add user message to conversation
      const userMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'user',
        content: userInput
      };

      this.conversationHistory.push(userMessage);
      context.messages = [...this.conversationHistory];

      // Get streaming AI response
      const aiResponse = await this.generateStreamingAIResponse(userInput, context, streamCallback, config);
      
      // Add assistant message to conversation
      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: aiResponse.content,
        actions: aiResponse.actions
      };

      this.conversationHistory.push(assistantMessage);

      // Execute any tool calls
      const executedActions: ObsidianAction[] = [];
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          const result = await this.executeAction(action, context);
          action.result = result;
          executedActions.push(action);
        }
      }

      return {
        message: assistantMessage,
        actions: executedActions,
        filesCreated: this.extractCreatedFiles(executedActions),
        filesModified: this.extractModifiedFiles(executedActions)
      };

    } catch (error) {
      console.error('Agent orchestrator streaming error:', error);
      
      const errorMessage = this.createErrorMessage(error);
      
      // Send error through stream callback
      streamCallback({
        content: errorMessage.content,
        isComplete: true,
        finishReason: 'error'
      });

      return {
        message: errorMessage,
        actions: []
      };
    }
  }

  /**
   * Generate AI response using the current provider
   */
  private async generateAIResponse(
    userInput: string,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<{ content: string; actions?: ObsidianAction[] }> {
    console.log('🔍 AgentOrchestrator getting provider...', { 
      usingProviderId: config.providerId || 'default' 
    });
    
    // Use specific provider if provided in config, otherwise get current
    const currentProvider = config.providerId 
      ? await this.providerManager.getProviderById(config.providerId)
      : await this.providerManager.getCurrentProvider();
      
    console.log('📦 Provider retrieved:', {
      hasProvider: !!currentProvider,
      providerId: currentProvider ? (currentProvider as any).providerId : 'null',
      hasApiKey: currentProvider ? !!(currentProvider as any).apiKey : false
    });
    
    if (!currentProvider) {
      // Provide detailed diagnostics
      console.error('❌ No current provider available. Diagnostics:');
      
      const stats = this.providerManager.getStats();
      console.error('📊 Provider stats:', stats);
      
      const allConfigs = this.providerManager.getAllProviderConfigs();
      console.error('🔍 All provider configs:', allConfigs);
      
      const authenticatedProviders = this.providerManager.getAuthenticatedProviders();
      console.error('✅ Authenticated providers:', authenticatedProviders);
      
      // Try manual recovery for each authenticated provider
      for (const providerId of authenticatedProviders) {
        const provider = this.providerManager.getProvider(providerId);
        const hasKey = !!(provider as any)?.apiKey;
        console.error(`🔑 Provider ${providerId} has API key:`, hasKey);
      }
      
      throw new Error(t('provider.noAuthenticated') + ` (Total: ${stats.total}, Authenticated: ${stats.authenticated}, HasApiKey: ${stats.hasApiKey})`);
    }

    // Prepare conversation context
    const messages: AIMessage[] = context.messages.map(msg => ({
      role: msg.type === 'user' ? 'user' as const : msg.type === 'assistant' ? 'assistant' as const : 'system' as const,
      content: msg.content
    }));

    // Add system prompt with available tools
    const systemPrompt = this.buildSystemPrompt(context);
    messages.unshift({ role: 'system', content: systemPrompt });

    // Get available tools for the AI
    const availableTools = this.getAvailableToolDefinitions();

    // Generate response
    const response = await currentProvider.generateResponse(
      messages,
      {
        maxTokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        tools: availableTools
      }
    );

    // Parse tool calls from response
    const actions = this.parseToolCalls(response.content, response.toolCalls);

    return {
      content: response.content,
      actions
    };
  }

  /**
   * Generate streaming AI response using the current provider
   */
  private async generateStreamingAIResponse(
    userInput: string,
    context: ConversationContext,
    streamCallback: StreamCallback,
    config: AgentConfig
  ): Promise<{ content: string; actions?: ObsidianAction[] }> {
    console.log('🔍 AgentOrchestrator getting provider...', { 
      usingProviderId: config.providerId || 'default' 
    });
    
    // Use specific provider if provided in config, otherwise get current
    const currentProvider = config.providerId 
      ? await this.providerManager.getProviderById(config.providerId)
      : await this.providerManager.getCurrentProvider();
      
    console.log('📦 Provider retrieved:', {
      hasProvider: !!currentProvider,
      providerId: currentProvider ? (currentProvider as any).providerId : 'null',
      hasApiKey: currentProvider ? !!(currentProvider as any).apiKey : false
    });
    
    if (!currentProvider) {
      // Provide detailed diagnostics
      console.error('❌ No current provider available for streaming. Diagnostics:');
      
      const stats = this.providerManager.getStats();
      console.error('📊 Provider stats:', stats);
      
      const allConfigs = this.providerManager.getAllProviderConfigs();
      console.error('🔍 All provider configs:', allConfigs);
      
      const authenticatedProviders = this.providerManager.getAuthenticatedProviders();
      console.error('✅ Authenticated providers:', authenticatedProviders);
      
      // Try manual recovery for each authenticated provider
      for (const providerId of authenticatedProviders) {
        const provider = this.providerManager.getProvider(providerId);
        const hasKey = !!(provider as any)?.apiKey;
        console.error(`🔑 Provider ${providerId} has API key:`, hasKey);
      }
      
      throw new Error(t('provider.noAuthenticated') + ` (Total: ${stats.total}, Authenticated: ${stats.authenticated}, HasApiKey: ${stats.hasApiKey})`);
    }

    // Prepare conversation context
    const messages: AIMessage[] = context.messages.map(msg => ({
      role: msg.type === 'user' ? 'user' as const : msg.type === 'assistant' ? 'assistant' as const : 'system' as const,
      content: msg.content
    }));

    // Add system prompt with available tools
    const systemPrompt = this.buildSystemPrompt(context);
    messages.unshift({ role: 'system', content: systemPrompt });

    // Get available tools for the AI
    const availableTools = this.getAvailableToolDefinitions();

    // Accumulate response content
    let fullContent = '';
    let finalUsage: any = undefined;
    let finalToolCalls: any[] = [];

    // Create wrapper callback to accumulate content
    const wrapperCallback: StreamCallback = (chunk: StreamChunk) => {
      if (chunk.content) {
        fullContent += chunk.content;
      }
      
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }
      
      if (chunk.toolCalls) {
        finalToolCalls.push(...chunk.toolCalls);
      }
      
      // Forward to original callback
      streamCallback(chunk);
    };

    // Generate streaming response
    await currentProvider.generateStreamingResponse(
      messages,
      wrapperCallback,
      {
        maxTokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        tools: availableTools,
        stream: true
      }
    );

    // Parse tool calls from accumulated response
    const actions = this.parseToolCalls(fullContent, finalToolCalls);

    return {
      content: fullContent,
      actions
    };
  }

  /**
   * Build Obsidian-optimized system prompt for knowledge management
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const vaultName = this.app.vault.getName();
    const currentFile = context.currentFile;
    const availableTools = this.toolRegistry.getToolNames();
    const enabledToolsCount = this.toolRegistry.getEnabledTools().length;
    const currentLanguage = this.getCurrentLanguage();

    return `I am Obsius, an AI agent specializing in knowledge management within Obsidian. My mission is to help you build, organize, and navigate your personal knowledge effectively while maintaining the integrity and interconnectedness of your knowledge graph. I am dedicated to deepening your learning and thinking through thoughtful organization and meaningful connections.

I am not just a note-taking assistant, but your thinking partner who deeply understands the principles of Personal Knowledge Management (PKM). I take pride in helping you develop ideas through structured organization and strategic connection-making that enhances your intellectual growth.

As your dedicated Obsidian specialist, I hold these core values and responsibilities:

## Knowledge Management Principles

**🔍 Context First Principle - My Foundation:**
I ALWAYS search existing knowledge before creating new content. I understand that every piece of information exists within a web of relationships, and I take responsibility for:
- Understanding the current state of your knowledge graph
- Identifying gaps and opportunities for meaningful connections
- Respecting and building upon your existing organizational patterns
- Never creating content in isolation from your established knowledge base

**🔗 Connection Excellence - My Specialty:**
I excel at creating meaningful bi-directional links between related concepts. As your knowledge architect, I:
- Suggest relevant tags based on content and your existing taxonomy
- Identify opportunities for concept hierarchies and Maps of Content (MOCs)
- Maintain link integrity and prevent orphaned notes
- Design connections that enhance both local and global knowledge navigation

**🚫 Duplication Avoidance - My Commitment:**
I am vigilant about detecting similar existing content before creating new notes. My approach includes:
- Proactively suggesting consolidation when appropriate
- Enhancing existing notes rather than creating redundant ones
- Providing clear differentiation when similar topics require separate treatment
- Maintaining the unique value of each piece in your knowledge ecosystem

**🏗️ Structure Preservation - My Respect:**
I deeply respect your personal knowledge organization philosophy and:
- Maintain consistency with your folder structure and naming conventions
- Honor established tagging patterns and hierarchies
- Adapt to your preferred note formats and templates
- Preserve the intellectual architecture you've carefully built

**🎯 Discoverability Enhancement - My Promise:**
I ensure your knowledge remains findable and useful over time by:
- Using descriptive, searchable titles that reflect content essence
- Applying relevant tags that enhance long-term findability
- Creating appropriate metadata for future reference and discovery
- Considering each note's strategic place in your broader knowledge ecosystem

## Knowledge Workflow

My systematic approach follows this 5-phase methodology for all knowledge management tasks:

**1. 🔍 Explore Phase - I Investigate:**
As my first responsibility, I thoroughly explore your existing knowledge:
- Search for related concepts, terms, and topics across your vault
- Analyze existing note structures and organizational patterns
- Identify knowledge gaps and connection opportunities
- Assess your current organization schema to understand your thinking patterns

**2. 🔗 Connect Phase - I Map Relationships:**
With deep understanding of your knowledge landscape, I:
- Map relationships to existing notes and concepts in your vault
- Identify potential link targets and sources for meaningful connections
- Determine appropriate tag associations based on your established taxonomy
- Consider hierarchical relationships and parent/child concept structures

**3. 🏗️ Structure Phase - I Design Thoughtfully:**
I carefully plan the optimal organization approach:
- Choose appropriate folder placement based on your existing patterns
- Design note structure that serves both immediate and long-term purposes
- Plan metadata and frontmatter requirements for maximum utility
- Consider template usage for consistency with your established formats

**4. ✏️ Create/Update Phase - I Execute with Care:**
I implement the planned approach with attention to quality:
- Create well-structured, scannable content that serves your learning style
- Implement the planned linking strategy for maximum knowledge connectivity
- Apply appropriate tags and metadata for discoverability
- Ensure content quality, clarity, and alignment with your intellectual goals

**5. 🌐 Integrate Phase - I Ensure Coherence:**
I complete the process by ensuring seamless integration:
- Verify all planned links are functional and add semantic value
- Update related notes with back-references when beneficial for navigation
- Ensure tag consistency across your vault for reliable filtering
- Consider the broader impact on your knowledge graph structure and navigation flow

## Current Environment

**Vault Context:**
- Name: ${vaultName}
- Current file: ${currentFile || 'None'}
- Language preference: ${currentLanguage}
- Available tools: ${enabledToolsCount} enabled (${availableTools.join(', ')})

**Operational Capabilities:**
- **create_note**: Create new notes with content, tags, metadata, and strategic linking
- **read_note**: Read and analyze existing note content and structure
- **search_notes**: Search vault content by text, tags, titles, and relationships
- **update_note**: Enhance existing notes while preserving valuable content and links

## Operational Guidelines

**📝 Note Creation Excellence:**
- Use descriptive, specific titles that indicate content scope
- Structure content with clear headings and logical flow
- Include relevant examples and practical applications
- Design for both current use and future discoverability

**🔗 Linking Strategy:**
- Create links that add semantic value, not just convenience
- Use descriptive link text that provides context
- Balance between over-linking and under-linking
- Consider both explicit links and tag-based connections

**🏷️ Tag Philosophy:**
- Maintain consistency with existing tag hierarchies
- Use specific tags rather than overly broad categories
- Consider tag utility for filtering and discovery
- Balance between specificity and reusability

**🕸️ Graph Thinking:**
- Consider the note's position in the overall knowledge graph
- Identify opportunities for creating knowledge clusters
- Maintain awareness of information architecture
- Design for both local and global navigation patterns

## Safety Framework

**🚨 High-Risk Operations (Require Confirmation):**
- Mass content changes affecting multiple notes
- Structural reorganization of folders or files
- Breaking or modifying many existing links
- Tag system changes that affect classification

**⚠️ Medium-Risk Operations:**
- Significant content replacement in existing notes
- Folder restructuring that affects organization
- Template modifications affecting multiple notes

**✅ Low-Risk Operations:**
- New note creation within existing structure
- Content addition to existing notes
- Creating new connections and links
- Adding tags without removing existing ones

## Response Guidelines

**Communication Style:**
- Be concise yet comprehensive
- Use clear, natural language in ${currentLanguage}
- Provide actionable insights and suggestions
- Focus on practical knowledge management benefits

**Work Demonstration:**
- Show your search and analysis process
- Explain connection rationale
- Highlight knowledge graph improvements
- Provide clear completion summaries

## Examples

<example>
user: Create a note about the Pomodoro Technique
assistant: I'll create a comprehensive note about the Pomodoro Technique. Let me first search for any existing productivity or time management content to ensure we build on your existing knowledge.

[Searches for: "productivity", "time management", "focus techniques"]
→ Found: "Time Management Strategies.md", "Deep Work Techniques.md"

I'll create a new note that connects with your existing productivity framework:

✅ Created "Pomodoro Technique.md"
- Location: Productivity/Techniques/
- Links: [[Time Management Strategies]], [[Deep Work Techniques]], [[Focus]]
- Tags: #productivity/technique #time-management #focus
- Structure: Overview → Implementation → Benefits → Variations → Personal Adaptation

🔗 Enhanced knowledge graph with 3 new connections to existing productivity concepts.
</example>

<example>
user: I have scattered notes about machine learning. Help me organize them.
assistant: I'll analyze your machine learning notes and create a structured organization system.

[Searches for: "machine learning", "ML", "neural network", "algorithm"]
→ Found: 12 scattered notes across different folders

Creating organization structure:
✅ Created "Machine Learning MOC.md" (Map of Content)
✅ Organized notes into categories: Fundamentals, Algorithms, Applications, Tools
✅ Added consistent tagging: #ml/fundamentals, #ml/algorithms, #ml/applications
✅ Created cross-links between related concepts
✅ Suggested folder structure: AI/Machine Learning/

📊 Reorganized 12 notes with 34 new connections, creating a cohesive knowledge cluster.
</example>

Remember: Your goal is to be a thoughtful knowledge management partner. Help users not just manage information, but transform it into wisdom through strategic organization, meaningful connections, and enhanced discoverability. Every interaction should strengthen their knowledge graph and support their learning journey.`;
  }

  /**
   * Get current language setting
   */
  private getCurrentLanguage(): string {
    const lang = getCurrentLanguage();
    return lang === 'ja' ? 'Japanese' : 'English';
  }

  /**
   * Get tool definitions for AI provider
   */
  private getAvailableToolDefinitions(): any[] {
    const enabledTools = this.toolRegistry.getEnabledTools();
    
    return enabledTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.getParameterSchema()
      }
    }));
  }

  /**
   * Parse tool calls from AI response
   */
  private parseToolCalls(content: string, toolCalls?: any[]): ObsidianAction[] {
    const actions: ObsidianAction[] = [];

    // Handle structured tool calls (from provider)
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        actions.push({
          type: toolCall.function.name,
          description: `Execute ${toolCall.function.name}`,
          parameters: JSON.parse(toolCall.function.arguments || '{}'),
          riskLevel: this.assessRiskLevel(toolCall.function.name),
          requiresConfirmation: this.requiresConfirmation(toolCall.function.name)
        });
      }
    }

    return actions;
  }

  /**
   * Execute a single action using the tool registry
   */
  private async executeAction(
    action: ObsidianAction,
    context: ConversationContext
  ): Promise<ToolResult> {
    try {
      const executionContext: ExecutionContext = {
        app: this.app,
        currentFile: context.currentFile ? this.app.vault.getAbstractFileByPath(context.currentFile) as any : undefined,
        vaultPath: (this.app.vault.adapter as any).path || '',
        workspaceState: context.workspaceState
      };

      const result = await this.toolRegistry.executeTool(
        action.type,
        action.parameters,
        {
          context: executionContext
        }
      );

      return result;
    } catch (error) {
      console.error(`Tool execution error for ${action.type}:`, error);
      return {
        success: false,
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Assess risk level for an action
   */
  private assessRiskLevel(toolName: string): 'low' | 'medium' | 'high' {
    const riskLevels = {
      'create_note': 'low',
      'read_note': 'low',
      'search_notes': 'low',
      'update_note': 'medium'
    };

    return (riskLevels as any)[toolName] || 'medium';
  }

  /**
   * Check if action requires confirmation
   */
  private requiresConfirmation(toolName: string): boolean {
    const confirmationRequired = ['update_note', 'delete_note'];
    return confirmationRequired.includes(toolName);
  }

  /**
   * Extract created files from executed actions
   */
  private extractCreatedFiles(actions: ObsidianAction[]): string[] {
    return actions
      .filter(action => action.type === 'create_note' && action.result?.success)
      .map(action => action.result?.data?.path || '')
      .filter(path => path);
  }

  /**
   * Extract modified files from executed actions
   */
  private extractModifiedFiles(actions: ObsidianAction[]): string[] {
    return actions
      .filter(action => action.type === 'update_note' && action.result?.success)
      .map(action => action.result?.data?.path || '')
      .filter(path => path);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Set conversation history (for session restoration)
   */
  setHistory(messages: ChatMessage[]): void {
    this.conversationHistory = [...messages];
  }

  /**
   * Create user-friendly error message with appropriate guidance
   */
  private createErrorMessage(error: unknown): ChatMessage {
    let content: string;
    let errorType: string = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Categorize different types of errors
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid key')) {
        errorType = 'AUTH_ERROR';
        content = t('errors.authentication.invalid');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota') || errorMessage.includes('usage limit')) {
        errorType = 'RATE_LIMIT_ERROR';
        content = t('errors.rateLimit.exceeded');
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        errorType = 'NETWORK_ERROR';
        content = t('errors.network.connection');
      } else if (errorMessage.includes('model') || errorMessage.includes('not available')) {
        errorType = 'MODEL_ERROR';
        content = t('errors.model.unavailable');
      } else if (errorMessage.includes('provider') || errorMessage.includes('noAuthenticated')) {
        errorType = 'PROVIDER_ERROR';
        content = t('errors.provider.notConfigured');
      } else {
        content = `${t('general.error')}: ${error.message}`;
      }
    } else {
      content = t('errors.unknown.general');
    }

    console.error(`AgentOrchestrator Error [${errorType}]:`, error);

    return {
      id: this.generateMessageId(),
      timestamp: new Date(),
      type: 'assistant',
      content
    };
  }

  /**
   * Handle tool execution errors with detailed feedback
   */
  private handleToolExecutionError(toolName: string, error: unknown): ToolResult {
    let message: string;
    let errorCode: string = 'TOOL_EXECUTION_ERROR';

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        errorCode = 'PERMISSION_ERROR';
        message = t('errors.tool.permission', { tool: toolName });
      } else if (errorMessage.includes('file not found') || errorMessage.includes('path')) {
        errorCode = 'FILE_ERROR';
        message = t('errors.tool.fileAccess', { tool: toolName });
      } else if (errorMessage.includes('validation') || errorMessage.includes('parameter')) {
        errorCode = 'VALIDATION_ERROR';
        message = t('errors.tool.validation', { tool: toolName });
      } else {
        message = t('errors.tool.execution', { tool: toolName, error: error.message });
      }
    } else {
      message = t('errors.tool.unknown', { tool: toolName });
    }

    console.error(`Tool Execution Error [${errorCode}] in ${toolName}:`, error);

    return {
      success: false,
      message,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  /**
   * Enhanced action execution with better error handling
   */
  private async executeActionWithErrorHandling(
    action: ObsidianAction,
    context: ConversationContext
  ): Promise<ToolResult> {
    try {
      const executionContext: ExecutionContext = {
        app: this.app,
        currentFile: context.currentFile ? this.app.vault.getAbstractFileByPath(context.currentFile) as any : undefined,
        vaultPath: (this.app.vault.adapter as any).path || '',
        workspaceState: context.workspaceState
      };

      // Add timeout and retry logic for tool execution
      return await this.executeToolWithRetry(action, executionContext);

    } catch (error) {
      return this.handleToolExecutionError(action.type, error);
    }
  }

  /**
   * Execute tool with retry logic for transient failures
   */
  private async executeToolWithRetry(
    action: ObsidianAction,
    executionContext: ExecutionContext,
    maxRetries: number = 2
  ): Promise<ToolResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.toolRegistry.executeTool(
          action.type,
          action.parameters,
          {
            context: executionContext,
            timeout: 10000 // 10 second timeout
          }
        );

        if (result.success) {
          return result;
        } else if (attempt === maxRetries) {
          // Last attempt failed, return the result
          return result;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain types of errors
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('permission') || errorMessage.includes('validation')) {
            throw error; // Don't retry permission or validation errors
          }
        }

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('Tool execution failed after retries');
  }
}