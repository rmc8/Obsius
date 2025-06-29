/**
 * Shared TypeScript types and interfaces for the Obsius plugin
 */

import { App, TFile } from 'obsidian';

// ============================================================================
// Tool System Types
// ============================================================================

/**
 * Standard result format for all tool operations
 */
export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  userCancelled?: boolean;
}

/**
 * Context information available during tool execution
 */
export interface ExecutionContext {
  app: App;
  currentFile?: TFile;
  selection?: string;
  vaultPath: string;
  workspaceState?: WorkspaceState;
}

/**
 * Current workspace state information
 */
export interface WorkspaceState {
  activeFile?: string;
  openTabs: string[];
  selectedText?: string;
  cursorPosition?: {
    line: number;
    column: number;
  };
}

/**
 * Tool parameter validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  message?: string;
}

/**
 * Tool definition for AI provider integration
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: object; // JSON Schema
}

/**
 * Risk levels for tool operations
 */
export type RiskLevel = 'low' | 'medium' | 'high';

// ============================================================================
// Obsidian Tool Parameters
// ============================================================================

/**
 * Parameters for creating a new note
 */
export interface CreateNoteParams {
  title: string;
  content?: string;
  folder?: string;
  tags?: string[];
  template?: string;
  frontmatter?: Record<string, any>;
}

/**
 * Parameters for reading a note
 */
export interface ReadNoteParams {
  path?: string;
  title?: string;
  includeMetadata?: boolean;
}

/**
 * Parameters for searching notes
 */
export interface SearchNotesParams {
  query: string;
  searchType?: 'content' | 'title' | 'tags' | 'all';
  limit?: number;
  folder?: string;
  includeSnippets?: boolean;
}

/**
 * Parameters for updating a note
 */
export interface UpdateNoteParams {
  path?: string;
  title?: string;
  operation: 'replace' | 'append' | 'prepend' | 'insert' | 'section_replace';
  content: string;
  section?: string;
  position?: number;
  backup?: boolean;
}

/**
 * Parameters for the glob tool
 */
export interface GlobParams {
  /**
   * The glob pattern to match files against
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to vault root)
   */
  path?: string;

  /**
   * Whether the search should be case-sensitive (optional, defaults to false)
   */
  case_sensitive?: boolean;

  /**
   * Whether to respect .gitignore patterns (optional, defaults to true)
   */
  respect_git_ignore?: boolean;
}

/**
 * Parameters for the list directory tool
 */
export interface ListDirectoryParams {
  /**
   * The absolute path to the directory to list
   */
  path: string;

  /**
   * Array of glob patterns to ignore (optional)
   */
  ignore?: string[];

  /**
   * Whether to respect .gitignore patterns (optional, defaults to true)
   */
  respect_git_ignore?: boolean;
}

/**
 * File entry returned by list directory tool
 */
export interface FileEntry {
  /**
   * Name of the file or directory
   */
  name: string;

  /**
   * Absolute path to the file or directory
   */
  path: string;

  /**
   * Whether this entry is a directory
   */
  isDirectory: boolean;

  /**
   * Size of the file in bytes (0 for directories)
   */
  size: number;

  /**
   * Last modified timestamp
   */
  modifiedTime: Date;
}

/**
 * Parameters for the grep tool
 */
export interface GrepParams {
  /**
   * The regular expression pattern to search for in file contents
   */
  pattern: string;

  /**
   * The directory to search in (optional, defaults to vault root)
   */
  path?: string;

  /**
   * File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
   */
  include?: string;
}

/**
 * Result object for a single grep match
 */
export interface GrepMatch {
  /**
   * Relative file path from search directory
   */
  filePath: string;

  /**
   * Line number where match was found (1-based)
   */
  lineNumber: number;

  /**
   * Content of the line containing the match
   */
  line: string;
}

/**
 * Parameters for the shell tool
 */
export interface ShellParams {
  /**
   * The shell command to execute
   */
  command: string;

  /**
   * Optional description of what the command does
   */
  description?: string;

  /**
   * Working directory relative to vault root (optional)
   */
  directory?: string;
}

/**
 * Parameters for the web fetch tool
 */
export interface WebFetchParams {
  /**
   * The URL to fetch content from
   */
  url: string;

  /**
   * Optional prompt for processing the fetched content
   */
  prompt?: string;

  /**
   * Request timeout in milliseconds (default: 10000)
   */
  timeout?: number;
}

/**
 * Parameters for the read many files tool
 */
export interface ReadManyFilesParams {
  /**
   * Array of file paths relative to vault root to read
   */
  paths: string[];

