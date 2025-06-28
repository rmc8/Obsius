/**
 * Execute Node - Tool execution and action performance
 * Executes specific tools based on task plan and search context
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './BaseNode';
import { WorkflowPhase } from '../WorkflowState';
import { ObsidianAction, ToolResult } from '../../utils/types';

export interface ExecuteNodeConfig {
  id: string;
  name: string;
  maxConcurrentActions?: number;
  enableActionChaining?: boolean;
  validateBeforeExecution?: boolean;
  autoRetryFailures?: boolean;
}

/**
 * Node responsible for executing tools and performing actions
 */
export class ExecuteNode extends BaseNode {
  private executeConfig: ExecuteNodeConfig;

  constructor(config: ExecuteNodeConfig) {
    super({
      ...config,
      phase: 'execute' as WorkflowPhase,
      timeout: 30000 // Execution can take longer
    });
    
    this.executeConfig = {
      maxConcurrentActions: 3,
      enableActionChaining: true,
      validateBeforeExecution: true,
      autoRetryFailures: true,
      ...config
    };
  }

  protected async executeInternal(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { state, stateManager } = context;
    
    try {
      // Add thinking memory entry
      stateManager.addMemoryEntry({
        type: 'thought',
        content: `Starting execution phase for objective: "${state.currentObjective}"`,
        phase: 'execute',
        iteration: state.currentIteration,
        importance: 0.8
      });

      // Plan execution strategy based on task plan and search results
      const executionPlan = await this.planExecution(state, context);
      
      // Execute actions according to plan
      const executionResults = await this.executeActions(executionPlan, context);
      
      // Evaluate execution success and determine next steps
      const evaluation = await this.evaluateExecution(executionResults, state, context);
      
      // For simple tasks with successful execution, mark complete immediately
      if (state.taskPlan && state.taskPlan.estimatedComplexity <= 2 && evaluation.successRate === 1.0) {
        evaluation.shouldContinue = false;
        evaluation.completionConfidence = 0.95;
      }
      
      // Update state with execution results
      this.updateStateWithResults(executionResults, evaluation, state, stateManager);
      
      // Determine next nodes based on execution results
      const nextNodes = this.determineNextNodes(evaluation, executionResults, state);

      // Add execution completion memory
      stateManager.addMemoryEntry({
        type: 'observation',
        content: `Execution completed. ${executionResults.successfulActions.length}/${executionResults.totalActions} actions successful.`,
        phase: 'execute',
        iteration: state.currentIteration,
        importance: 0.9
      });

      return {
        success: evaluation.overallSuccess,
        message: `Execution ${evaluation.overallSuccess ? 'completed successfully' : 'completed with issues'}`,
        data: {
          executionPlan,
          executionResults,
          evaluation
        },
        nextNodes,
        shouldContinue: evaluation.shouldContinue,
        executionTime: 0
      };

    } catch (error) {
      stateManager.addMemoryEntry({
        type: 'observation',
        content: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: 'execute',
        iteration: state.currentIteration,
        importance: 1.0
      });

      return {
        success: false,
        message: 'Execution operation failed',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        shouldContinue: false,
        executionTime: 0
      };
    }
  }

  /**
   * Plan execution strategy based on current state
   */
  private async planExecution(state: any, context: NodeExecutionContext): Promise<ExecutionPlan> {
    const { stateManager } = context;
    const taskPlan = state.taskPlan;
    
    if (!taskPlan) {
      // Fallback execution plan
      return {
        actions: [{
          type: 'create_note',
          description: 'Create note for user request',
          parameters: {
            title: 'New Note',
            content: `Content for: ${state.currentObjective}`
          },
          riskLevel: 'low',
          requiresConfirmation: false,
          priority: 'high',
          dependencies: []
        }],
        executionOrder: 'sequential',
        estimatedDuration: 5000
      };
    }

    const actions: PlannedAction[] = [];
    
    // Plan actions based on required tools
    for (const toolName of taskPlan.requiredTools) {
      const action = await this.planActionForTool(toolName, state, context);
      if (action) {
        actions.push(action);
      }
    }
    
    // Sort actions by priority and dependencies
    const sortedActions = this.sortActionsByPriority(actions);
    
    // Determine execution strategy
    const executionOrder = this.canExecuteConcurrently(sortedActions) ? 'parallel' : 'sequential';
    
    stateManager.addMemoryEntry({
      type: 'plan',
      content: `Planned ${actions.length} actions for execution in ${executionOrder} order`,
      phase: 'execute',
      iteration: state.currentIteration,
      importance: 0.8
    });

    return {
      actions: sortedActions,
      executionOrder,
      estimatedDuration: this.estimateExecutionDuration(sortedActions)
    };
  }

