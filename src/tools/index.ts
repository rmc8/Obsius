/**
 * Main tools module exports
 * Central export point for all Obsius tools
 */

// Core tool system
export { BaseTool } from './BaseTool';
export { ToolRegistry } from './ToolRegistry';
export type { ToolConstructor, ToolMetadata, ToolExecutionOptions } from './ToolRegistry';

// Obsidian tools
export {
  CreateNoteTool,
  ReadNoteTool,
  SearchNotesTool,
  UpdateNoteTool,
  GlobTool,
  ListDirectoryTool,
  GrepTool,
  ShellTool
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
  FileEntry,
  GrepMatch,
  SearchResult,
  SearchMatch
} from '../utils/types';