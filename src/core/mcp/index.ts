/**
 * MCP (Model Context Protocol) module exports
 * Provides external tool integration capabilities
 */

export { MCPClient } from './MCPClient';
export { DiscoveredMCPTool } from './DiscoveredMCPTool';

// Re-export types for convenience
export type {
  MCPServerConfig,
  MCPToolParams
} from '../../utils/types';

export {
  MCPServerStatus,
  MCPDiscoveryState
} from '../../utils/types';