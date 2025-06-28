/**
 * DiscoveredMCPTool for Obsius - MCP Tool Wrapper
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This tool wraps external MCP tools and provides secure execution.
 */

import { BaseTool } from '../../tools/BaseTool';
import { ToolResult, MCPToolParams, ExecutionContext } from '../../utils/types';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Notice, Modal, App } from 'obsidian';

/**
 * DiscoveredMCPTool - Wrapper for external MCP tools
 * 
 * Features:
 * - Secure execution with confirmation dialogs
 * - Server and tool-level trust management
 * - Result processing for LLM and user display
 * - Connection state management
 * - Error handling and timeout control
 */
export class DiscoveredMCPTool extends BaseTool<MCPToolParams> {
  private static readonly allowlist: Set<string> = new Set();

  constructor(
    app: App,
    context: ExecutionContext,
    private readonly mcpClient?: Client,
    readonly serverName?: string,
    readonly toolName?: string,
    readonly toolDescription?: string,
    private readonly jsonSchema?: Record<string, unknown>,
    readonly serverToolName?: string,
    readonly timeout?: number,
    readonly trust?: boolean
  ) {
    super(app, context);
  }

  // Alternative constructor for direct instantiation
  static create(
    mcpClient: Client,
    serverName: string,
    toolName: string,
    toolDescription: string,
    jsonSchema: Record<string, unknown>,
    serverToolName: string,
    timeout?: number,
    trust?: boolean
  ): typeof DiscoveredMCPTool {
    return class extends DiscoveredMCPTool {
      constructor(app: App, context: ExecutionContext) {
        super(
          app,
          context,
          mcpClient,
          serverName,
          toolName,
          toolDescription,
          jsonSchema,
          serverToolName,
          timeout,
          trust
        );
      }
    };
  }

  get name(): string {
    return this.toolName || 'unknown_mcp_tool';
  }

  get description(): string {
    const desc = this.toolDescription || 'MCP tool';
    const server = this.serverName || 'unknown';
    return `${desc} (${server} MCP Server)`;
  }

  get parameterSchema(): z.ZodSchema<MCPToolParams> {
    // Convert JSON schema to Zod schema (simplified)
    return z.record(z.unknown());
  }

  get riskLevel() {
    return this.trust ? 'low' : 'high' as const;
  }

