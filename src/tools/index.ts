/**
 * Main tools module exports
 * Central export point for all Obsius tools
 */

// Core tool system
export { BaseTool } from './BaseTool';
export { ToolRegistry } from './ToolRegistry';
export type { ToolConstructor, ToolMetadata, ToolExecutionOptions } from './ToolRegistry';

// MCP (Model Context Protocol) system
export { MCPClient, DiscoveredMCPTool } from '../core/mcp';
export type { MCPServerConfig, MCPToolParams } from '../utils/types';
export { MCPServerStatus, MCPDiscoveryState } from '../utils/types';

// Obsidian tools
export {
  CreateNoteTool,
  ReadNoteTool,
  SearchNotesTool,
  UpdateNoteTool,
  GlobTool,
  ListDirectoryTool,
  GrepTool,
  ShellTool,
  WebFetchTool,
  ReadManyFilesTool,
  EditTool,
  OpenNoteTool
} from './obsidian';

// Re-export types
export type {
  CreateNoteParams,
  ReadNoteParams,
  SearchNotesParams,
  UpdateNoteParams,
  GlobParams,
  ListDirectoryParams,
  GrepParams,
  ShellParams,
  WebFetchParams,
  ReadManyFilesParams,
  EditParams,
  OpenNoteParams,
  FileEntry,
  GrepMatch,
  SearchResult,
  SearchMatch
} from '../utils/types';