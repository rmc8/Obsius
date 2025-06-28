/**
 * LangGraph-inspired workflow state management for Obsius
 * Provides structured state tracking for complex AI workflows
 */

import { ChatMessage, ObsidianAction, ToolResult } from '../utils/types';
import { WORKFLOW_CONSTANTS } from '../utils/constants';

/**
 * Workflow execution phases following LangGraph patterns
 */
export type WorkflowPhase = 
  | 'initialize'    // Initial setup and task analysis
  | 'analyze'       // Task decomposition and planning
  | 'search'        // Information gathering and context building
  | 'execute'       // Tool execution and action performance
  | 'reflect'       // Result evaluation and next step planning
  | 'complete'      // Task completion and cleanup
  | 'error';        // Error handling and recovery

/**
 * Node execution status
 */
export type NodeStatus = 
  | 'pending'       // Not yet executed
  | 'running'       // Currently executing
  | 'completed'     // Successfully completed
  | 'failed'        // Execution failed
  | 'skipped';      // Skipped due to conditions

/**
 * Workflow node definition
 */
export interface WorkflowNode {
  id: string;
  name: string;
  phase: WorkflowPhase;
  status: NodeStatus;
  executionTime?: number;
  error?: string;
  result?: any;
  dependencies?: string[];
  conditions?: Record<string, any>;
}

/**
 * Workflow edge for conditional routing
 */
export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: (state: WorkflowState) => boolean;
  weight?: number;
}

/**
 * Task decomposition and planning information
 */
export interface TaskPlan {
  originalRequest: string;
  decomposedTasks: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedComplexity: number;
  requiredTools: string[];
  dependencies: string[];
  successCriteria: string[];
}

/**
 * Working memory entry for context tracking
 */
export interface WorkingMemoryEntry {
  id: string;
  timestamp: Date;
  type: 'thought' | 'action' | 'observation' | 'plan' | 'reflection';
  content: string;
  phase: WorkflowPhase;
  iteration: number;
  importance: number; // 0-1 scale for memory retention
  connections?: string[]; // Related memory entry IDs
}

/**
 * State checkpoint for persistence and recovery
 */
export interface StateCheckpoint {
  id: string;
  timestamp: Date;
  iteration: number;
  phase: WorkflowPhase;
  state: Partial<WorkflowState>;
  reason: string;
}

/**
 * Comprehensive workflow state following LangGraph patterns
 */
export interface WorkflowState {
  // Core identification and metadata
  sessionId: string;
  workflowId: string;
  startTime: Date;
  lastUpdated: Date;
  
  // Iteration and phase tracking
  currentIteration: number;
  maxIterations: number;
  currentPhase: WorkflowPhase;
  phaseHistory: WorkflowPhase[];
  
  // Task and planning information
  originalRequest: string;
  taskPlan?: TaskPlan;
  currentObjective: string;
  subObjectives: string[];
  completedObjectives: string[];
  
  // Conversation and messaging
  messages: ChatMessage[];
  workingMemory: WorkingMemoryEntry[];
  
  // Execution tracking
  executedActions: ObsidianAction[];
  actionResults: ToolResult[];
  pendingActions: ObsidianAction[];
  
  // Node and graph structure
  nodes: Map<string, WorkflowNode>;
  edges: WorkflowEdge[];
  currentNode?: string;
  completedNodes: string[];
  failedNodes: string[];
  
  // State management
  isComplete: boolean;
  isError: boolean;
  errorMessage?: string;
  confidence: number; // 0-1 scale for solution confidence
  
  // Context and environment
  vaultContext: {
    vaultName: string;
    currentFile?: string;
    activeFiles: string[];
    recentChanges: string[];
  };
  
  // Performance and monitoring
  executionMetrics: {
    totalExecutionTime: number;
    tokensUsed: number;
    toolsExecuted: number;
    errorsEncountered: number;
  };
  
  // Persistence and recovery
  checkpoints: StateCheckpoint[];
  lastCheckpoint?: Date;
  
  // Configuration and preferences
  config: {
    maxIterations: number;
    enablePersistence: boolean;
    verboseLogging: boolean;
    autoCheckpoint: boolean;
  };
}

/**
 * Factory for creating initial workflow state
 */
export class WorkflowStateFactory {
  static createInitialState(
    sessionId: string,
    originalRequest: string,
    vaultName: string,
    config?: Partial<WorkflowState['config']>
  ): WorkflowState {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    return {
      sessionId,
      workflowId,
      startTime: now,
      lastUpdated: now,
      
      currentIteration: 0,
      maxIterations: config?.maxIterations || WORKFLOW_CONSTANTS.MAX_ITERATIONS,
      currentPhase: 'initialize',
      phaseHistory: ['initialize'],
      
      originalRequest,
      currentObjective: originalRequest,
      subObjectives: [],
      completedObjectives: [],
      
      messages: [],
      workingMemory: [],
      
      executedActions: [],
      actionResults: [],
      pendingActions: [],
      
      nodes: new Map(),
      edges: [],
      completedNodes: [],
      failedNodes: [],
      
      isComplete: false,
      isError: false,
      confidence: 0.0,
      
      vaultContext: {
        vaultName,
        activeFiles: [],
        recentChanges: []
      },
      
      executionMetrics: {
        totalExecutionTime: 0,
        tokensUsed: 0,
        toolsExecuted: 0,
        errorsEncountered: 0
      },
      
      checkpoints: [],
      
      config: {
        maxIterations: WORKFLOW_CONSTANTS.MAX_ITERATIONS,
        enablePersistence: true,
        verboseLogging: false,
        autoCheckpoint: true,
        ...config
      }
    };
  }
}

