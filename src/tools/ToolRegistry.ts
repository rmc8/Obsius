/**
 * Central registry for managing all Obsius tools
 * Handles tool registration, instantiation, and metadata management
 */

import { App } from 'obsidian';
import { BaseTool } from './BaseTool';
import {
  ExecutionContext,
  ToolDefinition,
  RiskLevel,
  ToolResult,
  ToolProgressCallback
} from '../utils/types';

/**
 * Tool constructor interface for dynamic instantiation
 */
export interface ToolConstructor<T extends BaseTool = BaseTool> {
  new (app: App, context: ExecutionContext): T;
}

/**
 * Tool metadata stored in the registry
 */
export interface ToolMetadata {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  category: string;
  enabled: boolean;
  constructor: ToolConstructor;
  dependencies?: string[];
  version?: string;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  progressCallback?: ToolProgressCallback;
  timeout?: number;
  context?: Partial<ExecutionContext>;
}

/**
 * Central registry for all Obsius tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();
  private instances: Map<string, BaseTool> = new Map();
  private app: App;
  private defaultContext: ExecutionContext;

  constructor(app: App, defaultContext: ExecutionContext) {
    this.app = app;
    this.defaultContext = defaultContext;
  }

  /**
   * Register a tool with the registry
   */
  registerTool(
    name: string,
    constructor: ToolConstructor,
    options: {
      description: string;
      riskLevel: RiskLevel;
      category: string;
      enabled?: boolean;
      dependencies?: string[];
      version?: string;
    }
  ): void {
    if (this.tools.has(name)) {
      console.warn(`Tool '${name}' is already registered. Overwriting.`);
    }

    const metadata: ToolMetadata = {
      name,
      description: options.description,
      riskLevel: options.riskLevel,
      category: options.category,
      enabled: options.enabled ?? true,
      constructor,
      dependencies: options.dependencies,
      version: options.version
    };

    this.tools.set(name, metadata);
    
    // Clear any existing instance to force re-instantiation
    this.instances.delete(name);

    console.log(`Registered tool: ${name} (${options.category})`);
  }

  /**
   * Unregister a tool from the registry
   */
  unregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    this.instances.delete(name);
    
    if (removed) {
      console.log(`Unregistered tool: ${name}`);
    }
    
    return removed;
  }

  /**
   * Get tool instance (creates if not exists)
   */
  getTool(name: string, context?: Partial<ExecutionContext>): BaseTool | null {
    const metadata = this.tools.get(name);
    if (!metadata) {
      console.error(`Tool '${name}' not found in registry`);
      return null;
    }

    if (!metadata.enabled) {
      console.warn(`Tool '${name}' is disabled`);
      return null;
    }

    // Check dependencies
    if (metadata.dependencies && !this.checkDependencies(metadata.dependencies)) {
      console.error(`Tool '${name}' dependencies not satisfied`);
      return null;
    }

    // Use existing instance or create new one
    let instance = this.instances.get(name);
    if (!instance) {
      const toolContext = { ...this.defaultContext, ...context };
      instance = new metadata.constructor(this.app, toolContext);
      this.instances.set(name, instance);
    }

    return instance;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    parameters: unknown,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const tool = this.getTool(name, options.context);
    if (!tool) {
      return {
        success: false,
        message: `Tool '${name}' not available`,
        error: 'Tool not found or disabled'
      };
    }

    try {
      // Set up timeout if specified
      if (options.timeout) {
        return await Promise.race([
          tool.execute(parameters, options.progressCallback),
          this.createTimeoutPromise(options.timeout, name)
        ]);
      }

      return await tool.execute(parameters, options.progressCallback);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Tool '${name}' execution failed`,
        error: errorMessage
      };
    }
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get enabled tool names only
   */
  getEnabledToolNames(): string[] {
    return Array.from(this.tools.entries())
      .filter(([, metadata]) => metadata.enabled)
      .map(([name]) => name);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): string[] {
    return Array.from(this.tools.entries())
      .filter(([, metadata]) => metadata.category === category && metadata.enabled)
      .map(([name]) => name);
  }

  /**
   * Get tools by risk level
   */
  getToolsByRiskLevel(riskLevel: RiskLevel): string[] {
    return Array.from(this.tools.entries())
      .filter(([, metadata]) => metadata.riskLevel === riskLevel && metadata.enabled)
      .map(([name]) => name);
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): ToolMetadata | null {
    return this.tools.get(name) || null;
  }

  /**
   * Get all tool metadata
   */
  getAllToolMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(name: string, enabled: boolean): boolean {
    const metadata = this.tools.get(name);
    if (!metadata) {
      return false;
    }

    metadata.enabled = enabled;
    
    // Clear instance if disabling
    if (!enabled) {
      this.instances.delete(name);
    }

    console.log(`Tool '${name}' ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get tool definitions for AI provider integration
   */
  getToolDefinitions(categoryFilter?: string): ToolDefinition[] {
    const enabledTools = Array.from(this.tools.entries())
      .filter(([, metadata]) => {
        if (!metadata.enabled) return false;
        if (categoryFilter && metadata.category !== categoryFilter) return false;
        return true;
      });

    const definitions: ToolDefinition[] = [];

    for (const [name, metadata] of enabledTools) {
      try {
        const instance = this.getTool(name);
        if (instance) {
          definitions.push(instance.getDefinition());
        }
      } catch (error) {
        console.warn(`Failed to get definition for tool '${name}':`, error);
      }
    }

    return definitions;
  }

  /**
   * Validate that all dependencies are available
   */
  private checkDependencies(dependencies: string[]): boolean {
    for (const dep of dependencies) {
      const depMetadata = this.tools.get(dep);
      if (!depMetadata || !depMetadata.enabled) {
        console.error(`Dependency '${dep}' not available`);
        return false;
      }
    }
    return true;
  }

  /**
   * Create a timeout promise for tool execution
   */
  private createTimeoutPromise(timeout: number, toolName: string): Promise<ToolResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool '${toolName}' execution timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<RiskLevel, number>;
  } {
    const stats = {
      total: this.tools.size,
      enabled: 0,
      disabled: 0,
      byCategory: {} as Record<string, number>,
      byRiskLevel: { low: 0, medium: 0, high: 0 } as Record<RiskLevel, number>
    };

    for (const metadata of this.tools.values()) {
      if (metadata.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      // Count by category
      stats.byCategory[metadata.category] = (stats.byCategory[metadata.category] || 0) + 1;

      // Count by risk level
      stats.byRiskLevel[metadata.riskLevel]++;
    }

    return stats;
  }

  /**
   * Clear all tool instances (forces re-instantiation)
   */
  clearInstances(): void {
    this.instances.clear();
    console.log('Cleared all tool instances');
  }

  /**
   * Update the default execution context
   */
  updateDefaultContext(context: Partial<ExecutionContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
    
    // Clear instances to pick up new context
    this.clearInstances();
  }

  /**
   * Get debug information about the registry
   */
  getDebugInfo(): {
    registeredTools: string[];
    enabledTools: string[];
    instantiatedTools: string[];
    stats: ReturnType<typeof this.getStats>;
  } {
    return {
      registeredTools: this.getToolNames(),
      enabledTools: this.getEnabledToolNames(),
      instantiatedTools: Array.from(this.instances.keys()),
      stats: this.getStats()
    };
  }
}