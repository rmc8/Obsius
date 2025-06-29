/**
 * Agent Orchestrator - Coordinates AI responses with tool execution
 * This class bridges the chat interface, AI providers, and Obsidian tools
 */

import { App, TFile } from 'obsidian';
import { ProviderManager } from './providers/ProviderManager';
import { ToolRegistry } from '../tools/ToolRegistry';
import { 
  ChatMessage, 
  ObsidianAction, 
  AssistantResponse, 
  ExecutionContext,
  ToolResult,
  ObsiusSettings,
  SessionStats,
  TokenUsage 
} from '../utils/types';
import { AIMessage, StreamCallback, StreamChunk } from './providers/BaseProvider';
import { t, getCurrentInterfaceLanguage, getEffectiveChatLanguage, buildLocalizedSystemPrompt } from '../utils/i18n';
import { WORKFLOW_CONSTANTS } from '../utils/constants';
import { 
  WorkflowState, 
  WorkflowStateFactory, 
  WorkflowStateManager,
  WorkflowPhase 
} from './WorkflowState';
import { BaseNode } from './workflow/BaseNode';
import { AnalyzeNode } from './workflow/AnalyzeNode';
import { SearchNode } from './workflow/SearchNode';
import { ExecuteNode } from './workflow/ExecuteNode';
import { WorkflowPersistence } from './WorkflowPersistence';

export interface AgentConfig {
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
  tools?: string[];
  providerId?: string;  // Specific provider to use
  maxIterations?: number;  // Max workflow iterations (default: 24)
  enableReACT?: boolean;   // Enable ReACT reasoning (default: true)
  resumeWorkflow?: boolean; // Resume existing workflow if available (default: true)
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
  private settings: ObsiusSettings;
  private conversationHistory: ChatMessage[] = [];
  private sessionStats: SessionStats = {
    totalTokens: 0,
    totalCost: 0,
    providerStats: {},
    requestCount: 0
  };

  // LangGraph-style workflow management
  private workflowStates: Map<string, WorkflowState> = new Map();
  private workflowNodes: Map<string, BaseNode> = new Map();
  private currentWorkflowId?: string;
  private workflowPersistence: WorkflowPersistence;

  constructor(
    app: App,
    providerManager: ProviderManager,
    toolRegistry: ToolRegistry,
    settings: ObsiusSettings
  ) {
    this.app = app;
    this.providerManager = providerManager;
    this.toolRegistry = toolRegistry;
    this.settings = settings;
    
    // Initialize workflow persistence
    this.workflowPersistence = new WorkflowPersistence(app, {
      enablePersistence: true,
      storageLocation: 'vault'
    });
    
    // Initialize workflow nodes
    this.initializeWorkflowNodes();
  }

  /**
   * Process user message using LangGraph-style StateGraph workflow
   * Enhanced with ReACT methodology and up to 24 iterations
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

      // Choose execution method based on settings
      let workflowResult: AssistantResponse;
      
      if (this.settings.workflow.enableStateGraph) {
        // Use StateGraph workflow
        workflowResult = await this.executeStateGraphWorkflow(userInput, context, config);
      } else if (this.settings.workflow.enableReACT) {
        // Use ReACT methodology without StateGraph
        workflowResult = await this.executeReACTLoop(userInput, context, config);
      } else {
        // Simple direct execution without workflows
        workflowResult = await this.executeDirectResponse(userInput, context, config);
      }
      
      return workflowResult;

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
   * Initialize workflow nodes for StateGraph execution
   */
  private initializeWorkflowNodes(): void {
    // Initialize core workflow nodes
    const analyzeNode = new AnalyzeNode({
      id: 'analyze_node',
      name: 'Task Analysis',
      enableTaskDecomposition: true,
      maxSubtasks: 8
    });

    const searchNode = new SearchNode({
      id: 'search_node',
      name: 'Information Search',
      maxSearchResults: 10,
      searchDepth: 'medium',
      includeContent: true
    });

    const executeNode = new ExecuteNode({
      id: 'execute_node',
      name: 'Action Execution',
      maxConcurrentActions: 3,
      enableActionChaining: true,
      validateBeforeExecution: true
    });

    // Register nodes
    this.workflowNodes.set('analyze_node', analyzeNode);
    this.workflowNodes.set('search_node', searchNode);
    this.workflowNodes.set('execute_node', executeNode);
  }