/**
 * State management utilities
 */
export class WorkflowStateManager {
  private state: WorkflowState;
  
  constructor(state: WorkflowState) {
    this.state = state;
  }
  
  /**
   * Advance to next iteration
   */
  nextIteration(): boolean {
    if (this.state.currentIteration >= this.state.maxIterations) {
      return false;
    }
    
    this.state.currentIteration++;
    this.state.lastUpdated = new Date();
    return true;
  }
  
  /**
   * Transition to new phase
   */
  transitionToPhase(phase: WorkflowPhase): void {
    this.state.currentPhase = phase;
    this.state.phaseHistory.push(phase);
    this.state.lastUpdated = new Date();
  }
  
  /**
   * Add working memory entry
   */
  addMemoryEntry(entry: Omit<WorkingMemoryEntry, 'id' | 'timestamp'>): void {
    const memoryEntry: WorkingMemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      ...entry
    };
    
    this.state.workingMemory.push(memoryEntry);
    
    // Limit memory size
    if (this.state.workingMemory.length > WORKFLOW_CONSTANTS.MAX_WORKING_MEMORY_ENTRIES) {
      // Remove oldest, least important entries
      this.state.workingMemory.sort((a, b) => 
        (b.importance * (new Date().getTime() - a.timestamp.getTime())) - 
        (a.importance * (new Date().getTime() - b.timestamp.getTime()))
      );
      this.state.workingMemory = this.state.workingMemory.slice(0, WORKFLOW_CONSTANTS.MAX_WORKING_MEMORY_ENTRIES);
    }
  }
  
  /**
   * Create state checkpoint
   */
  createCheckpoint(reason: string): StateCheckpoint {
    const checkpoint: StateCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      iteration: this.state.currentIteration,
      phase: this.state.currentPhase,
      state: JSON.parse(JSON.stringify(this.state)), // Deep copy
      reason
    };
    
    this.state.checkpoints.push(checkpoint);
    this.state.lastCheckpoint = checkpoint.timestamp;
    
    return checkpoint;
  }
  
  /**
   * Get memory entries by type and phase
   */
  getMemoryEntries(
    type?: WorkingMemoryEntry['type'],
    phase?: WorkflowPhase,
    limit?: number
  ): WorkingMemoryEntry[] {
    let entries = this.state.workingMemory;
    
    if (type) {
      entries = entries.filter(entry => entry.type === type);
    }
    
    if (phase) {
      entries = entries.filter(entry => entry.phase === phase);
    }
    
    // Sort by importance and recency
    entries.sort((a, b) => {
      const scoreA = a.importance + (1 / (Date.now() - a.timestamp.getTime()));
      const scoreB = b.importance + (1 / (Date.now() - b.timestamp.getTime()));
      return scoreB - scoreA;
    });
    
    if (limit) {
      entries = entries.slice(0, limit);
    }
    
    return entries;
  }
  
  /**
   * Update execution metrics
   */
  updateMetrics(delta: Partial<WorkflowState['executionMetrics']>): void {
    Object.assign(this.state.executionMetrics, delta);
    this.state.lastUpdated = new Date();
  }
  
  /**
   * Mark workflow as complete
   */
  markComplete(confidence: number = 1.0): void {
    this.state.isComplete = true;
    this.state.confidence = confidence;
    this.state.currentPhase = 'complete';
    this.state.lastUpdated = new Date();
  }
  
  /**
   * Mark workflow as error
   */
  markError(errorMessage: string): void {
    this.state.isError = true;
    this.state.errorMessage = errorMessage;
    this.state.currentPhase = 'error';
    this.state.lastUpdated = new Date();
    this.state.executionMetrics.errorsEncountered++;
  }
  
  /**
   * Get current state (read-only)
   */
  getState(): Readonly<WorkflowState> {
    return this.state;
  }
  
  /**
   * Serialize state for persistence
   */
  serialize(): string {
    // Convert Maps to objects for JSON serialization
    const serializable = {
      ...this.state,
      nodes: Object.fromEntries(this.state.nodes),
    };
    
    return JSON.stringify(serializable, null, 2);
  }
  
  /**
   * Deserialize state from persistence
   */
  static deserialize(data: string): WorkflowState {
    const parsed = JSON.parse(data);
    
    // Convert objects back to Maps
    const state: WorkflowState = {
      ...parsed,
      nodes: new Map(Object.entries(parsed.nodes)),
      startTime: new Date(parsed.startTime),
      lastUpdated: new Date(parsed.lastUpdated),
      workingMemory: parsed.workingMemory.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      })),
      checkpoints: parsed.checkpoints.map((cp: any) => ({
        ...cp,
        timestamp: new Date(cp.timestamp)
      }))
    };
    
    return state;
  }
}