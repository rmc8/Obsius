/**
 * MCPClient for Obsius - Model Context Protocol Integration
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This module handles MCP server discovery, connection, and tool registration.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parse } from 'shell-quote';
import { 
  MCPServerConfig, 
  MCPServerStatus, 
  MCPDiscoveryState,
  ToolResult 
} from '../../utils/types';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { DiscoveredMCPTool } from './DiscoveredMCPTool';
import { Notice } from 'obsidian';

export const MCP_DEFAULT_TIMEOUT_MSEC = 10 * 60 * 1000; // 10 minutes

/**
 * Event listener type for MCP server status changes
 */
type StatusChangeListener = (
  serverName: string,
  status: MCPServerStatus,
) => void;

/**
 * MCPClient - Manages MCP server connections and tool discovery
 * 
 * Features:
 * - Multi-transport support (Stdio, SSE, HTTP)
 * - Automatic tool discovery and registration
 * - Connection status tracking
 * - Error handling and cleanup
 * - Obsidian integration with notifications
 */
export class MCPClient {
  private mcpServerStatuses: Map<string, MCPServerStatus> = new Map();
  private mcpDiscoveryState: MCPDiscoveryState = MCPDiscoveryState.NOT_STARTED;
  private statusChangeListeners: StatusChangeListener[] = [];

  constructor(
    private toolRegistry: ToolRegistry
  ) {}