  /**
   * Execute StateGraph-style workflow with conditional routing
   */
  private async executeStateGraphWorkflow(
    userInput: string,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<AssistantResponse> {
    const sessionId = context.userId || 'default_session';
    const vaultName = this.app.vault.getName();
    
    // Create or get existing workflow state
    const workflowState = await this.getOrCreateWorkflowState(sessionId, userInput, vaultName, config);
    const stateManager = new WorkflowStateManager(workflowState);
    this.currentWorkflowId = workflowState.workflowId;

    const allExecutedActions: ObsidianAction[] = [];
    let finalAssistantMessage: ChatMessage | null = null;

    console.log('🔄 Starting StateGraph workflow for:', userInput);

    try {
      // Quick task complexity assessment
      const isSimpleTask = this.assessTaskComplexity(userInput);
      
      console.log(`📊 Task complexity assessment: ${isSimpleTask ? 'Simple' : 'Complex'}`);
      console.log(`📝 User input: "${userInput}"`);
      
      if (isSimpleTask) {
        console.log('⚡ Simple task detected - using direct execution');
        // For simple tasks, skip complex workflow and execute directly
        const directResult = await this.executeSimpleTask(userInput, workflowState, stateManager, context, config);
        if (directResult) {
          return directResult;
        }
      } else {
        console.log('🔄 Complex task detected - using full workflow');
      }

      // Execute full workflow for complex tasks
      while (stateManager.nextIteration() && !workflowState.isComplete && !workflowState.isError) {
        console.log(`📍 Working on: ${workflowState.currentObjective}`);
        
        // Create execution context
        const executionContext = {
          state: workflowState,
          stateManager,
          startTime: new Date(),
          timeout: this.settings.workflow.iterationTimeout * 1000, // Convert seconds to milliseconds
          logger: (message: string) => console.log(`[StateGraph] ${message}`),
          toolExecutor: async (toolName: string, parameters: any) => {
            // Convert currentFile path to TFile if needed
            let currentFile: TFile | undefined;
            if (context.currentFile) {
              const file = this.app.vault.getAbstractFileByPath(context.currentFile);
              if (file instanceof TFile) {
                currentFile = file;
              }
            }
            
            const executionContext: ExecutionContext = {
              app: this.app,
              vaultPath: (this.app.vault.adapter as any).basePath || this.app.vault.getName(),
              currentFile,
              workspaceState: context.workspaceState
            };
            return await this.executeToolForWorkflow(toolName, parameters, executionContext);
          }
        };

        // Determine current node based on phase and routing logic
        const currentNode = this.determineCurrentNode(workflowState);
        if (!currentNode) {
          console.log('❌ No valid node found for current state');
          break;
        }

        console.log(`🎯 Executing node: ${currentNode.getConfig().name} (Phase: ${workflowState.currentPhase})`);

        // Execute current node
        const nodeResult = await currentNode.execute(executionContext);
        
        // Update workflow state based on result
        if (nodeResult.success) {
          // Collect executed actions
          allExecutedActions.push(...workflowState.executedActions);
          
          // Route to next nodes
          if (nodeResult.nextNodes && nodeResult.nextNodes.length > 0) {
            const nextPhase = this.getPhaseForNode(nodeResult.nextNodes[0]);
            if (nextPhase) {
              stateManager.transitionToPhase(nextPhase);
            }
          } else {
            // No more nodes to execute - workflow complete
            stateManager.markComplete(workflowState.confidence);
            break;
          }
        } else {
          console.log(`❌ Node execution failed: ${nodeResult.error}`);
          
          // Handle node failure
          if (!nodeResult.shouldContinue) {
            stateManager.markError(nodeResult.error || 'Node execution failed');
            break;
          }
        }

        // Check for completion conditions
        if (this.checkWorkflowCompletion(workflowState, stateManager)) {
          console.log('✅ Workflow completion detected');
          stateManager.markComplete(workflowState.confidence || 0.9);
          break;
        }

        // Create checkpoint every few iterations
        if (workflowState.currentIteration % 3 === 0) {
          stateManager.createCheckpoint(`Iteration ${workflowState.currentIteration} checkpoint`);
          
          // Queue for persistence
          this.workflowPersistence.queueForPersistence(workflowState);
        }
      }

      // If workflow ended but not marked complete, check if we should mark it complete
      if (!workflowState.isComplete && !workflowState.isError) {
        const hasSuccessfulActions = workflowState.executedActions.some(a => a.result?.success);
        if (hasSuccessfulActions) {
          console.log('✅ Marking workflow complete based on successful actions');
          stateManager.markComplete(workflowState.confidence || 0.85);
        }
      }

      // Generate final assistant message
      finalAssistantMessage = this.createWorkflowSummaryMessage(workflowState, stateManager);

    } catch (error) {
      console.error('StateGraph workflow error:', error);
      stateManager.markError(error instanceof Error ? error.message : 'Unknown workflow error');
      finalAssistantMessage = this.createErrorMessage(error);
    }

    // Final persistence of completed workflow
    await this.workflowPersistence.saveWorkflowState(workflowState);
    
    console.log('🏁 Workflow completed');

    return {
      message: finalAssistantMessage || this.createWorkflowSummaryMessage(workflowState, stateManager),
      actions: allExecutedActions,
      filesCreated: this.extractCreatedFiles(allExecutedActions),
      filesModified: this.extractModifiedFiles(allExecutedActions)
    };
  }

  /**
   * Check if the task is analysis-only (no actions required)
   */
  private isAnalysisOnlyTask(userInput: string): boolean {
    const lowercaseInput = userInput.toLowerCase();
    
    // Analysis-only indicators
    const analysisPatterns = [
      'analyze this obsidian vault',
      'provide a comprehensive but concise analysis',
      'what type of knowledge vault is this',
      'what domains of knowledge are represented',
      'how is the content organized',
      'what notable organizational features',
      'what can you infer about',
      'focused on knowledge management',
      'based on the actual content',
      'keep responses focused and practical'
    ];
    
    // Check if input contains analysis-only patterns
    const hasAnalysisPatterns = analysisPatterns.some(pattern => 
      lowercaseInput.includes(pattern)
    );
    
    // Check for analysis keywords in context of vault structure
    const hasAnalysisContext = 
      lowercaseInput.includes('vault structure') ||
      lowercaseInput.includes('key file content samples') ||
      lowercaseInput.includes('knowledge management') ||
      (lowercaseInput.includes('analyze') && lowercaseInput.includes('vault'));
    
    // Check if it's explicitly requesting analysis without actions
    const isExplicitAnalysis = 
      lowercaseInput.includes('please analyze') ||
      lowercaseInput.includes('provide insights') ||
      lowercaseInput.includes('analysis focused on');
    
    return hasAnalysisPatterns || hasAnalysisContext || isExplicitAnalysis;
  }

  /**
   * Assess task complexity for routing decisions
   */
  private assessTaskComplexity(userInput: string): boolean {
    const lowercaseInput = userInput.toLowerCase();
    
    // Check if this is an analysis-only task first
    if (this.isAnalysisOnlyTask(userInput)) {
      // Complex analysis prompts (like vault analysis) need full workflow for proper AI processing
      if (userInput.includes('COMPREHENSIVE VAULT ANALYSIS') || 
          userInput.includes('ANALYSIS FRAMEWORK') ||
          userInput.length > 1000) {
        return false; // Complex analysis needs full workflow
      }
      return true; // Simple analysis tasks are simple
    }
    
    // Complex task indicators that require full workflow
    const complexIndicators = [
      'organize',
      'research',
      'comprehensive',
      'detailed',
      'multiple',
      'all',
      'every',
      'restructure',
      'migrate'
    ];
    
    // Check for complex indicators
    const hasComplexIndicators = complexIndicators.some(indicator => 
      lowercaseInput.includes(indicator)
    );
    
    // Check for multiple actions (and, then)
    const hasMultipleActions = 
      (lowercaseInput.match(/\band\b/g) || []).length > 1 ||
      lowercaseInput.includes(' then ');
    
    // Check input length (very long inputs might be complex)
    const isLongInput = userInput.split(' ').length > 20;
    
    // Simple task = NOT complex
    return !hasComplexIndicators && !hasMultipleActions && !isLongInput;
  }

  /**
   * Execute simple task directly without full workflow
   */
  private async executeSimpleTask(
    userInput: string,
    workflowState: WorkflowState,
    stateManager: WorkflowStateManager,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<AssistantResponse | null> {
    try {
      // Mark workflow as starting
      stateManager.transitionToPhase('execute');
      
      // Simple task execution - get AI response directly
      const aiResponse = await this.generateAIResponse(userInput, context, config);
      
      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: aiResponse.content,
        actions: aiResponse.actions
      };
      
      this.conversationHistory.push(assistantMessage);
      
      // Execute any tool calls if present
      const executedActions: ObsidianAction[] = [];
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          const result = await this.executeAction(action, context);
          action.result = result;
          executedActions.push(action);
          
          // Add to workflow state
          workflowState.executedActions.push(action);
          workflowState.actionResults.push(result);
        }
      }
      
      // Mark as complete
      stateManager.markComplete(0.9);
      
      // Save state
      await this.workflowPersistence.saveWorkflowState(workflowState);
      
      return {
        message: assistantMessage,
        actions: executedActions,
        filesCreated: this.extractCreatedFiles(executedActions),
        filesModified: this.extractModifiedFiles(executedActions)
      };
      
    } catch (error) {
      console.error('Simple task execution failed:', error);
      return null;
    }
  }

  /**
   * Get or create workflow state for session
   */
  private async getOrCreateWorkflowState(
    sessionId: string,
    userInput: string,
    vaultName: string,
    config: AgentConfig
  ): Promise<WorkflowState> {
    // Try to find existing incomplete workflow for this session
    if (config.resumeWorkflow !== false) {
      const persistedWorkflows = await this.workflowPersistence.listPersistedWorkflows(sessionId);
      const incompleteWorkflow = persistedWorkflows.find(w => 
        !w.metadata.phase.includes('complete') && 
        !w.metadata.phase.includes('error')
      );
      
      if (incompleteWorkflow) {
        console.log(`🔄 Resuming workflow ${incompleteWorkflow.workflowId} from ${incompleteWorkflow.metadata.phase}`);
        const workflowState = await this.workflowPersistence.loadWorkflowState(incompleteWorkflow.workflowId);
        if (workflowState) {
          this.workflowStates.set(workflowState.workflowId, workflowState);
          return workflowState;
        }
      }
    }

    // Create new workflow state
    const workflowState = WorkflowStateFactory.createInitialState(
      sessionId,
      userInput,
      vaultName,
      {
        maxIterations: config.maxIterations || this.settings.workflow.maxIterations,
        enablePersistence: true,
        verboseLogging: false,
        autoCheckpoint: true
      }
    );

    this.workflowStates.set(workflowState.workflowId, workflowState);
    return workflowState;
  }

  /**
   * Determine current node based on workflow state
   */
  private determineCurrentNode(workflowState: WorkflowState): BaseNode | null {
    switch (workflowState.currentPhase) {
      case 'initialize':
      case 'analyze':
        return this.workflowNodes.get('analyze_node') || null;
      
      case 'search':
        return this.workflowNodes.get('search_node') || null;
      
      case 'execute':
        return this.workflowNodes.get('execute_node') || null;
      
      case 'reflect':
        // For now, reflection leads to completion
        return null;
      
      case 'complete':
      case 'error':
        return null;
      
      default:
        return this.workflowNodes.get('analyze_node') || null;
    }
  }

  /**
   * Get workflow phase for node name
   */
  private getPhaseForNode(nodeName: string): WorkflowPhase | null {
    switch (nodeName) {
      case 'analyze_node':
        return 'analyze';
      case 'search_node':
        return 'search';
      case 'execute_node':
        return 'execute';
      case 'reflect_node':
        return 'reflect';
      default:
        return null;
    }
  }

  /**
   * Check if workflow should complete
   */
  private checkWorkflowCompletion(workflowState: WorkflowState, stateManager: WorkflowStateManager): boolean {
    // Early completion for simple tasks
    if (workflowState.currentIteration === 1 && workflowState.executedActions.length > 0) {
      const allActionsSuccessful = workflowState.executedActions.every(action => action.result?.success);
      if (allActionsSuccessful && workflowState.taskPlan) {
        // Simple task completed in one iteration
        if (workflowState.taskPlan.estimatedComplexity <= 2) {
          return true;
        }
      }
    }
    
    // Check if all objectives are completed
    if (workflowState.subObjectives.length > 0) {
      const allObjectivesCompleted = workflowState.completedObjectives.length >= workflowState.subObjectives.length;
      if (allObjectivesCompleted) {
        return true;
      }
    }
    
    // Check if we've accomplished the main objective
    const hasSuccessfulActions = workflowState.executedActions.some(action => action.result?.success);
    const hasHighConfidence = workflowState.confidence > 0.85;
    const completedMostObjectives = workflowState.completedObjectives.length >= workflowState.subObjectives.length * 0.8;
    
    // For tasks without sub-objectives, check if main task seems complete
    if (workflowState.subObjectives.length === 0 && hasSuccessfulActions) {
      // Check recent memory for completion signals
      const recentMemory = stateManager.getMemoryEntries(undefined, undefined, 5);
      const hasCompletionSignal = recentMemory.some(mem => 
        mem.content.toLowerCase().includes('completed') ||
        mem.content.toLowerCase().includes('finished') ||
        mem.content.toLowerCase().includes('done')
      );
      
      if (hasCompletionSignal || hasHighConfidence) {
        return true;
      }
    }
    
    // Standard completion check
    return hasSuccessfulActions && (hasHighConfidence || completedMostObjectives);
  }

  /**
   * Create workflow summary message
   */
  private createWorkflowSummaryMessage(workflowState: WorkflowState, stateManager: WorkflowStateManager): ChatMessage {
    const executedActions = workflowState.executedActions.length;
    const successfulActions = workflowState.executedActions.filter(a => a.result?.success).length;
    
    let summary = '';
    
    if (workflowState.isComplete || successfulActions > 0) {
      // If we have any successful actions, summarize what was done
      const accomplishments = this.summarizeAccomplishments(workflowState);
      summary = accomplishments;
    } else if (workflowState.isError) {
      summary = `I encountered an issue while working on your request: ${workflowState.errorMessage}`;
    } else if (executedActions === 0) {
      // No actions were taken - might be analysis only
      summary = `I analyzed your request: "${workflowState.originalRequest}"`;
      if (workflowState.taskPlan) {
        summary += `\n\nI've identified that this task requires: ${workflowState.taskPlan.requiredTools.join(', ')}.`;
      }
    } else {
      // Fallback - should rarely happen
      summary = `I processed your request but didn't complete any actions. This might indicate an issue with the workflow.`;
    }

    return {
      id: this.generateMessageId(),
      timestamp: new Date(),
      type: 'assistant',
      content: summary
    };
  }

  /**
   * Summarize what was accomplished without mentioning steps
   */
  private summarizeAccomplishments(workflowState: WorkflowState): string {
    const successfulActions = workflowState.executedActions.filter(a => a.result?.success);
    
    if (successfulActions.length === 0) {
      // Check if this is an analysis task that should return the AI's actual analysis content
      if (workflowState.currentObjective?.includes('ANALYSIS') || 
          workflowState.originalRequest?.includes('[ANALYSIS ONLY') ||
          workflowState.originalRequest?.includes('COMPREHENSIVE VAULT ANALYSIS')) {
        // For analysis tasks, look for AI response content in conversation history
        const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
        if (lastMessage?.content && lastMessage.content !== 'I completed analyzing your request.') {
          return lastMessage.content;
        }
      }
      return 'I completed analyzing your request.';
    }
    
    // Group actions by type
    const actionGroups = new Map<string, number>();
    successfulActions.forEach(action => {
      const count = actionGroups.get(action.type) || 0;
      actionGroups.set(action.type, count + 1);
    });
    
    // Build natural language summary
    const summaryParts: string[] = [];
    
    actionGroups.forEach((count, type) => {
      switch (type) {
        case 'create_note':
          summaryParts.push(`created ${count} note${count > 1 ? 's' : ''}`);
          break;
        case 'update_note':
          summaryParts.push(`updated ${count} note${count > 1 ? 's' : ''}`);
          break;
        case 'search_notes':
          summaryParts.push(`searched for relevant content`);
          break;
        case 'read_note':
          summaryParts.push(`analyzed existing notes`);
          break;
        default:
          summaryParts.push(`performed ${count} ${type} operation${count > 1 ? 's' : ''}`);
      }
    });
    
    let summary = 'I ';
    if (summaryParts.length === 1) {
      summary += summaryParts[0];
    } else if (summaryParts.length === 2) {
      summary += `${summaryParts[0]} and ${summaryParts[1]}`;
    } else {
      const lastPart = summaryParts.pop();
      summary += `${summaryParts.join(', ')}, and ${lastPart}`;
    }
    
    summary += '.';
    
    // Add specific details if available
    const createdFiles = workflowState.executedActions
      .filter(a => a.type === 'create_note' && a.result?.success)
      .map(a => a.result?.data?.path || a.parameters?.title)
      .filter(Boolean);
    
    if (createdFiles.length > 0) {
      summary += `\n\nCreated: ${createdFiles.join(', ')}`;
    }
    
    return summary;
  }

  /**
   * Execute tool for workflow nodes
   * Public method to allow workflow nodes to execute tools
   */
  public async executeToolForWorkflow(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<ToolResult> {
    try {
      const result = await this.toolRegistry.executeTool(
        toolName,
        parameters,
        {
          context: context
        }
      );

      return result;
    } catch (error) {
      console.error(`Tool execution error for ${toolName}:`, error);
      return {
        success: false,
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a single tool
   */
  private async executeTool(
    action: ObsidianAction,
    context: ConversationContext
  ): Promise<ToolResult> {
    try {
      // Convert currentFile path to TFile if needed
      let currentFile: TFile | undefined;
      if (context.currentFile) {
        const file = this.app.vault.getAbstractFileByPath(context.currentFile);
        if (file instanceof TFile) {
          currentFile = file;
        }
      }
      
      const executionContext: ExecutionContext = {
        app: this.app,
        vaultPath: (this.app.vault.adapter as any).basePath || this.app.vault.getName(),
        currentFile,
        workspaceState: context.workspaceState
      };
      
      return await this.toolRegistry.executeTool(
        action.type,
        action.parameters,
        {
          context: executionContext
        }
      );
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
   * Execute direct response without workflow (simple mode)
   */
  private async executeDirectResponse(
    userInput: string,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<AssistantResponse> {
    try {
      // Generate AI response
      const aiResponse = await this.generateAIResponse(userInput, context, config);
      
      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: aiResponse.content
      };
      
      this.conversationHistory.push(assistantMessage);
      
      // Execute any tool calls
      const executedActions: ObsidianAction[] = [];
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          const result = await this.executeTool(action, context);
          executedActions.push({
            ...action,
            result
          });
        }
      }
      
      return {
        message: assistantMessage,
        actions: executedActions
      };
    } catch (error) {
      console.error('Direct response error:', error);
      throw error;
    }
  }

  /**
   * Execute ReACT (Reasoning + Acting) loop with iterative thinking
   * [Legacy method - kept for backwards compatibility]
   */
  private async executeReACTLoop(
    userInput: string,
    context: ConversationContext,
    config: AgentConfig
  ): Promise<AssistantResponse> {
    const maxIterations = config.maxIterations || WORKFLOW_CONSTANTS.MAX_ITERATIONS;
    const allExecutedActions: ObsidianAction[] = [];
    let workingMemory: string[] = [`User Request: ${userInput}`];
    let finalAssistantMessage: ChatMessage | null = null;
    let isTaskCompleted = false;

    console.log('🔄 Starting ReACT loop for:', userInput);

    for (let iteration = 0; iteration < maxIterations && !isTaskCompleted; iteration++) {
      console.log(`📍 ReACT Iteration ${iteration + 1}/${maxIterations}`);
      
      try {
        // Build reasoning context with working memory
        const reasoningContext = this.buildReasoningContext(workingMemory, context);
        
        // Generate AI reasoning and potential actions
        const aiResponse = await this.generateReasoningResponse(reasoningContext, config);
        
        // Create assistant message for this iteration
        const assistantMessage: ChatMessage = {
          id: this.generateMessageId(),
          timestamp: new Date(),
          type: 'assistant',
          content: aiResponse.content,
          actions: aiResponse.actions
        };

        // Check if this is the final response (no more actions needed)
        if (!aiResponse.actions || aiResponse.actions.length === 0) {
          console.log('✅ Task completed - no more actions needed');
          finalAssistantMessage = assistantMessage;
          isTaskCompleted = true;
          break;
        }

        // Execute actions and gather observations
        const iterationActions: ObsidianAction[] = [];
        for (const action of aiResponse.actions) {
          console.log(`🔧 Executing action: ${action.type}`);
          
          const result = await this.executeAction(action, context);
          action.result = result;
          iterationActions.push(action);
          allExecutedActions.push(action);

          // Add observation to working memory
          const observation = this.formatObservation(action, result);
          workingMemory.push(observation);
          
          console.log(`📋 Observation: ${observation}`);
        }

        // Add reasoning step to working memory
        workingMemory.push(`Iteration ${iteration + 1} Thinking: ${aiResponse.content}`);

        // Update conversation history
        this.conversationHistory.push(assistantMessage);

        // Check if task seems completed based on results
        if (this.assessTaskCompletion(iterationActions, userInput)) {
          console.log('✅ Task completed based on successful actions');
          finalAssistantMessage = assistantMessage;
          isTaskCompleted = true;
        }

      } catch (error) {
        console.error(`❌ Error in ReACT iteration ${iteration + 1}:`, error);
        workingMemory.push(`Error in iteration ${iteration + 1}: ${error}`);
        
        // Continue to next iteration or break if critical error
        if (iteration === maxIterations - 1) {
          finalAssistantMessage = {
            id: this.generateMessageId(),
            timestamp: new Date(),
            type: 'assistant',
            content: `I encountered an error while working on your request: ${error}. I've completed what I could.`
          };
        }
      }
    }

    // If we didn't get a final message, create a summary
    if (!finalAssistantMessage) {
      const summary = this.createTaskSummary(allExecutedActions, workingMemory);
      finalAssistantMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: summary
      };
    }

    console.log('🏁 ReACT loop completed');

    return {
      message: finalAssistantMessage,
      actions: allExecutedActions,
      filesCreated: this.extractCreatedFiles(allExecutedActions),
      filesModified: this.extractModifiedFiles(allExecutedActions)
    };
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

  /**
   * Build reasoning context for ReACT loop iteration
   */
  private buildReasoningContext(workingMemory: string[], context: ConversationContext): ConversationContext {
    // Create enhanced context with working memory
    const reasoningMessages: ChatMessage[] = [...context.messages];
    
    // Add working memory as context
    if (workingMemory.length > 1) {
      const memoryContext = workingMemory.join('\n');
      reasoningMessages.push({
        id: this.generateMessageId(),
        timestamp: new Date(),
        type: 'assistant',
        content: `[Working Memory]\n${memoryContext}`
      });
    }

    return {
      ...context,
      messages: reasoningMessages
    };
  }

  /**
   * Generate AI reasoning response using ReACT methodology
   */
  private async generateReasoningResponse(
    context: ConversationContext,
    config: AgentConfig
  ): Promise<{ content: string; actions?: ObsidianAction[] }> {
    // Use the existing generateAIResponse but with ReACT-enhanced context
    return await this.generateAIResponse('', context, config);
  }

  /**
   * Format observation from action result for working memory
   */
  private formatObservation(action: ObsidianAction, result: ToolResult): string {
    const status = result.success ? '✅' : '❌';
    const actionDesc = `${status} Action: ${action.type}`;
    const resultDesc = result.success 
      ? `Result: ${result.message}${result.data ? ` | Data: ${JSON.stringify(result.data)}` : ''}`
      : `Error: ${result.error || result.message}`;
    
    return `${actionDesc} | ${resultDesc}`;
  }

  /**
   * Assess if the task has been completed based on recent actions
   */
  private assessTaskCompletion(actions: ObsidianAction[], originalRequest: string): boolean {
    // Simple heuristics for task completion
    const allActionsSuccessful = actions.every(action => action.result?.success);
    
    // Check if we have at least one successful action
    const hasSuccessfulAction = actions.some(action => action.result?.success);
    
    // For now, we consider task completed if all recent actions were successful
    // and we have at least one action
    return allActionsSuccessful && hasSuccessfulAction && actions.length > 0;
  }

  /**
   * Create a summary of the task execution for final response
   */
  private createTaskSummary(allActions: ObsidianAction[], workingMemory: string[]): string {
    const successfulActions = allActions.filter(action => action.result?.success);
    const failedActions = allActions.filter(action => !action.result?.success);
    
    let summary = `I've completed working on your request. Here's what I accomplished:\n\n`;
    
    if (successfulActions.length > 0) {
      summary += `✅ **Successful Actions:**\n`;
      successfulActions.forEach((action, index) => {
        summary += `${index + 1}. ${action.type}: ${action.result?.message}\n`;
      });
      summary += '\n';
    }
    
    if (failedActions.length > 0) {
      summary += `❌ **Issues Encountered:**\n`;
      failedActions.forEach((action, index) => {
        summary += `${index + 1}. ${action.type}: ${action.result?.error || action.result?.message}\n`;
      });
      summary += '\n';
    }
    
    summary += `Total actions performed: ${allActions.length}`;
    
    return summary;
  }

  /**
   * Get workflow persistence statistics
   */
  async getWorkflowStats(): Promise<{
    totalWorkflows: number;
    totalSize: number;
    oldestWorkflow?: Date;
    newestWorkflow?: Date;
  }> {
    return await this.workflowPersistence.getStats();
  }

  /**
   * Clean up old workflow states
   */
  async cleanupOldWorkflows(): Promise<number> {
    return await this.workflowPersistence.cleanupOldWorkflows();
  }

  /**
   * List persisted workflows for a session
   */
  async listPersistedWorkflows(sessionId?: string): Promise<any[]> {
    return await this.workflowPersistence.listPersistedWorkflows(sessionId);
  }

  /**
   * Load and resume a specific workflow
   */
  async resumeWorkflow(workflowId: string): Promise<WorkflowState | null> {
    const workflowState = await this.workflowPersistence.loadWorkflowState(workflowId);
    if (workflowState) {
      this.workflowStates.set(workflowState.workflowId, workflowState);
      this.currentWorkflowId = workflowState.workflowId;
    }
    return workflowState;
  }

  /**
   * Get current workflow state
   */
  getCurrentWorkflowState(): WorkflowState | null {
    if (this.currentWorkflowId) {
      return this.workflowStates.get(this.currentWorkflowId) || null;
    }
    return null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.workflowPersistence.destroy();
    this.workflowStates.clear();
    this.workflowNodes.clear();
  }
}