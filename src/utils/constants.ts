/**
 * Application constants for Obsius plugin
 * Centralized configuration values for workflow management
 */

// Workflow and Processing Constants
export const WORKFLOW_CONSTANTS = {
  /**
   * Maximum number of iterations for ReACT/StateGraph workflow loops
   * LangGraph-style processing with configurable iteration limits
   */
  MAX_ITERATIONS: 24,
  
  /**
   * Default maximum iterations (fallback)
   */
  DEFAULT_MAX_ITERATIONS: 5,
  
  /**
   * Minimum iterations before forced completion
   */
  MIN_ITERATIONS: 1,
  
  /**
   * Timeout per iteration in milliseconds
   */
  ITERATION_TIMEOUT_MS: 30000,
  
  /**
   * Maximum working memory entries to retain
   */
  MAX_WORKING_MEMORY_ENTRIES: 50
} as const;

// AI Provider Constants
export const AI_CONSTANTS = {
  /**
   * Default token limits for AI responses
   */
  DEFAULT_MAX_TOKENS: 1000,
  
  /**
   * Default temperature for AI generation
   */
  DEFAULT_TEMPERATURE: 0.7,
  
  /**
   * Request timeout in milliseconds
   */
  REQUEST_TIMEOUT_MS: 60000,
  
  /**
   * Maximum retry attempts for failed requests
   */
  MAX_RETRIES: 3
} as const;

// Tool Execution Constants
export const TOOL_CONSTANTS = {
  /**
   * Maximum concurrent tool executions
   */
  MAX_CONCURRENT_TOOLS: 3,
  
  /**
   * Tool execution timeout in milliseconds
   */
  EXECUTION_TIMEOUT_MS: 15000,
  
  /**
   * Maximum tool parameter size in bytes
   */
  MAX_PARAMETER_SIZE: 10240
} as const;

// State Management Constants
export const STATE_CONSTANTS = {
  /**
   * Maximum state history to maintain
   */
  MAX_STATE_HISTORY: 100,
  
  /**
   * State persistence interval in milliseconds
   */
  PERSISTENCE_INTERVAL_MS: 5000,
  
  /**
   * Maximum state size in bytes for persistence
   */
  MAX_STATE_SIZE: 1048576 // 1MB
} as const;

// Session Constants
export const SESSION_CONSTANTS = {
  /**
   * Session timeout in milliseconds
   */
  SESSION_TIMEOUT_MS: 1800000, // 30 minutes
  
  /**
   * Maximum conversation history length
   */
  MAX_CONVERSATION_HISTORY: 200,
  
  /**
   * Auto-save interval in milliseconds
   */
  AUTO_SAVE_INTERVAL_MS: 10000
} as const;

// Validation Constants
export const VALIDATION_CONSTANTS = {
  /**
   * Maximum input length for user messages
   */
  MAX_INPUT_LENGTH: 10000,
  
  /**
   * Minimum API key length
   */
  MIN_API_KEY_LENGTH: 8,
  
  /**
   * Maximum file path length
   */
  MAX_FILE_PATH_LENGTH: 500
} as const;

// Export all constants as a single object for easy access
export const CONSTANTS = {
  WORKFLOW: WORKFLOW_CONSTANTS,
  AI: AI_CONSTANTS,
  TOOL: TOOL_CONSTANTS,
  STATE: STATE_CONSTANTS,
  SESSION: SESSION_CONSTANTS,
  VALIDATION: VALIDATION_CONSTANTS
} as const;

// Type definitions for constants
export type WorkflowConstants = typeof WORKFLOW_CONSTANTS;
export type AIConstants = typeof AI_CONSTANTS;
export type ToolConstants = typeof TOOL_CONSTANTS;
export type StateConstants = typeof STATE_CONSTANTS;
export type SessionConstants = typeof SESSION_CONSTANTS;
export type ValidationConstants = typeof VALIDATION_CONSTANTS;
export type AllConstants = typeof CONSTANTS;