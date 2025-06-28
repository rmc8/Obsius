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
    language: 'en' | 'ja';
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