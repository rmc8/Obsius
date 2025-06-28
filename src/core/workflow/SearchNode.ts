/**
 * Search Node - Information gathering and context building
 * Searches existing vault content to build context for task execution
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './BaseNode';
import { WorkflowPhase } from '../WorkflowState';
import { ObsidianAction, ToolResult } from '../../utils/types';

export interface SearchNodeConfig {
  id: string;
  name: string;
  maxSearchResults?: number;
  searchDepth?: 'shallow' | 'medium' | 'deep';
  enableSemanticSearch?: boolean;
  includeContent?: boolean;
}

/**
 * Node responsible for searching and gathering contextual information
 */
export class SearchNode extends BaseNode {
  private searchConfig: SearchNodeConfig;

  constructor(config: SearchNodeConfig) {
    super({
      ...config,
      phase: 'search' as WorkflowPhase,
      timeout: 20000 // Search operations can take time
    });
    
    this.searchConfig = {
      maxSearchResults: 10,
      searchDepth: 'medium',
      enableSemanticSearch: false,
      includeContent: true,
      ...config
    };
  }

  protected async executeInternal(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const { state, stateManager } = context;
    
    try {
      // Add thinking memory entry
      stateManager.addMemoryEntry({
        type: 'thought',
        content: `Starting search phase for: "${state.currentObjective}"`,
        phase: 'search',
        iteration: state.currentIteration,
        importance: 0.8
      });

      // Determine search strategies based on task plan
      const searchStrategies = this.planSearchStrategies(state, context);
      
      // Execute searches
      const searchResults = await this.executeSearches(searchStrategies, context);
      
      // Analyze and contextualize results
      const contextualInfo = await this.analyzeSearchResults(searchResults, context);
      
      // Update state with search findings
      this.updateStateWithFindings(contextualInfo, state, stateManager);
      
      // Determine next steps based on findings
      const nextNodes = this.determineNextNodes(contextualInfo, state);

      // Add search completion memory
      stateManager.addMemoryEntry({
        type: 'observation',
        content: `Search completed. Found ${searchResults.totalResults} relevant items across ${searchResults.searches.length} search strategies.`,
        phase: 'search',
        iteration: state.currentIteration,
        importance: 0.9
      });

      return {
        success: true,
        message: `Search completed with ${searchResults.totalResults} results`,
        data: {
          searchResults,
          contextualInfo,
          searchStrategies
        },
        nextNodes,
        shouldContinue: true,
        executionTime: 0
      };

    } catch (error) {
      stateManager.addMemoryEntry({
        type: 'observation',
        content: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        phase: 'search',
        iteration: state.currentIteration,
        importance: 1.0
      });

      return {
        success: false,
        message: 'Search operation failed',
        error: error instanceof Error ? error.message : 'Unknown search error',
        shouldContinue: true, // Can continue without search results
        executionTime: 0
      };
    }
  }

  /**
   * Plan search strategies based on task requirements
   */
  private planSearchStrategies(state: any, context: NodeExecutionContext): SearchStrategy[] {
    const strategies: SearchStrategy[] = [];
    const taskPlan = state.taskPlan;
    
    if (!taskPlan) {
      // Fallback: use current objective
      strategies.push({
        type: 'keyword',
        query: state.currentObjective,
        priority: 'high'
      });
      return strategies;
    }

    // Extract keywords from task plan
    const keywords = this.extractKeywords(taskPlan.originalRequest);
    
    // Primary keyword search
    if (keywords.length > 0) {
      strategies.push({
        type: 'keyword',
        query: keywords.slice(0, 3).join(' '),
        priority: 'high'
      });
    }

    // Content-based searches for creation tasks
    if (taskPlan.requiredTools.includes('create_note')) {
      strategies.push({
        type: 'content',
        query: taskPlan.originalRequest,
        priority: 'medium'
      });
    }

    // Tag-based search if organizational
    if (taskPlan.originalRequest.toLowerCase().includes('organize') || 
        taskPlan.originalRequest.toLowerCase().includes('structure')) {
      strategies.push({
        type: 'tag',
        query: '#',
        priority: 'medium'
      });
    }

    // Recent files search for context
    if (this.searchConfig.searchDepth !== 'shallow') {
      strategies.push({
        type: 'recent',
        query: '',
        priority: 'low'
      });
    }

    return strategies;
  }

