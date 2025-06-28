/**
 * MCP (Model Context Protocol) module exports
 * Provides external tool integration capabilities with conditional loading
 */

import { isMCPSupported } from '../../utils/environment';

// Conditional exports for MCP functionality
export const createMCPClient = async () => {
  if (!isMCPSupported()) {
    throw new Error('MCP not supported in browser environment. MCP requires Node.js modules not available in Obsidian.');
  }
  
  try {
    const { MCPClient } = await import('./MCPClient');
    return MCPClient;
  } catch (error) {
    throw new Error(`Failed to load MCP client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createDiscoveredMCPTool = async () => {
  if (!isMCPSupported()) {
    throw new Error('MCP not supported in browser environment. MCP requires Node.js modules not available in Obsidian.');
  }
  
  try {
    const { DiscoveredMCPTool } = await import('./DiscoveredMCPTool');
    return DiscoveredMCPTool;
  } catch (error) {
    throw new Error(`Failed to load MCP tool wrapper: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Legacy exports for backward compatibility (conditionally loaded)
export let MCPClient: any = undefined;
export let DiscoveredMCPTool: any = undefined;

// Initialize legacy exports if MCP is supported
if (isMCPSupported()) {
  try {
    // Note: These will only be loaded in Node.js environments
    import('./MCPClient').then(module => {
      MCPClient = module.MCPClient;
    }).catch(() => {
      console.warn('Failed to load MCPClient in legacy export mode');
    });
    
    import('./DiscoveredMCPTool').then(module => {
      DiscoveredMCPTool = module.DiscoveredMCPTool;
    }).catch(() => {
      console.warn('Failed to load DiscoveredMCPTool in legacy export mode');
    });
  } catch {
    console.warn('MCP legacy exports unavailable in browser environment');
  }
}

// Re-export types for convenience
export type {
  MCPServerConfig,
  MCPToolParams
} from '../../utils/types';

export {
  MCPServerStatus,
  MCPDiscoveryState
} from '../../utils/types';