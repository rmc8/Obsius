/**
 * GitIgnore Parser for Obsius - Enhanced gitignore pattern matching
 * Adapted from gemini-cli patterns for Obsidian environment
 */

import { TFile } from 'obsidian';

/**
 * Simple gitignore parser for Obsidian environment
 * Supports basic gitignore patterns without Node.js dependencies
 */
export class GitIgnoreParser {
  private patterns: string[] = [];
  private negationPatterns: string[] = [];
  private app: any;
  
  constructor(app: any) {
    this.app = app;
  }
  
  /**
   * Load .gitignore file from the vault
   */
  async loadGitIgnoreFile(): Promise<void> {
    try {
      const gitignoreFile = this.app.vault.getAbstractFileByPath('.gitignore');
      if (gitignoreFile instanceof TFile) {
        const content = await this.app.vault.read(gitignoreFile);
        this.parseGitIgnoreContent(content);
      }
    } catch (error) {
      // Silently fail if .gitignore doesn't exist
      console.debug('No .gitignore file found or accessible');
    }
  }
  
  /**
   * Parse gitignore content and extract patterns
   */
  private parseGitIgnoreContent(content: string): void {
    const lines = content.split('\n');
    this.patterns = [];
    this.negationPatterns = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Handle negation patterns (starting with !)
      if (trimmed.startsWith('!')) {
        this.negationPatterns.push(trimmed.slice(1));
      } else {
        this.patterns.push(trimmed);
      }
    }
  }
  
  /**
   * Check if a file path should be ignored based on gitignore patterns
   */
  isIgnored(filePath: string): boolean {
    // Normalize path (remove leading slashes)
    const normalizedPath = filePath.replace(/^\/+/, '');
    
    // Check if path matches any ignore pattern
    const isMatched = this.patterns.some(pattern => this.matchesPattern(normalizedPath, pattern));
    
    // If matched, check if it's negated by any negation pattern
    if (isMatched) {
      const isNegated = this.negationPatterns.some(pattern => this.matchesPattern(normalizedPath, pattern));
      return !isNegated;
    }
    
    return false;
  }
  
  /**
   * Check if a path matches a gitignore pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Handle directory patterns (ending with /)
    if (pattern.endsWith('/')) {
      const dirPattern = pattern.slice(0, -1);
      return path === dirPattern || path.startsWith(dirPattern + '/');
    }
    
    // Convert gitignore pattern to regex
    const regexPattern = this.gitIgnoreToRegex(pattern);
    const regex = new RegExp(regexPattern);
    
    return regex.test(path);
  }
  
  /**
   * Convert gitignore pattern to regular expression
   */
  private gitIgnoreToRegex(pattern: string): string {
    // Escape special regex characters except * and ?
    let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Handle ** (match any directory depth)
    regexPattern = regexPattern.replace(/\*\*/g, '.*');
    
    // Handle * (match any characters except /)
    regexPattern = regexPattern.replace(/(?<!\*)\*(?!\*)/g, '[^/]*');
    
    // Handle ? (match any single character except /)
    regexPattern = regexPattern.replace(/\?/g, '[^/]');
    
    // If pattern doesn't start with /, it can match at any level
    if (!pattern.startsWith('/')) {
      regexPattern = `(^|/)${regexPattern}`;
    } else {
      // Remove leading / and anchor to start
      regexPattern = '^' + regexPattern.slice(1);
    }
    
    // Anchor to end unless pattern ends with /
    if (!pattern.endsWith('/')) {
      regexPattern += '($|/)';
    }
    
    return regexPattern;
  }
  
  /**
   * Get all loaded patterns (for debugging)
   */
  getPatterns(): string[] {
    return [...this.patterns];
  }
  
  /**
   * Get all negation patterns (for debugging)
   */
  getNegationPatterns(): string[] {
    return [...this.negationPatterns];
  }
  
  /**
   * Add default ignore patterns commonly used in projects
   */
  addDefaultPatterns(): void {
    const defaultPatterns = [
      '.git/',
      'node_modules/',
      '.obsidian/',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.log',
      '*.swp',
      '*.cache',
      'dist/',
      'build/',
      '.next/',
      '.vscode/',
      '*.lock'
    ];
    
    this.patterns.push(...defaultPatterns);
  }
  
  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns = [];
    this.negationPatterns = [];
  }
}