/**
 * Base workflow node implementation for LangGraph-style processing
 * Provides foundation for all workflow nodes in the Obsius system
 */

import { WorkflowState, WorkflowStateManager, WorkflowPhase, NodeStatus } from '../WorkflowState';
import { WORKFLOW_CONSTANTS } from '../../utils/constants';

/**
 * Node execution context
 */
export interface NodeExecutionContext {
  state: WorkflowState;
  stateManager: WorkflowStateManager;
  startTime: Date;
  timeout: number;
  logger?: (message: string) => void;
}

/**
 * Node execution result
 */
export interface NodeExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  nextNodes?: string[];
  shouldContinue: boolean;
  error?: string;
  executionTime: number;
}

/**
 * Node configuration interface
 */
export interface NodeConfig {
  id: string;
  name: string;
  phase: WorkflowPhase;
  timeout?: number;
  maxRetries?: number;
  dependencies?: string[];
  conditions?: Record<string, any>;
}

/**
 * Abstract base class for all workflow nodes
 */
export abstract class BaseNode {
  protected config: NodeConfig;
  protected status: NodeStatus = 'pending';
  protected lastError?: string;
  protected executionCount = 0;
  protected totalExecutionTime = 0;

  constructor(config: NodeConfig) {
    this.config = {
      timeout: WORKFLOW_CONSTANTS.ITERATION_TIMEOUT_MS,
      maxRetries: 2,
      ...config
    };
  }

  /**
   * Abstract method for node-specific execution logic
   */
  protected abstract executeInternal(context: NodeExecutionContext): Promise<NodeExecutionResult>;

  /**
   * Check if the task is sufficiently complete to stop workflow
   * Can be overridden by specific nodes for custom completion logic
   */
  protected checkTaskCompletion(context: NodeExecutionContext): boolean {
    const { state } = context;
    
    // Check if all sub-objectives are completed
    if (state.subObjectives.length > 0) {
      const completionRate = state.completedObjectives.length / state.subObjectives.length;
      return completionRate >= 0.9; // 90% completion is sufficient
    }
    
    // Check if we have high confidence
    return state.confidence >= 0.85;
  }

  /**
   * Check if node can execute based on dependencies and conditions
   */
  protected canExecute(context: NodeExecutionContext): boolean {
    const state = context.state;

    // Check dependencies
    if (this.config.dependencies) {
      const completedNodes = state.completedNodes;
      for (const dependency of this.config.dependencies) {
        if (!completedNodes.includes(dependency)) {
          return false;
        }
      }
    }

    // Check custom conditions
    if (this.config.conditions) {
      return this.evaluateConditions(this.config.conditions, state);
    }

    return true;
  }

  /**
   * Evaluate custom conditions
   */
  protected evaluateConditions(conditions: Record<string, any>, state: WorkflowState): boolean {
    // Simple condition evaluation - can be extended
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getStateValue(state, key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get value from state using dot notation
   */
  protected getStateValue(state: WorkflowState, path: string): any {
    const keys = path.split('.');
    let value: any = state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Execute the node with timeout, retry logic, and state management
   */
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();
    
    // Check if node can execute
    if (!this.canExecute(context)) {
      this.status = 'skipped';
      return {
        success: true,
        message: `Node ${this.config.name} skipped due to unmet conditions`,
        shouldContinue: true,
        executionTime: 0
      };
    }

    this.status = 'running';
    this.executionCount++;

    // Update node in state
    context.state.nodes.set(this.config.id, {
      id: this.config.id,
      name: this.config.name,
      phase: this.config.phase,
      status: this.status,
      dependencies: this.config.dependencies,
      conditions: this.config.conditions
    });

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<NodeExecutionResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Node execution timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);
      });

      const executionPromise = this.executeInternal(context);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      const executionTime = new Date().getTime() - startTime.getTime();
      this.totalExecutionTime += executionTime;

      if (result.success) {
        this.status = 'completed';
        context.state.completedNodes.push(this.config.id);
        
        // Add success memory entry
        context.stateManager.addMemoryEntry({
          type: 'action',
          content: `Node ${this.config.name} completed successfully: ${result.message}`,
          phase: this.config.phase,
          iteration: context.state.currentIteration,
          importance: 0.7
        });
        
        // Check if task is complete after this node execution
        if (this.checkTaskCompletion(context)) {
          result.shouldContinue = false;
          context.stateManager.markComplete(context.state.confidence || 0.9);
        }
      } else {
        this.status = 'failed';
        this.lastError = result.error || 'Unknown error';
        context.state.failedNodes.push(this.config.id);
        
        // Add failure memory entry
        context.stateManager.addMemoryEntry({
          type: 'observation',
          content: `Node ${this.config.name} failed: ${result.error || result.message}`,
          phase: this.config.phase,
          iteration: context.state.currentIteration,
          importance: 0.9
        });
      }

      // Update node status in state
      const node = context.state.nodes.get(this.config.id);
      if (node) {
        node.status = this.status;
        node.executionTime = executionTime;
        node.error = this.lastError;
        node.result = result.data;
      }

      // Log execution
      if (context.logger) {
        context.logger(`Node ${this.config.name} executed in ${executionTime}ms with status: ${this.status}`);
      }

      return {
        ...result,
        executionTime
      };

    } catch (error) {
      const executionTime = new Date().getTime() - startTime.getTime();
      this.status = 'failed';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      context.state.failedNodes.push(this.config.id);
      
      // Update node status in state
      const node = context.state.nodes.get(this.config.id);
      if (node) {
        node.status = this.status;
        node.executionTime = executionTime;
        node.error = this.lastError;
      }

      // Add error memory entry
      context.stateManager.addMemoryEntry({
        type: 'observation',
        content: `Node ${this.config.name} error: ${this.lastError}`,
        phase: this.config.phase,
        iteration: context.state.currentIteration,
        importance: 1.0
      });

      return {
        success: false,
        message: `Node execution failed: ${this.lastError}`,
        error: this.lastError,
        shouldContinue: false,
        executionTime
      };
    }
  }

  /**
   * Get node configuration
   */
  getConfig(): NodeConfig {
    return { ...this.config };
  }

  /**
   * Get current node status
   */
  getStatus(): NodeStatus {
    return this.status;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    status: NodeStatus;
    lastError?: string;
  } {
    return {
      executionCount: this.executionCount,
      totalExecutionTime: this.totalExecutionTime,
      averageExecutionTime: this.executionCount > 0 ? this.totalExecutionTime / this.executionCount : 0,
      status: this.status,
      lastError: this.lastError
    };
  }

  /**
   * Reset node state for re-execution
   */
  reset(): void {
    this.status = 'pending';
    this.lastError = undefined;
    this.executionCount = 0;
    this.totalExecutionTime = 0;
  }

  /**
   * Check if node should retry on failure
   */
  shouldRetry(): boolean {
    return this.status === 'failed' && 
           this.executionCount < (this.config.maxRetries || 2);
  }

  /**
   * Validate node configuration
   */
  static validateConfig(config: NodeConfig): boolean {
    return !!(config.id && config.name && config.phase);
  }
}