  /**
   * Optional limit on characters read per file
   */
  charactersToRead?: number;

  /**
   * Optional total character limit across all files (default: 150,000)
   */
  totalCharacterLimit?: number;
}

/**
 * Parameters for the staged file analysis tool
 */
export interface StagedFileAnalysisParams {
  /**
   * File patterns to analyze (default: all markdown files)
   */
  patterns: string[];
  
  /**
   * Characters to read per file in overview stage (default: 1024)
   */
  overviewCharacterLimit: number;
  
  /**
   * Percentage of files to read completely (default: 25%)
   */
  deepReadingPercentage: number;
  
  /**
   * Maximum total characters to read across all stages (default: 500,000)
   */
  maxTotalCharacters: number;
  
  /**
   * Analysis mode: comprehensive, focused, or technical
   */
  analysisMode: 'comprehensive' | 'focused' | 'technical';
  
  /**
   * File patterns to always include in deep reading
   */
  forceIncludePatterns?: string[];
}

/**
 * Parameters for the edit tool
 */
export interface EditParams {
  /**
   * Path to the file to modify (relative to vault root)
   */
  file_path: string;

  /**
   * The exact text to replace (empty string for new file creation)
   */
  old_string: string;

  /**
   * The text to replace old_string with
   */
  new_string: string;

  /**
   * Number of replacements expected (defaults to 1)
   */
  expected_replacements?: number;
}

/**
 * Parameters for the project explorer tool
 */
export interface ProjectExplorerParams {
  /**
   * Directory to explore (relative to vault root, defaults to vault root)
   */
  directory?: string;

  /**
   * Maximum number of items to process (50-1000, default: 200)
   */
  maxItems?: number;

  /**
   * Whether to include file content preview (increases output size)
   */
  includeFileContent?: boolean;

  /**
   * File extensions to focus on (e.g., ["md", "ts", "js"])
   */
  fileTypes?: string[];

  /**
   * Whether to respect .gitignore patterns
   */
  respectGitIgnore?: boolean;

  /**
   * Maximum directory depth to explore (1-10, default: 5)
   */
  maxDepth?: number;

  /**
   * Maximum number of directories to scan (10-500, helps with performance on large projects)
   */
  maxDirs?: number;

  /**
   * Whether to include content sampling from key project files for enhanced analysis
   */
  includeKeyFiles?: boolean;
}

// ============================================================================
// MCP (Model Context Protocol) Types
// ============================================================================

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  /**
   * Command to execute for Stdio transport
   */
  command?: string;

  /**
   * Command arguments for Stdio transport
   */
  args?: string[];

  /**
   * Environment variables for the server process
   */
  env?: Record<string, string>;

  /**
   * Working directory for Stdio transport
   */
  cwd?: string;

  /**
   * SSE endpoint URL
   */
  url?: string;

  /**
   * HTTP streaming endpoint URL
   */
  httpUrl?: string;

  /**
   * Request timeout in milliseconds (default: 600,000ms = 10 minutes)
   */
  timeout?: number;

  /**
   * When true, bypasses all tool call confirmations for this server
   */
  trust?: boolean;
}

/**
 * MCP Server connection status
 */
export enum MCPServerStatus {
  /** Server is disconnected or experiencing errors */
  DISCONNECTED = 'disconnected',
  /** Server is in the process of connecting */
  CONNECTING = 'connecting',
  /** Server is connected and ready to use */
  CONNECTED = 'connected',
}

/**
 * Overall MCP discovery state
 */
export enum MCPDiscoveryState {
  /** Discovery has not started yet */
  NOT_STARTED = 'not_started',
  /** Discovery is currently in progress */
  IN_PROGRESS = 'in_progress',
  /** Discovery has completed (with or without errors) */
  COMPLETED = 'completed',
}

/**
 * MCP tool parameters (generic record for external tools)
 */
export type MCPToolParams = Record<string, unknown>;

/**
 * Parameters for the open note tool
 */
export interface OpenNoteParams {
  /**
   * Exact path to the note file
   */
  path?: string;

  /**
   * Note title for lookup (alternative to path)
   */
  title?: string;

  /**
   * How to open the note: tab (current pane), split (new pane), or window (new window)
   */
  paneType?: 'tab' | 'split' | 'window';

  /**
   * Split direction when paneType is "split"
   */
  splitDirection?: 'horizontal' | 'vertical';

  /**
   * Whether to focus the opened note
   */
  focus?: boolean;

  /**
   * View state configuration for the opened note
   */
  viewState?: {
    mode?: 'source' | 'preview' | 'live';
    line?: number;
    column?: number;
  };
}