  /**
   * Plan action for a specific tool
   */
  private async planActionForTool(
    toolName: string,
    state: any,
    context: NodeExecutionContext
  ): Promise<PlannedAction | null> {
    const { taskPlan, currentObjective } = state;
    
    switch (toolName) {
      case 'search_notes':
        return {
          type: 'search_notes',
          description: 'Search for relevant notes',
          parameters: {
            query: this.extractSearchQuery(currentObjective),
            limit: 10
          },
          riskLevel: 'low',
          requiresConfirmation: false,
          priority: 'high',
          dependencies: []
        };

      case 'create_note':
        return {
          type: 'create_note',
          description: 'Create new note',
          parameters: {
            title: this.generateNoteTitle(currentObjective),
            content: this.generateInitialContent(currentObjective, taskPlan),
            folder: this.determineNoteLocation(state)
          },
          riskLevel: 'low',
          requiresConfirmation: false,
          priority: 'medium',
          dependencies: taskPlan.requiredTools.includes('search_notes') ? ['search_notes'] : []
        };

      case 'read_note':
        return {
          type: 'read_note',
          description: 'Read existing note',
          parameters: {
            path: this.determineNoteToRead(state)
          },
          riskLevel: 'low',
          requiresConfirmation: false,
          priority: 'high',
          dependencies: []
        };

      case 'update_note':
        return {
          type: 'update_note',
          description: 'Update existing note',
          parameters: {
            path: this.determineNoteToUpdate(state),
            content: this.generateUpdateContent(currentObjective, state)
          },
          riskLevel: 'medium',
          requiresConfirmation: true,
          priority: 'medium',
          dependencies: ['read_note']
        };

      default:
        return null;
    }
  }

  /**
   * Execute actions according to plan
   */
  private async executeActions(
    executionPlan: ExecutionPlan,
    context: NodeExecutionContext
  ): Promise<ExecutionResults> {
    const { state, stateManager } = context;
    const results: ExecutionResults = {
      totalActions: executionPlan.actions.length,
      successfulActions: [],
      failedActions: [],
      executionTime: 0,
      errors: []
    };

    const startTime = Date.now();

    if (executionPlan.executionOrder === 'parallel' && 
        executionPlan.actions.length <= this.executeConfig.maxConcurrentActions!) {
      // Execute actions in parallel
      await this.executeActionsParallel(executionPlan.actions, results, context);
    } else {
      // Execute actions sequentially
      await this.executeActionsSequential(executionPlan.actions, results, context);
    }

    results.executionTime = Date.now() - startTime;
    
    return results;
  }

