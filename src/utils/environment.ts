/**
 * Environment detection utilities for Obsius
 * Determines feature availability based on runtime environment
 */

/**
 * Check if MCP (Model Context Protocol) is supported in the current environment
 * MCP requires Node.js modules that are not available in browser environments
 */
export const isMCPSupported = (): boolean => {
  try {
    // Check for Node.js environment indicators
    return (
      typeof process !== 'undefined' && 
      typeof require !== 'undefined' &&
      // Ensure we're not in a browser-like environment
      typeof window === 'undefined'
    );
  } catch {
    return false;
  }
};

/**
 * Check if we're running in Obsidian's Electron environment
 */
export const isObsidianEnvironment = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof (window as any).require !== 'undefined' &&
      typeof (window as any).electron !== 'undefined'
    );
  } catch {
    return false;
  }
};

/**
 * Check if we're running in a development environment
 */
export const isDevelopmentEnvironment = (): boolean => {
  try {
    return process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
};

/**
 * Get environment information for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    mcpSupported: isMCPSupported(),
    obsidianEnvironment: isObsidianEnvironment(),
    developmentEnvironment: isDevelopmentEnvironment(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    platform: typeof process !== 'undefined' ? process.platform : 'browser'
  };
};