  /**
   * Add a listener for MCP server status changes
   */
  addStatusChangeListener(listener: StatusChangeListener): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Remove a listener for MCP server status changes
   */
  removeStatusChangeListener(listener: StatusChangeListener): void {
    const index = this.statusChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.statusChangeListeners.splice(index, 1);
    }
  }

  /**
   * Update the status of an MCP server and notify listeners
   */
  private updateMCPServerStatus(
    serverName: string,
    status: MCPServerStatus,
  ): void {
    this.mcpServerStatuses.set(serverName, status);
    
    // Notify all listeners
    for (const listener of this.statusChangeListeners) {
      try {
        listener(serverName, status);
      } catch (error) {
        console.error('Error in MCP status change listener:', error);
      }
    }
  }

  /**
   * Get the current status of an MCP server
   */
  getMCPServerStatus(serverName: string): MCPServerStatus {
    return this.mcpServerStatuses.get(serverName) || MCPServerStatus.DISCONNECTED;
  }

  /**
   * Get all MCP server statuses
   */
  getAllMCPServerStatuses(): Map<string, MCPServerStatus> {
    return new Map(this.mcpServerStatuses);
  }

  /**
   * Get the current MCP discovery state
   */
  getMCPDiscoveryState(): MCPDiscoveryState {
    return this.mcpDiscoveryState;
  }

  /**
   * Discover and register tools from MCP servers
   */
  async discoverMcpTools(
    mcpServers: Record<string, MCPServerConfig>,
    mcpServerCommand?: string
  ): Promise<void> {
    // Set discovery state to in progress
    this.mcpDiscoveryState = MCPDiscoveryState.IN_PROGRESS;

    try {
      // Handle single command-line server
      if (mcpServerCommand) {
        const args = parse(mcpServerCommand, process.env) as string[];
        if (args.some((arg) => typeof arg !== 'string')) {
          throw new Error('Failed to parse mcpServerCommand: ' + mcpServerCommand);
        }
        // Use generic server name 'mcp'
        mcpServers['mcp'] = {
          command: args[0],
          args: args.slice(1),
        };
      }

      // Connect to all configured servers
      const discoveryPromises = Object.entries(mcpServers).map(
        ([mcpServerName, mcpServerConfig]) =>
          this.connectAndDiscover(mcpServerName, mcpServerConfig)
      );

      await Promise.all(discoveryPromises);

      // Mark discovery as completed
      this.mcpDiscoveryState = MCPDiscoveryState.COMPLETED;
      
      new Notice('MCP tool discovery completed');
    } catch (error) {
      // Still mark as completed even with errors
      this.mcpDiscoveryState = MCPDiscoveryState.COMPLETED;
      new Notice('MCP tool discovery completed with errors');
      throw error;
    }
  }

  /**
   * Connect to a single MCP server and discover its tools
   */
  private async connectAndDiscover(
    mcpServerName: string,
    mcpServerConfig: MCPServerConfig
  ): Promise<void> {
    // Initialize the server status as connecting
    this.updateMCPServerStatus(mcpServerName, MCPServerStatus.CONNECTING);

    let transport;
    
    // Determine transport type based on configuration
    if (mcpServerConfig.httpUrl) {
      transport = new StreamableHTTPClientTransport(
        new URL(mcpServerConfig.httpUrl)
      );
    } else if (mcpServerConfig.url) {
      transport = new SSEClientTransport(new URL(mcpServerConfig.url));
    } else if (mcpServerConfig.command) {
      transport = new StdioClientTransport({
        command: mcpServerConfig.command,
        args: mcpServerConfig.args || [],
        env: {
          ...process.env,
          ...(mcpServerConfig.env || {}),
        } as Record<string, string>,
        cwd: mcpServerConfig.cwd,
        stderr: 'pipe',
      });
    } else {
      console.error(
        `MCP server '${mcpServerName}' has invalid configuration: missing httpUrl, url, and command. Skipping.`
      );
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.DISCONNECTED);
      return;
    }

    // Create MCP client
    const mcpClient = new Client({
      name: 'obsius-mcp-client',
      version: '0.1.0',
    });

    // Patch Client.callTool to use request timeout
    if ('callTool' in mcpClient) {
      const origCallTool = mcpClient.callTool.bind(mcpClient);
      mcpClient.callTool = function (params, resultSchema, options) {
        return origCallTool(params, resultSchema, {
          ...options,
          timeout: mcpServerConfig.timeout ?? MCP_DEFAULT_TIMEOUT_MSEC,
        });
      };
    }

    try {
      // Connect to the MCP server
      await mcpClient.connect(transport, {
        timeout: mcpServerConfig.timeout ?? MCP_DEFAULT_TIMEOUT_MSEC,
      });
      
      // Connection successful
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.CONNECTED);
      console.log(`Connected to MCP server: ${mcpServerName}`);
    } catch (error) {
      // Create safe config object excluding sensitive information
      const safeConfig = {
        command: mcpServerConfig.command,
        url: mcpServerConfig.url,
        httpUrl: mcpServerConfig.httpUrl,
        cwd: mcpServerConfig.cwd,
        timeout: mcpServerConfig.timeout,
        trust: mcpServerConfig.trust,
      };

      const errorString = 
        `Failed to connect to MCP server '${mcpServerName}' ` +
        `${JSON.stringify(safeConfig)}: ${error}`;
      
      console.error(errorString);
      new Notice(`MCP connection failed: ${mcpServerName}`);
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.DISCONNECTED);
      return;
    }

    // Set up error handler
    mcpClient.onerror = (error) => {
      console.error(`MCP ERROR (${mcpServerName}):`, error.toString());
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.DISCONNECTED);
    };

    // Handle stderr for Stdio transport
    if (transport instanceof StdioClientTransport && transport.stderr) {
      transport.stderr.on('data', (data) => {
        const stderrStr = data.toString();
        // Filter out verbose INFO logs
        if (!stderrStr.includes('] INFO')) {
          console.debug(`MCP STDERR (${mcpServerName}):`, stderrStr);
        }
      });
    }

    try {
      // Discover tools from this server
      await this.discoverToolsFromServer(mcpClient, mcpServerName, mcpServerConfig);
    } catch (error) {
      console.error(
        `Failed to discover tools for MCP server '${mcpServerName}': ${error}`
      );
      
      // Cleanup transport on error
      await this.cleanupTransport(transport);
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.DISCONNECTED);
    }

    // If no tools were registered, close the connection
    // Note: This would require a method to track tools by server in the registry
    // For now, we'll skip this check and keep connections open
    /*
    const serverTools = this.toolRegistry.getToolsByServer?.(mcpServerName) || [];
    if (serverTools.length === 0) {
      console.log(
        `No tools registered from MCP server '${mcpServerName}'. Closing connection.`
      );
      await this.cleanupTransport(transport);
      this.updateMCPServerStatus(mcpServerName, MCPServerStatus.DISCONNECTED);
    }
    */
  }

  /**
   * Discover and register tools from a connected MCP server
   */
  private async discoverToolsFromServer(
    mcpClient: Client,
    mcpServerName: string,
    mcpServerConfig: MCPServerConfig
  ): Promise<void> {
    // Note: This is a simplified version as the full MCP tool discovery
    // requires integration with @google/genai which may not be available
    // in the Obsidian environment. This provides the structure for
    // future implementation.
    
    try {
      // List available tools from the server
      const result = await mcpClient.listTools();
      
      if (!result.tools || !Array.isArray(result.tools)) {
        console.error(
          `MCP server '${mcpServerName}' did not return valid tools. Skipping.`
        );
        return;
      }

      // Register each discovered tool
      for (const tool of result.tools) {
        if (!tool.name) {
          console.warn(
            `Discovered a tool without a name from MCP server '${mcpServerName}'. Skipping.`
          );
          continue;
        }

        let toolNameForModel = tool.name;

        // Replace invalid characters with underscores
        toolNameForModel = toolNameForModel.replace(/[^a-zA-Z0-9_.-]/g, '_');

        // Handle name conflicts
        const existingTool = this.toolRegistry.getTool?.(toolNameForModel);
        if (existingTool) {
          toolNameForModel = mcpServerName + '__' + toolNameForModel;
        }

        // Limit length to 63 characters
        if (toolNameForModel.length > 63) {
          toolNameForModel =
            toolNameForModel.slice(0, 28) + '___' + toolNameForModel.slice(-32);
        }

        // Sanitize parameter schema
        this.sanitizeParameters(tool.inputSchema);

        // Create parameter schema
        const parameterSchema: Record<string, unknown> =
          tool.inputSchema && typeof tool.inputSchema === 'object'
            ? { ...tool.inputSchema }
            : { type: 'object', properties: {} };

        // Create a tool constructor for the discovered tool
        const DiscoveredToolConstructor = DiscoveredMCPTool.create(
          mcpClient,
          mcpServerName,
          toolNameForModel,
          tool.description || '',
          parameterSchema,
          tool.name,
          mcpServerConfig.timeout ?? MCP_DEFAULT_TIMEOUT_MSEC,
          mcpServerConfig.trust
        );

        this.toolRegistry.registerTool(toolNameForModel, DiscoveredToolConstructor, {
          description: tool.description || `MCP tool from ${mcpServerName}`,
          riskLevel: mcpServerConfig.trust ? 'low' : 'high',
          category: 'mcp',
          enabled: true
        });

        console.log(`Registered MCP tool: ${toolNameForModel} from ${mcpServerName}`);
      }
    } catch (error) {
      console.error(`Error discovering tools from ${mcpServerName}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize parameter schema for compatibility
   */
  private sanitizeParameters(schema?: any): void {
    if (!schema) {
      return;
    }
    
    if (schema.anyOf) {
      // Remove default if anyOf is present to avoid conflicts
      schema.default = undefined;
      for (const item of schema.anyOf) {
        this.sanitizeParameters(item);
      }
    }
    
    if (schema.items) {
      this.sanitizeParameters(schema.items);
    }
    
    if (schema.properties) {
      for (const item of Object.values(schema.properties)) {
        this.sanitizeParameters(item);
      }
    }
  }

  /**
   * Clean up transport connections
   */
  private async cleanupTransport(transport: any): Promise<void> {
    try {
      if (
        transport instanceof StdioClientTransport ||
        transport instanceof SSEClientTransport ||
        transport instanceof StreamableHTTPClientTransport
      ) {
        await transport.close();
      }
    } catch (error) {
      console.error('Error cleaning up MCP transport:', error);
    }
  }

  /**
   * Cleanup all MCP connections
   */
  async cleanup(): Promise<void> {
    // Update all server statuses to disconnected
    for (const serverName of this.mcpServerStatuses.keys()) {
      this.updateMCPServerStatus(serverName, MCPServerStatus.DISCONNECTED);
    }
    
    // Clear listeners
    this.statusChangeListeners = [];
    
    console.log('MCP client cleanup completed');
  }
}