/**
 * Search result item
 */
export interface SearchResult {
  title: string;
  path: string;
  snippet?: string;
  score?: number;
  matches?: SearchMatch[];
}

/**
 * Search match information
 */
export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  context: string;
}

// ============================================================================
// Session and Chat Types
// ============================================================================

/**
 * Error categorization for detailed error handling
 */
export type ErrorCategory = 
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR' 
  | 'NETWORK_ERROR'
  | 'MODEL_ERROR'
  | 'PROVIDER_ERROR'
  | 'TOOL_EXECUTION_ERROR'
  | 'PERMISSION_ERROR'
  | 'FILE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Enhanced error information
 */
export interface ObsiusError {
  category: ErrorCategory;
  message: string;
  details?: string;
  retryable: boolean;
  userGuidance?: string;
  originalError?: Error;
}

/**
 * Chat message types
 */
export interface ChatMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ObsidianAction[];
}

/**
 * Obsidian action performed by the assistant
 */
export interface ObsidianAction {
  type: string;
  description: string;
  parameters: Record<string, any>;
  result?: ToolResult;
  riskLevel?: RiskLevel;
  requiresConfirmation?: boolean;
}

/**
 * Assistant response including actions
 */
export interface AssistantResponse {
  message: ChatMessage;
  actions?: ObsidianAction[];
  filesCreated?: string[];
  filesModified?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Secure provider configuration (no plaintext API keys)
 */
export interface SecureProviderConfig {
  name: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
  authenticated: boolean;        // Authentication status
  lastVerified?: string;         // ISO date string
  hasApiKey: boolean;           // Whether API key is stored
  keyPrefix?: string;           // Safe display prefix (e.g., "sk-ab...def")
  models?: string[];            // Available models from provider
}

/**
 * Plugin settings (secure version)
 */
export interface ObsiusSettings {
  // AI Provider settings (secure)
  providers: {
    [key: string]: SecureProviderConfig;
  };
  defaultProvider: string;
  
  // Tool settings
  tools: {
    enabled: string[];
    confirmationRequired: string[];
    riskLevels: {
      low: string[];
      medium: string[];
      high: string[];
    };
  };
  
  // UI settings
  ui: {
    interfaceLanguage: 'en' | 'ja';     // Language for UI elements (menus, settings, etc.)
    chatLanguage: 'auto' | 'en' | 'ja'; // Language for AI responses ('auto' = detect from user input)
    showTimestamps: boolean;
    enableStreaming: boolean;
    autoScroll: boolean;
  };
  
  // Session settings
  sessions: {
    maxHistorySize: number;
    autoSave: boolean;
    persistAcrossReloads: boolean;
  };
  
  // Workflow settings
  workflow: {
    maxIterations: number;        // Maximum iterations for ReACT/StateGraph (1-100)
    enableReACT: boolean;         // Enable ReACT reasoning methodology
    enableStateGraph: boolean;    // Enable LangGraph-style workflow
    iterationTimeout: number;     // Timeout per iteration in seconds (10-300)
  };

  // MCP settings
  mcp: {
    enabled: boolean;             // Enable MCP functionality
    servers: Record<string, MCPServerConfig>; // MCP server configurations
    autoDiscovery: boolean;       // Auto-discover tools on startup
    defaultTimeout: number;       // Default timeout for MCP operations (ms)
  };
}

// ============================================================================
// Session and Usage Types
// ============================================================================

/**
 * Token usage information from AI providers
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Session statistics for tracking AI usage
 */
export interface SessionStats {
  totalTokens: number;
  totalCost: number;
  providerStats: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
  }>;
  requestCount: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Tool execution error
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public parameters?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Tool validation error
 */
export class ToolValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'ToolValidationError';
  }
}

/**
 * User cancellation error
 */
export class UserCancelledError extends Error {
  constructor(message = 'Operation cancelled by user') {
    super(message);
    this.name = 'UserCancelledError';
  }
}

// ============================================================================
// Internationalization Types
// ============================================================================

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'ja';

/**
 * Translation keys for the application
 */
export interface TranslationKeys {
  // CLI Interface
  cli: {
    welcome: string;
    welcomeVault: string;
    welcomeHelp: string;
    prompt: string;
    thinking: string;
    placeholder: string;
  };
  