  /**
   * Execute multiple search strategies
   */
  private async executeSearches(
    strategies: SearchStrategy[], 
    context: NodeExecutionContext
  ): Promise<SearchResults> {
    const results: SearchResults = {
      searches: [],
      totalResults: 0,
      relevantFiles: [],
      keyFindings: []
    };

    for (const strategy of strategies) {
      try {
        const searchResult = await this.executeSearchStrategy(strategy, context);
        results.searches.push(searchResult);
        results.totalResults += searchResult.results.length;
        
        // Collect unique files
        for (const result of searchResult.results) {
          if (!results.relevantFiles.some(f => f.path === result.path)) {
            results.relevantFiles.push(result);
          }
        }

      } catch (error) {
        context.stateManager.addMemoryEntry({
          type: 'observation',
          content: `Search strategy '${strategy.type}' failed: ${error}`,
          phase: 'search',
          iteration: context.state.currentIteration,
          importance: 0.6
        });
      }
    }

    return results;
  }

  /**
   * Execute a single search strategy
   */
  private async executeSearchStrategy(
    strategy: SearchStrategy,
    context: NodeExecutionContext
  ): Promise<StrategyResult> {
    const { state } = context;
    
    // Create search action based on strategy
    const searchAction: ObsidianAction = {
      type: 'search_notes',
      description: `Search using ${strategy.type} strategy`,
      parameters: {
        query: strategy.query,
        limit: this.searchConfig.maxSearchResults
      },
      riskLevel: 'low',
      requiresConfirmation: false
    };

    // Add to executed actions
    state.executedActions.push(searchAction);

    // Add search memory entry
    context.stateManager.addMemoryEntry({
      type: 'action',
      content: `Executing ${strategy.type} search: "${strategy.query}"`,
      phase: 'search',
      iteration: state.currentIteration,
      importance: 0.7
    });

    // Simulate search execution (in real implementation, this would call the tool)
    const mockResults = this.simulateSearchResults(strategy, context);

    const result: StrategyResult = {
      strategy,
      results: mockResults,
      executionTime: 500
    };

    return result;
  }

