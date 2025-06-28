/**
 * Analyze Node - Task decomposition and planning phase
 * Breaks down complex user requests into manageable subtasks
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './BaseNode';
import { WorkflowPhase, TaskPlan } from '../WorkflowState';

export interface AnalyzeNodeConfig {
  id: string;
  name: string;
  enableTaskDecomposition?: boolean;
  maxSubtasks?: number;
  complexityThreshold?: number;
}

/**
 * Node responsible for analyzing user requests and creating execution plans
 */
export class AnalyzeNode extends BaseNode {
  private analyzeConfig: AnalyzeNodeConfig;

  constructor(config: AnalyzeNodeConfig) {
    super({
      ...config,
      phase: 'analyze' as WorkflowPhase,
      timeout: 15000 // Analysis can take a bit longer
    });
    
    this.analyzeConfig = {
      enableTaskDecomposition: true,
      maxSubtasks: 8,
      complexityThreshold: 3,
      ...config
    };
  }

  protected async executeInternal(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { state, stateManager } = context;
    const originalRequest = state.originalRequest;

    try {
      // Add thinking memory entry
      stateManager.addMemoryEntry({
        type: 'thought',
        content: `Analyzing request: "${originalRequest}"`,
        phase: 'analyze',
        iteration: state.currentIteration,
        importance: 0.8
      });

      // Analyze the complexity and type of the request
      const analysisResult = await this.analyzeRequest(originalRequest, context);
      
      // Create task plan if decomposition is needed
      const taskPlan = await this.createTaskPlan(originalRequest, analysisResult, context);
      
      // Update state with analysis results
      state.taskPlan = taskPlan;
      state.currentObjective = taskPlan.decomposedTasks[0] || originalRequest;
      state.subObjectives = taskPlan.decomposedTasks.slice(1);

      // Determine next nodes based on analysis
      const nextNodes = this.determineNextNodes(analysisResult, taskPlan);
      
      // For very simple tasks, update state to skip unnecessary phases
      if (taskPlan.estimatedComplexity <= 2 && !analysisResult.requiresSearch) {
        state.confidence = 0.8; // Higher initial confidence for simple tasks
      }

      // Add reflection memory entry
      stateManager.addMemoryEntry({
        type: 'reflection',
        content: `Analysis complete. Identified ${taskPlan.decomposedTasks.length} tasks with ${taskPlan.priority} priority. Required tools: ${taskPlan.requiredTools.join(', ')}`,
        phase: 'analyze',
        iteration: state.currentIteration,
        importance: 0.9
      });

      return {
        success: true,
        message: `Analysis completed. Decomposed into ${taskPlan.decomposedTasks.length} subtasks`,
        data: {
          taskPlan,
          analysisResult,
          nextNodes
        },
        nextNodes,
        shouldContinue: true,
        executionTime: 0 // Will be set by base class
      };

    } catch (error) {
      return {
        success: false,
        message: 'Analysis failed',
        error: error instanceof Error ? error.message : 'Unknown analysis error',
        shouldContinue: false,
        executionTime: 0
      };
    }
  }