  // Commands
  commands: {
    help: {
      name: string;
      description: string;
      usage: string;
      availableCommands: string;
      chatInstructions: string;
    };
    clear: {
      name: string;
      description: string;
    };
    provider: {
      name: string;
      description: string;
      available: string;
      status: string;
      model: string;
      lastVerified: string;
      notFound: string;
    };
    settings: {
      name: string;
      description: string;
      opened: string;
    };
    status: {
      name: string;
      description: string;
      systemStatus: string;
      currentProvider: string;
      authentication: string;
      commandHistory: string;
      toolsAvailable: string;
    };
    unknown: {
      error: string;
      suggestion: string;
    };
  };
  
  // Provider Status
  provider: {
    connected: string;
    notConnected: string;
    none: string;
    noAuthenticated: string;
    checkStatus: string;
    configure: string;
  };
  
  // Tool Messages
  tools: {
    aiIntegration: string;
    placeholder: string;
    comingSoon: string;
  };
  
  // Settings
  settings: {
    language: string;
    languageDescription: string;
    english: string;
    japanese: string;
    
    // Settings sections
    interfaceSettings: string;
    providerSettings: string;
    toolSettings: string;
    workflowSettings: string;
    
    // Language settings
    interfaceLanguage: string;
    interfaceLanguageDesc: string;
    chatLanguage: string;
    chatLanguageDesc: string;
    autoDetect: string;
    
    // UI settings
    showTimestamps: string;
    showTimestampsDesc: string;
    enableStreaming: string;
    enableStreamingDesc: string;
    autoScroll: string;
    autoScrollDesc: string;
    
    // Tool settings
    enabledTools: string;
    enabledToolsDesc: string;
    confirmationRequired: string;
    confirmationRequiredDesc: string;
    
    // Workflow settings
    maxIterations: string;
    maxIterationsDesc: string;
    enableReACT: string;
    enableReACTDesc: string;
    enableStateGraph: string;
    enableStateGraphDesc: string;
    iterationTimeout: string;
    iterationTimeoutDesc: string;
    
    // Provider settings
    defaultProvider: string;
    defaultProviderDesc: string;
    
    // Page titles
    settingsTitle: string;
    
    // Provider configuration
    providerStatus: string;
    apiKeyConfiguration: string;
    connected: string;
    notConfigured: string;
    verificationFailed: string;
    apiKeyStored: string;
    noApiKey: string;
    unknown: string;
    
    // Workflow settings
    enableStateGraphWorkflow: string;
    enableStateGraphWorkflowDesc: string;
    workflowTip: string;
    resetToDefault: string;
    
    // Provider API key descriptions
    openaiApiKeyDesc: string;
    anthropicApiKeyDesc: string;
    googleApiKeyDesc: string;
    defaultApiKeyDesc: string;
    
    // Provider placeholders
    enterApiKey: string;
    
    // Model selection and connection
    model: string;
    modelDesc: string;
    connection: string;
    connectionDesc: string;
    disconnect: string;
    connect: string;
    
    // Tool status
    toolsStatus: string;
    
    // Error messages
    disconnectFailed: string;
    unknownError: string;
  };
  
  // General
  general: {
    error: string;
    success: string;
    info: string;
    loading: string;
    cancel: string;
    confirm: string;
    yes: string;
    no: string;
  };

  // System Prompts
  systemPrompt: {
    intro: string;
    
    // ReACT Methodology
    reactMethodology: string;
    reactExplanation: string;
    reactSteps: {
      thought: string;
      action: string;
      observation: string;
    };
    reactInstructions: string;
    reactExample: string;
    
    coreValues: string;
    contextFirst: string;
    smartConnections: string;
    noDuplication: string;
    respectStructure: string;
    enhanceDiscovery: string;
    workflow: string;
    workflowSteps: {
      explore: string;
      connect: string;
      structure: string;
      create: string;
      integrate: string;
    };
    environment: string;
    responseRules: string;
    responseGuidelines: string;
    examples: string;
    exampleProductivity: {
      user: string;
      assistant: string;
    };
    exampleOrganize: {
      user: string;
      assistant: string;
    };
    exampleReact: {
      user: string;
      assistant: string;
    };
    remember: string;
    languageInstruction: string;
  };

  // Error Messages
  errors: {
    authentication: {
      invalid: string;
    };
    rateLimit: {
      exceeded: string;
    };
    network: {
      connection: string;
    };
    model: {
      unavailable: string;
    };
    provider: {
      notConfigured: string;
    };
    unknown: {
      general: string;
    };
    tool: {
      permission: string;
      fileAccess: string;
      validation: string;
      execution: string;
      unknown: string;
    };
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type for configuration updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Tool execution callback for progress updates
 */
export type ToolProgressCallback = (progress: {
  stage: string;
  percentage?: number;
  message?: string;
}) => void;