  /**
   * Simulate search results (replace with actual tool execution)
   */
  private simulateSearchResults(strategy: SearchStrategy, context: NodeExecutionContext): SearchResultItem[] {
    // In real implementation, this would execute the search_notes tool
    // For now, return mock results
    const mockResults: SearchResultItem[] = [];
    
    const resultCount = Math.min(Math.floor(Math.random() * 5) + 2, this.searchConfig.maxSearchResults!);
    
    for (let i = 0; i < resultCount; i++) {
      mockResults.push({
        path: `notes/result_${strategy.type}_${i + 1}.md`,
        title: `${strategy.type} Result ${i + 1}`,
        snippet: `Content snippet related to ${strategy.query}...`,
        relevance: Math.random() * 0.8 + 0.2,
        lastModified: new Date(Date.now() - Math.random() * 86400000 * 30) // Last 30 days
      });
    }
    
    return mockResults.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Analyze search results to extract contextual information
   */
  private async analyzeSearchResults(
    searchResults: SearchResults,
    context: NodeExecutionContext
  ): Promise<ContextualInfo> {
    const { stateManager } = context;
    
    // Analyze patterns in found files
    const filePatterns = this.analyzeFilePatterns(searchResults.relevantFiles);
    
    // Extract key themes and topics
    const themes = this.extractThemes(searchResults.relevantFiles);
    
    // Identify content gaps
    const gaps = this.identifyContentGaps(searchResults, context.state.taskPlan);
    
    // Determine existing structure
    const existingStructure = this.analyzeExistingStructure(searchResults.relevantFiles);
    
    // Add analysis memory entry
    stateManager.addMemoryEntry({
      type: 'reflection',
      content: `Search analysis: Found ${themes.length} themes, identified ${gaps.length} content gaps, discovered ${existingStructure.categories.length} structural categories`,
      phase: 'search',
      iteration: context.state.currentIteration,
      importance: 0.9
    });

    return {
      filePatterns,
      themes,
      gaps,
      existingStructure,
      recommendations: this.generateRecommendations(filePatterns, themes, gaps)
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .slice(0, 10);
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'for', 'with', 'that', 'this', 'from', 'they', 'have', 'will', 'would', 'could', 'should'];
    return stopWords.includes(word);
  }

  /**
   * Analyze file patterns
   */
  private analyzeFilePatterns(files: SearchResultItem[]): FilePatterns {
    const directories = new Map<string, number>();
    const extensions = new Map<string, number>();
    const namingPatterns: string[] = [];

    for (const file of files) {
      const dir = file.path.split('/').slice(0, -1).join('/');
      directories.set(dir, (directories.get(dir) || 0) + 1);
      
      const ext = file.path.split('.').pop() || '';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    }

    return {
      commonDirectories: Array.from(directories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dir, count]) => ({ directory: dir, count })),
      fileTypes: Array.from(extensions.entries())
        .map(([ext, count]) => ({ extension: ext, count })),
      namingPatterns
    };
  }

  /**
   * Extract themes from search results
   */
  private extractThemes(files: SearchResultItem[]): string[] {
    const themes = new Set<string>();
    
    for (const file of files) {
      // Extract themes from titles and snippets
      const words = (file.title + ' ' + file.snippet)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .filter(word => !this.isStopWord(word));
      
      words.forEach(word => themes.add(word));
    }
    
    return Array.from(themes).slice(0, 10);
  }

  /**
   * Identify content gaps
   */
  private identifyContentGaps(searchResults: SearchResults, taskPlan: any): string[] {
    const gaps: string[] = [];
    
    if (!taskPlan) return gaps;
    
    // Check if required topics are covered
    const requestKeywords = this.extractKeywords(taskPlan.originalRequest);
    const foundContent = searchResults.relevantFiles.map(f => f.snippet.toLowerCase()).join(' ');
    
    for (const keyword of requestKeywords) {
      if (!foundContent.includes(keyword)) {
        gaps.push(`Missing content about: ${keyword}`);
      }
    }
    
    return gaps;
  }

  /**
   * Analyze existing structure
   */
  private analyzeExistingStructure(files: SearchResultItem[]): ExistingStructure {
    const categories = new Set<string>();
    const tags = new Set<string>();
    
    for (const file of files) {
      const pathParts = file.path.split('/');
      if (pathParts.length > 1) {
        categories.add(pathParts[0]);
      }
      
      // Extract hashtags from snippets
      const hashTags = file.snippet.match(/#\w+/g) || [];
      hashTags.forEach(tag => tags.add(tag));
    }
    
    return {
      categories: Array.from(categories),
      tags: Array.from(tags),
      hierarchyDepth: Math.max(...files.map(f => f.path.split('/').length))
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    filePatterns: FilePatterns,
    themes: string[],
    gaps: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (gaps.length > 0) {
      recommendations.push(`Create content to fill ${gaps.length} identified gaps`);
    }
    
    if (filePatterns.commonDirectories.length > 0) {
      recommendations.push(`Follow existing organization pattern in ${filePatterns.commonDirectories[0].directory}`);
    }
    
    if (themes.length > 5) {
      recommendations.push(`Consider organizing content by themes: ${themes.slice(0, 3).join(', ')}`);
    }
    
    return recommendations;
  }

  /**
   * Update state with search findings
   */
  private updateStateWithFindings(
    contextualInfo: ContextualInfo,
    state: any,
    stateManager: any
  ): void {
    // Update vault context
    state.vaultContext.activeFiles = contextualInfo.filePatterns.commonDirectories.map(d => d.directory);
    
    // Add contextual recommendations to sub-objectives
    state.subObjectives.push(...contextualInfo.recommendations);
  }

  /**
   * Determine next nodes based on search findings
   */
  private determineNextNodes(contextualInfo: ContextualInfo, state: any): string[] {
    // Always proceed to execute after search
    return ['execute_node'];
  }
}

// Type definitions for search functionality

interface SearchStrategy {
  type: 'keyword' | 'content' | 'tag' | 'recent';
  query: string;
  priority: 'high' | 'medium' | 'low';
}

interface SearchResultItem {
  path: string;
  title: string;
  snippet: string;
  relevance: number;
  lastModified: Date;
}

interface StrategyResult {
  strategy: SearchStrategy;
  results: SearchResultItem[];
  executionTime: number;
}

interface SearchResults {
  searches: StrategyResult[];
  totalResults: number;
  relevantFiles: SearchResultItem[];
  keyFindings: string[];
}

interface FilePatterns {
  commonDirectories: { directory: string; count: number }[];
  fileTypes: { extension: string; count: number }[];
  namingPatterns: string[];
}

interface ExistingStructure {
  categories: string[];
  tags: string[];
  hierarchyDepth: number;
}

interface ContextualInfo {
  filePatterns: FilePatterns;
  themes: string[];
  gaps: string[];
  existingStructure: ExistingStructure;
  recommendations: string[];
}