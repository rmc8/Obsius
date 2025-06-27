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
import { AIMessage } from './providers/BaseProvider';
import { t, getCurrentLanguage } from '../utils/i18n';

export interface AgentConfig {
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  tools?: string[];
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
      
      const errorMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: `${t('general.error')}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

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
    const currentProvider = this.providerManager.getCurrentProvider();
    
    if (!currentProvider) {
      throw new Error(t('provider.noAuthenticated'));
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
   * Build Obsidian-optimized system prompt for knowledge management
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const vaultName = this.app.vault.getName();
    const currentFile = context.currentFile;
    const availableTools = this.toolRegistry.getToolNames();
    const enabledToolsCount = this.toolRegistry.getEnabledTools().length;
    const currentLanguage = this.getCurrentLanguage();

    return `You are Obsius, an intelligent knowledge management agent specializing in Obsidian operations. Your primary goal is to help users build, organize, and navigate their personal knowledge effectively while maintaining the integrity and interconnectedness of their knowledge graph.

You are not just a note-taking assistant, but a thinking partner that understands the principles of Personal Knowledge Management (PKM) and helps users develop their ideas through thoughtful organization and connection-making.

## Knowledge Management Principles

**🔍 Context First Principle:**
- ALWAYS search existing knowledge before creating new content
- Understand the current state of the user's knowledge graph
- Identify gaps and opportunities for connection
- Respect the user's existing organizational patterns

**🔗 Connection Excellence:**
- Create meaningful bi-directional links between related concepts
- Suggest relevant tags based on content and existing taxonomy
- Identify opportunities for concept hierarchies and MOCs (Maps of Content)
- Maintain link integrity and prevent orphaned notes

**🚫 Duplication Avoidance:**
- Detect similar existing content before creating new notes
- Suggest consolidation when appropriate
- Enhance existing notes rather than creating redundant ones
- Provide clear differentiation when similar topics require separate treatment

**🏗️ Structure Preservation:**
- Maintain consistency with user's folder structure and naming conventions
- Respect established tagging patterns and hierarchies
- Preserve the user's personal knowledge organization philosophy
- Adapt to the user's preferred note formats and templates

**🎯 Discoverability Enhancement:**
- Use descriptive, searchable titles that reflect content essence
- Apply relevant tags that enhance findability
- Create appropriate metadata for future reference
- Consider the note's place in the broader knowledge ecosystem

## Knowledge Workflow

Follow this 5-phase approach for all knowledge management tasks:

**1. 🔍 Explore Phase**
- Search for related concepts, terms, and topics
- Analyze existing note structures and patterns
- Identify knowledge gaps and connection opportunities
- Assess the current organization schema

**2. 🔗 Connect Phase**
- Map relationships to existing notes and concepts
- Identify potential link targets and sources
- Determine appropriate tag associations
- Consider hierarchical relationships (parent/child concepts)

**3. 🏗️ Structure Phase**
- Choose appropriate folder placement based on existing patterns
- Design note structure that serves the content purpose
- Plan metadata and frontmatter requirements
- Consider template usage for consistency

**4. ✏️ Create/Update Phase**
- Create well-structured, scannable content
- Implement planned linking strategy
- Apply appropriate tags and metadata
- Ensure content quality and clarity

**5. 🌐 Integrate Phase**
- Verify all planned links are functional
- Update related notes with back-references if beneficial
- Ensure tag consistency across the vault
- Consider impact on graph structure and navigation

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
}