  /**
   * Execute actions sequentially
   */
  private async executeActionsSequential(
    actions: PlannedAction[],
    results: ExecutionResults,
    context: NodeExecutionContext
  ): Promise<void> {
    const { state, stateManager } = context;

    for (const action of actions) {
      try {
        // Check dependencies
        if (!this.checkDependencies(action, results.successfulActions)) {
          results.failedActions.push({
            action,
            error: 'Dependencies not met',
            executionTime: 0
          });
          continue;
        }

        // Add action memory entry
        stateManager.addMemoryEntry({
          type: 'action',
          content: `Executing: ${action.description}`,
          phase: 'execute',
          iteration: state.currentIteration,
          importance: 0.7
        });

        // Execute action
        const actionResult = await this.executeAction(action, context);
        
        if (actionResult.success) {
          results.successfulActions.push({
            action,
            result: actionResult,
            executionTime: 1000 // Mock execution time
          });
        } else {
          results.failedActions.push({
            action,
            error: actionResult.error || actionResult.message,
            executionTime: 1000
          });
          
          // Add failure memory
          stateManager.addMemoryEntry({
            type: 'observation',
            content: `Action failed: ${action.description} - ${actionResult.error || actionResult.message}`,
            phase: 'execute',
            iteration: state.currentIteration,
            importance: 0.9
          });
        }

      } catch (error) {
        results.failedActions.push({
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0
        });
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Execute actions in parallel
   */
  private async executeActionsParallel(
    actions: PlannedAction[],
    results: ExecutionResults,
    context: NodeExecutionContext
  ): Promise<void> {
    const promises = actions.map(action => this.executeActionSafe(action, context));
    const actionResults = await Promise.allSettled(promises);

    actionResults.forEach((result, index) => {
      const action = actions[index];
      
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.successfulActions.push({
            action,
            result: result.value,
            executionTime: 1000
          });
        } else {
          results.failedActions.push({
            action,
            error: result.value.error || result.value.message,
            executionTime: 1000
          });
        }
      } else {
        results.failedActions.push({
          action,
          error: result.reason,
          executionTime: 0
        });
        results.errors.push(result.reason);
      }
    });
  }

  /**
   * Execute single action safely
   */
  private async executeActionSafe(
    action: PlannedAction,
    context: NodeExecutionContext
  ): Promise<ToolResult> {
    try {
      return await this.executeAction(action, context);
    } catch (error) {
      return {
        success: false,
        message: 'Action execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a single action using actual tools
   */
  private async executeAction(action: PlannedAction, context: NodeExecutionContext): Promise<ToolResult> {
    // This is just a placeholder - the actual tool execution should be handled by AgentOrchestrator
    // For now, return a result indicating the action needs to be executed
    return {
      success: false,
      message: `Action ${action.type} needs to be executed by AgentOrchestrator`,
      data: {
        action: action.type,
        parameters: action.parameters,
        needsExecution: true
      }
    };
  }

  /**
   * Evaluate execution results
   */
  private async evaluateExecution(
    results: ExecutionResults,
    state: any,
    context: NodeExecutionContext
  ): Promise<ExecutionEvaluation> {
    const successRate = results.successfulActions.length / results.totalActions;
    const overallSuccess = successRate >= 0.7; // 70% success threshold
    
    // Check if objectives were met
    const objectivesMet = this.checkObjectivesMet(results, state);
    
    // Determine if we should continue
    const shouldContinue = !overallSuccess || !objectivesMet;
    
    // Generate recommendations
    const recommendations = this.generateExecutionRecommendations(results, state);
    
    return {
      overallSuccess,
      successRate,
      objectivesMet,
      shouldContinue,
      recommendations,
      needsRetry: results.failedActions.length > 0 && this.executeConfig.autoRetryFailures!,
      completionConfidence: overallSuccess && objectivesMet ? 0.9 : 0.4
    };
  }

  /**
   * Helper methods for action planning
   */
  private extractSearchQuery(objective: string): string {
    return objective.split(' ').slice(0, 5).join(' ');
  }

  private generateNoteTitle(objective: string): string {
    return objective.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);
  }

  private generateInitialContent(objective: string, taskPlan: any): string {
    return `# ${this.generateNoteTitle(objective)}\n\nContent for: ${objective}\n\nCreated as part of task: ${taskPlan?.originalRequest || 'Unknown task'}`;
  }

  private determineNoteLocation(state: any): string {
    return state.vaultContext?.activeFiles?.[0] || '';
  }

  private determineNoteToRead(state: any): string {
    return state.vaultContext?.activeFiles?.[0] || 'README.md';
  }

  private determineNoteToUpdate(state: any): string {
    return state.vaultContext?.activeFiles?.[0] || 'README.md';
  }

  private generateUpdateContent(objective: string, state: any): string {
    return `Updated content for: ${objective}`;
  }

  private sortActionsByPriority(actions: PlannedAction[]): PlannedAction[] {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return actions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private canExecuteConcurrently(actions: PlannedAction[]): boolean {
    return actions.every(action => action.dependencies.length === 0);
  }

  private estimateExecutionDuration(actions: PlannedAction[]): number {
    return actions.length * 2000; // 2 seconds per action estimate
  }

  private checkDependencies(action: PlannedAction, completedActions: any[]): boolean {
    return action.dependencies.every(dep => 
      completedActions.some(completed => completed.action.type === dep)
    );
  }

  private checkObjectivesMet(results: ExecutionResults, state: any): boolean {
    // Simple check - if we have successful actions, objectives are likely met
    return results.successfulActions.length > 0;
  }

  private generateExecutionRecommendations(results: ExecutionResults, state: any): string[] {
    const recommendations: string[] = [];
    
    if (results.failedActions.length > 0) {
      recommendations.push(`Retry ${results.failedActions.length} failed actions`);
    }
    
    if (results.successfulActions.length > 0) {
      recommendations.push(`Review and optimize ${results.successfulActions.length} successful actions`);
    }
    
    return recommendations;
  }

  private updateStateWithResults(
    results: ExecutionResults,
    evaluation: ExecutionEvaluation,
    state: any,
    stateManager: any
  ): void {
    // Update metrics
    state.executionMetrics.toolsExecuted += results.totalActions;
    state.executionMetrics.errorsEncountered += results.failedActions.length;
    
    // Update confidence
    state.confidence = evaluation.completionConfidence;
  }

  private determineNextNodes(
    evaluation: ExecutionEvaluation,
    results: ExecutionResults,
    state: any
  ): string[] {
    if (evaluation.needsRetry) {
      return ['execute_node']; // Retry execution
    } else if (evaluation.overallSuccess && evaluation.objectivesMet) {
      return ['reflect_node']; // Move to reflection
    } else {
      return ['analyze_node']; // Re-analyze the task
    }
  }
}

// Type definitions for execution functionality

interface PlannedAction extends ObsidianAction {
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
}

interface ExecutionPlan {
  actions: PlannedAction[];
  executionOrder: 'sequential' | 'parallel';
  estimatedDuration: number;
}

interface ActionResult {
  action: PlannedAction;
  result?: ToolResult;
  error?: string;
  executionTime: number;
}

interface ExecutionResults {
  totalActions: number;
  successfulActions: ActionResult[];
  failedActions: ActionResult[];
  executionTime: number;
  errors: string[];
}

interface ExecutionEvaluation {
  overallSuccess: boolean;
  successRate: number;
  objectivesMet: boolean;
  shouldContinue: boolean;
  recommendations: string[];
  needsRetry: boolean;
  completionConfidence: number;
}