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
import { t, getCurrentLanguage, buildLocalizedSystemPrompt } from '../utils/i18n';

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

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SessionStats {
  totalTokens: number;
  totalCost: number;
  providerStats: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
  }>;
  requestCount: number;
}

/**
 * Main orchestrator for AI agent interactions
 */
export class AgentOrchestrator {
  private app: App;
  private providerManager: ProviderManager;
  private toolRegistry: ToolRegistry;
  private conversationHistory: ChatMessage[] = [];
  private sessionStats: SessionStats = {
    totalTokens: 0,
    totalCost: 0,
    providerStats: {},
    requestCount: 0
  };

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

    // Track token usage
    if (response.usage) {
      this.updateSessionStats(currentProvider.providerId, response.usage, currentProvider);
    }

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

    // Track token usage
    if (finalUsage) {
      this.updateSessionStats(currentProvider.providerId, finalUsage, currentProvider);
    }

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

    return buildLocalizedSystemPrompt({
      vaultName,
      currentFile,
      availableTools,
      enabledToolsCount
    });
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
   * Update session statistics with token usage
   */
  private updateSessionStats(providerId: string, usage: TokenUsage, provider: any): void {
    // Update overall stats
    this.sessionStats.totalTokens += usage.totalTokens;
    this.sessionStats.requestCount += 1;

    // Calculate cost
    let cost = 0;
    if (provider && typeof provider.getPricingInfo === 'function') {
      const pricing = provider.getPricingInfo(provider.config?.defaultModel || '');
      if (pricing.inputPrice && pricing.outputPrice) {
        cost = (usage.promptTokens * pricing.inputPrice / 1000) + 
               (usage.completionTokens * pricing.outputPrice / 1000);
      }
    }
    this.sessionStats.totalCost += cost;

    // Update provider-specific stats
    if (!this.sessionStats.providerStats[providerId]) {
      this.sessionStats.providerStats[providerId] = {
        tokens: 0,
        cost: 0,
        requests: 0
      };
    }
    
    const providerStats = this.sessionStats.providerStats[providerId];
    providerStats.tokens += usage.totalTokens;
    providerStats.cost += cost;
    providerStats.requests += 1;

    console.log(`📊 Session stats updated: ${usage.totalTokens} tokens, $${cost.toFixed(4)} cost`);
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): SessionStats {
    return { ...this.sessionStats };
  }

  /**
   * Clear session statistics
   */
  clearSessionStats(): void {
    this.sessionStats = {
      totalTokens: 0,
      totalCost: 0,
      providerStats: {},
      requestCount: 0
    };
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