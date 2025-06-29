/**
 * Main tools module exports
 * Central export point for all Obsius tools
 */

// Core tool system
export { BaseTool } from './BaseTool';
export { ToolRegistry } from './ToolRegistry';
export type { ToolConstructor, ToolMetadata, ToolExecutionOptions } from './ToolRegistry';

// MCP (Model Context Protocol) system - conditionally loaded
export { 
  createMCPClient, 
  createDiscoveredMCPTool,
  MCPClient, 
  DiscoveredMCPTool 
} from '../core/mcp';
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
  OpenNoteTool,
  ProjectExplorerTool,
  StagedFileAnalysisTool
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
  ProjectExplorerParams,
  StagedFileAnalysisParams,
  FileEntry,
  GrepMatch,
  SearchResult,
  SearchMatch
} from '../utils/types';