  /**
   * Analyze the user request to determine complexity and approach
   */
  private async analyzeRequest(request: string, context: NodeExecutionContext): Promise<{
    complexity: number;
    requestType: string;
    keywords: string[];
    requiresSearch: boolean;
    requiresCreation: boolean;
    requiresModification: boolean;
    estimatedSteps: number;
  }> {
    const lowercaseRequest = request.toLowerCase();
    
    // Keyword analysis
    const searchKeywords = ['find', 'search', 'look for', 'locate', 'discover', 'explore'];
    const createKeywords = ['create', 'make', 'write', 'generate', 'build', 'add', 'new'];
    const modifyKeywords = ['update', 'edit', 'change', 'modify', 'fix', 'improve', 'enhance'];
    const organizeKeywords = ['organize', 'structure', 'arrange', 'categorize', 'sort', 'group'];
    
    const requiresSearch = searchKeywords.some(keyword => lowercaseRequest.includes(keyword));
    const requiresCreation = createKeywords.some(keyword => lowercaseRequest.includes(keyword));
    const requiresModification = modifyKeywords.some(keyword => lowercaseRequest.includes(keyword));
    const requiresOrganization = organizeKeywords.some(keyword => lowercaseRequest.includes(keyword));

    // Determine request type
    let requestType = 'general';
    if (requiresCreation) requestType = 'creation';
    else if (requiresModification) requestType = 'modification';
    else if (requiresSearch) requestType = 'search';
    else if (requiresOrganization) requestType = 'organization';

    // Calculate complexity based on multiple factors
    let complexity = 1;
    
    // Length and structure complexity
    if (request.length > 100) complexity += 1;
    if (request.includes(' and ') || request.includes(' then ')) complexity += 1;
    if (request.split(' ').length > 20) complexity += 1;
    
    // Multi-action complexity
    if (requiresSearch && requiresCreation) complexity += 2;
    if (requiresModification && requiresCreation) complexity += 2;
    if (requiresOrganization) complexity += 1;
    
    // Estimate steps needed
    let estimatedSteps = 2; // Default minimum
    if (requiresSearch) estimatedSteps += 2;
    if (requiresCreation) estimatedSteps += 2;
    if (requiresModification) estimatedSteps += 1;
    if (complexity > 3) estimatedSteps += complexity - 3;

    // Extract keywords
    const keywords = request
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'they', 'have', 'will'].includes(word))
      .slice(0, 10);

    return {
      complexity,
      requestType,
      keywords,
      requiresSearch,
      requiresCreation,
      requiresModification,
      estimatedSteps
    };
  }

  /**
   * Create detailed task plan with decomposition
   */
  private async createTaskPlan(
    originalRequest: string,
    analysis: any,
    context: NodeExecutionContext
  ): Promise<TaskPlan> {
    const { state } = context;
    
    let decomposedTasks: string[] = [];
    let requiredTools: string[] = [];
    
    // Decompose based on analysis
    if (this.analyzeConfig.enableTaskDecomposition && analysis.complexity >= this.analyzeConfig.complexityThreshold!) {
      decomposedTasks = await this.decomposeTask(originalRequest, analysis);
    } else {
      decomposedTasks = [originalRequest];
    }

    // Determine required tools based on task analysis
    if (analysis.requiresSearch) {
      requiredTools.push('search_notes');
    }
    if (analysis.requiresCreation) {
      requiredTools.push('create_note');
    }
    if (analysis.requiresModification) {
      requiredTools.push('update_note', 'read_note');
    }

    // Remove duplicates
    requiredTools = [...new Set(requiredTools)];

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (analysis.complexity >= 4) priority = 'high';
    else if (analysis.complexity <= 2) priority = 'low';

    // Create success criteria
    const successCriteria = this.generateSuccessCriteria(originalRequest, analysis);

    // Identify dependencies
    const dependencies = this.identifyDependencies(decomposedTasks, analysis);

    return {
      originalRequest,
      decomposedTasks,
      priority,
      estimatedComplexity: analysis.complexity,
      requiredTools,
      dependencies,
      successCriteria
    };
  }

  /**
   * Decompose complex tasks into manageable subtasks
   */
  private async decomposeTask(originalRequest: string, analysis: any): Promise<string[]> {
    const subtasks: string[] = [];
    
    // Rule-based decomposition based on request patterns
    if (analysis.requiresSearch && analysis.requiresCreation) {
      subtasks.push(`Search for existing content related to: ${analysis.keywords.slice(0, 3).join(', ')}`);
      subtasks.push(`Analyze found content and identify gaps`);
      subtasks.push(`Create new content based on analysis`);
      subtasks.push(`Review and connect to existing knowledge`);
    } else if (analysis.requestType === 'organization') {
      subtasks.push(`Identify all relevant notes to organize`);
      subtasks.push(`Analyze current organization structure`);
      subtasks.push(`Plan new organization approach`);
      subtasks.push(`Execute reorganization`);
      subtasks.push(`Verify and optimize connections`);
    } else if (analysis.requiresCreation) {
      subtasks.push(`Plan content structure and approach`);
      subtasks.push(`Create initial content`);
      subtasks.push(`Review and enhance content`);
      subtasks.push(`Connect to related notes`);
    } else if (analysis.requiresSearch) {
      subtasks.push(`Search for relevant information`);
      subtasks.push(`Analyze and summarize findings`);
      subtasks.push(`Present organized results`);
    } else {
      // Generic decomposition for complex requests
      const words = originalRequest.split(' ');
      if (words.length > 15) {
        const mid = Math.floor(words.length / 2);
        subtasks.push(words.slice(0, mid).join(' '));
        subtasks.push(words.slice(mid).join(' '));
      } else {
        subtasks.push(originalRequest);
      }
    }

    // Limit number of subtasks
    return subtasks.slice(0, this.analyzeConfig.maxSubtasks!);
  }

  /**
   * Generate success criteria for the task
   */
  private generateSuccessCriteria(originalRequest: string, analysis: any): string[] {
    const criteria: string[] = [];
    
    criteria.push('User request is fully addressed');
    
    if (analysis.requiresCreation) {
      criteria.push('New content is created with proper structure');
      criteria.push('Content is connected to relevant existing notes');
    }
    
    if (analysis.requiresSearch) {
      criteria.push('Relevant information is found and presented');
    }
    
    if (analysis.requiresModification) {
      criteria.push('Existing content is properly updated');
      criteria.push('Changes maintain note integrity');
    }
    
    criteria.push('Knowledge graph connections are optimized');
    criteria.push('User receives clear summary of actions taken');
    
    return criteria;
  }

  /**
   * Identify task dependencies
   */
  private identifyDependencies(decomposedTasks: string[], analysis: any): string[] {
    const dependencies: string[] = [];
    
    // If search is required before creation
    if (analysis.requiresSearch && analysis.requiresCreation) {
      dependencies.push('search_before_create');
    }
    
    // If modification requires reading first
    if (analysis.requiresModification) {
      dependencies.push('read_before_modify');
    }
    
    return dependencies;
  }

  /**
   * Determine which nodes should execute next based on analysis
   */
  private determineNextNodes(analysis: any, taskPlan: TaskPlan): string[] {
    const nextNodes: string[] = [];
    
    // Always go to search if search is required
    if (analysis.requiresSearch || taskPlan.requiredTools.includes('search_notes')) {
      nextNodes.push('search_node');
    } else if (analysis.requiresCreation || taskPlan.requiredTools.includes('create_note')) {
      // Skip search and go directly to execute if no search needed
      nextNodes.push('execute_node');
    } else {
      // Default to execution node
      nextNodes.push('execute_node');
    }
    
    return nextNodes;
  }
}