  /**
   * Check if execution requires user confirmation
   */
  protected async shouldConfirmExecution(params: MCPToolParams): Promise<boolean> {
    if (!this.serverName || !this.serverToolName) {
      return true; // Require confirmation if server info is missing
    }

    const serverAllowListKey = this.serverName;
    const toolAllowListKey = `${this.serverName}.${this.serverToolName}`;

    // Skip confirmation if server is trusted
    if (this.trust) {
      return false;
    }

    // Skip confirmation if already allowlisted
    if (
      DiscoveredMCPTool.allowlist.has(serverAllowListKey) ||
      DiscoveredMCPTool.allowlist.has(toolAllowListKey)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Show confirmation dialog for MCP tool execution
   */
  private async showConfirmationDialog(params: MCPToolParams): Promise<{
    proceed: boolean;
    alwaysAllow: 'server' | 'tool' | 'once';
  }> {
    if (!this.serverName || !this.serverToolName || !this.toolName) {
      // Default to deny if missing info
      return { proceed: false, alwaysAllow: 'once' };
    }

    return new Promise((resolve) => {
      const modal = new MCPConfirmationModal(
        this.app,
        this.serverName!,
        this.serverToolName!,
        this.toolName!,
        params,
        (result) => resolve(result)
      );
      modal.open();
    });
  }

  /**
   * Execute the MCP tool with proper security and error handling
   */
  protected async executeInternal(params: MCPToolParams): Promise<ToolResult> {
    try {
      // Check if confirmation is required
      if (await this.shouldConfirmExecution(params)) {
        const confirmation = await this.showConfirmationDialog(params);
        
        if (!confirmation.proceed) {
          return {
            success: false,
            message: 'Tool execution cancelled by user',
            data: { cancelled: true }
          };
        }

        // Update allowlist based on user choice
        if (this.serverName && this.serverToolName) {
          const serverAllowListKey = this.serverName;
          const toolAllowListKey = `${this.serverName}.${this.serverToolName}`;
          
          if (confirmation.alwaysAllow === 'server') {
            DiscoveredMCPTool.allowlist.add(serverAllowListKey);
          } else if (confirmation.alwaysAllow === 'tool') {
            DiscoveredMCPTool.allowlist.add(toolAllowListKey);
          }
        }
      }

      // Execute the MCP tool
      if (!this.mcpClient || !this.serverToolName) {
        return this.createErrorResult(
          'MCP tool not properly configured',
          new Error('Missing MCP client or tool name')
        );
      }

      const result = await this.mcpClient.callTool({
        name: this.serverToolName,
        arguments: params
      });

      // Process the result
      const processedResult = this.processToolResult(result);
      
      return {
        success: true,
        message: `MCP tool ${this.serverToolName} executed successfully`,
        data: processedResult
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return this.createErrorResult(
        `MCP tool execution failed: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Process MCP tool result for display
   */
  private processToolResult(result: any): any {
    if (!result) {
      return { content: '(empty result)' };
    }

    // Handle different result types
    if (result.content) {
      if (Array.isArray(result.content)) {
        // Check if all parts are text
        const allTextParts = result.content.every(
          (part: any) => part.text !== undefined
        );
        
        if (allTextParts) {
          return {
            type: 'text',
            content: result.content.map((part: any) => part.text).join('')
          };
        }
        
        // Mixed content types
        return {
          type: 'mixed',
          content: result.content
        };
      }
      
      return {
        type: 'structured',
        content: result.content
      };
    }

    // Return the raw result if structure is unexpected
    return {
      type: 'raw',
      content: result
    };
  }

  /**
   * Get formatted result for display
   */
  private getStringifiedResultForDisplay(result: any): string {
    if (!result || result.length === 0) {
      return '```json\n[]\n```';
    }

    if (typeof result === 'string') {
      return result;
    }

    return '```json\n' + JSON.stringify(result, null, 2) + '\n```';
  }
}

/**
 * Confirmation modal for MCP tool execution
 */
class MCPConfirmationModal extends Modal {
  constructor(
    app: App,
    private serverName: string,
    private toolName: string,
    private displayName: string,
    private params: MCPToolParams,
    private onResult: (result: {
      proceed: boolean;
      alwaysAllow: 'server' | 'tool' | 'once';
    }) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Title
    contentEl.createEl('h2', { text: 'Confirm MCP Tool Execution' });

    // Server info
    contentEl.createEl('p', { 
      text: `Server: ${this.serverName}` 
    });

    // Tool info
    contentEl.createEl('p', { 
      text: `Tool: ${this.toolName} (${this.displayName})` 
    });

    // Parameters (if any)
    if (Object.keys(this.params).length > 0) {
      contentEl.createEl('h3', { text: 'Parameters:' });
      const paramEl = contentEl.createEl('pre');
      paramEl.textContent = JSON.stringify(this.params, null, 2);
      paramEl.style.backgroundColor = 'var(--background-secondary)';
      paramEl.style.padding = '10px';
      paramEl.style.borderRadius = '5px';
      paramEl.style.fontSize = '12px';
      paramEl.style.maxHeight = '200px';
      paramEl.style.overflow = 'auto';
    }

    // Warning
    const warningEl = contentEl.createEl('div');
    warningEl.style.backgroundColor = 'var(--background-modifier-error)';
    warningEl.style.padding = '10px';
    warningEl.style.borderRadius = '5px';
    warningEl.style.marginTop = '15px';
    warningEl.style.marginBottom = '15px';
    warningEl.createEl('strong', { text: 'Warning: ' });
    warningEl.appendText('This will execute an external tool. Only proceed if you trust this server and understand what this tool does.');

    // Buttons container
    const buttonContainer = contentEl.createEl('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.style.backgroundColor = 'var(--interactive-accent)';
    cancelBtn.style.color = 'white';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.borderRadius = '5px';
    cancelBtn.style.border = 'none';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => {
      this.onResult({ proceed: false, alwaysAllow: 'once' });
      this.close();
    };

    // Action buttons container
    const actionContainer = buttonContainer.createEl('div');
    actionContainer.style.display = 'flex';
    actionContainer.style.gap = '10px';

    // Proceed once button
    const proceedOnceBtn = actionContainer.createEl('button', { text: 'Proceed Once' });
    proceedOnceBtn.style.backgroundColor = 'var(--interactive-accent)';
    proceedOnceBtn.style.color = 'white';
    proceedOnceBtn.style.padding = '8px 16px';
    proceedOnceBtn.style.borderRadius = '5px';
    proceedOnceBtn.style.border = 'none';
    proceedOnceBtn.style.cursor = 'pointer';
    proceedOnceBtn.onclick = () => {
      this.onResult({ proceed: true, alwaysAllow: 'once' });
      this.close();
    };

    // Always allow tool button
    const allowToolBtn = actionContainer.createEl('button', { text: 'Always Allow Tool' });
    allowToolBtn.style.backgroundColor = 'var(--interactive-accent)';
    allowToolBtn.style.color = 'white';
    allowToolBtn.style.padding = '8px 16px';
    allowToolBtn.style.borderRadius = '5px';
    allowToolBtn.style.border = 'none';
    allowToolBtn.style.cursor = 'pointer';
    allowToolBtn.onclick = () => {
      this.onResult({ proceed: true, alwaysAllow: 'tool' });
      this.close();
    };

    // Always allow server button
    const allowServerBtn = actionContainer.createEl('button', { text: 'Always Allow Server' });
    allowServerBtn.style.backgroundColor = 'var(--interactive-accent)';
    allowServerBtn.style.color = 'white';
    allowServerBtn.style.padding = '8px 16px';
    allowServerBtn.style.borderRadius = '5px';
    allowServerBtn.style.border = 'none';
    allowServerBtn.style.cursor = 'pointer';
    allowServerBtn.onclick = () => {
      this.onResult({ proceed: true, alwaysAllow: 'server' });
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}