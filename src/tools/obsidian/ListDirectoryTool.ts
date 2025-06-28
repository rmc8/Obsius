/**
 * List Directory Tool for Obsius - Directory Listing
 * Adapted from gemini-cli ls tool for Obsidian vault operations
 */

import { z } from 'zod';
import { TFile, TFolder } from 'obsidian';
import * as path from 'path';
import { BaseTool } from '../BaseTool';
import { ListDirectoryParams, ToolResult, FileEntry } from '../../utils/types';

/**
 * Zod schema for list directory tool parameters
 */
const ListDirectorySchema = z.object({
  path: z.string()
    .min(1)
    .describe('The path to the directory to list (relative to vault root or absolute)'),
  
  ignore: z.array(z.string())
    .optional()
    .describe('Optional: Array of glob patterns to ignore'),
  
  respect_git_ignore: z.boolean()
    .default(true)
    .describe('Optional: Whether to respect .gitignore patterns. Defaults to true.')
});

/**
 * Tool for listing files and directories in Obsidian vault
 */
export class ListDirectoryTool extends BaseTool<ListDirectoryParams> {
  get name(): string {
    return 'list_directory';
  }

  get description(): string {
    return 'Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns. Returns file metadata including size and modification time.';
  }

  get parameterSchema(): z.ZodSchema<ListDirectoryParams> {
    return ListDirectorySchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: ListDirectoryParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Resolve directory path
      const vaultPath = this.getVaultPath();
      const targetDir = this.resolveDirectoryPath(params.path, vaultPath);

      // Validate directory
      if (!this.isWithinVault(targetDir, vaultPath)) {
        return this.createErrorResult(
          `Directory path must be within the vault: ${params.path}`,
          new Error('Path outside vault boundary')
        );
      }

      if (!this.directoryExists(params.path)) {
        return this.createErrorResult(
          `Directory not found: ${params.path}`,
          new Error('Directory not found')
        );
      }

      // Get directory contents from Obsidian
      const entries = await this.getDirectoryEntries(params.path);

      if (entries.length === 0) {
        return this.createSuccessResult(
          `Directory "${params.path}" is empty.`,
          { entries: [], count: 0, directory: params.path }
        );
      }

      // Filter entries based on ignore patterns
      const filteredEntries = this.filterEntries(entries, params.ignore);

      // Apply gitignore filtering if requested
      let finalEntries = filteredEntries;
      let gitIgnoredCount = 0;

      if (params.respect_git_ignore) {
        const { filtered, ignoredCount } = this.applyGitIgnoreFiltering(filteredEntries);
        finalEntries = filtered;
        gitIgnoredCount = ignoredCount;
      }

      // Sort entries (directories first, then alphabetically)
      finalEntries.sort(this.compareFileEntries);

      const resultMessage = this.createResultMessage(finalEntries, params.path, gitIgnoredCount);

      return this.createSuccessResult(
        resultMessage,
        { 
          entries: finalEntries, 
          count: finalEntries.length, 
          directory: params.path,
          gitIgnoredCount
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to list directory: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Get vault filesystem path
   */
  private getVaultPath(): string {
    return (this.app.vault.adapter as any).path || '';
  }

  /**
   * Resolve directory path (handle both relative and absolute paths)
   */
  private resolveDirectoryPath(dirPath: string, vaultPath: string): string {
    if (path.isAbsolute(dirPath)) {
      return dirPath;
    }
    return path.resolve(vaultPath, dirPath);
  }

  /**
   * Check if a path is within the vault boundary
   */
  private isWithinVault(pathToCheck: string, vaultPath: string): boolean {
    const normalizedPath = path.normalize(pathToCheck);
    const normalizedVault = path.normalize(vaultPath);
    
    return normalizedPath === normalizedVault || 
           normalizedPath.startsWith(normalizedVault + path.sep);
  }

  /**
   * Check if directory exists in Obsidian
   */
  private directoryExists(dirPath: string): boolean {
    try {
      // Handle vault root
      if (dirPath === '' || dirPath === '.' || dirPath === '/') {
        return true;
      }

      // Clean path for Obsidian
      const cleanPath = dirPath.replace(/^\/+/, '').replace(/\/+$/, '');
      
      const folder = this.app.vault.getAbstractFileByPath(cleanPath);
      return folder instanceof TFolder;
    } catch {
      return false;
    }
  }

  /**
   * Get directory entries from Obsidian vault
   */
  private async getDirectoryEntries(dirPath: string): Promise<FileEntry[]> {
    const entries: FileEntry[] = [];
    
    try {
      let folder: TFolder;
      
      // Handle vault root
      if (dirPath === '' || dirPath === '.' || dirPath === '/') {
        folder = this.app.vault.getRoot();
      } else {
        const cleanPath = dirPath.replace(/^\/+/, '').replace(/\/+$/, '');
        const abstractFile = this.app.vault.getAbstractFileByPath(cleanPath);
        
        if (!(abstractFile instanceof TFolder)) {
          throw new Error('Path is not a directory');
        }
        
        folder = abstractFile;
      }

      // Get immediate children only
      for (const child of folder.children) {
        const isDirectory = child instanceof TFolder;
        const filePath = child.path;
        const name = child.name;
        
        // Get file stats for metadata
        let size = 0;
        let modifiedTime = new Date();
        
        if (child instanceof TFile) {
          size = child.stat.size;
          modifiedTime = new Date(child.stat.mtime);
        } else if (child instanceof TFolder) {
          // For folders, use current time as modification time since TFolder doesn't have stat
          modifiedTime = new Date();
        }

        entries.push({
          name,
          path: filePath,
          isDirectory,
          size,
          modifiedTime
        });
      }

      return entries;
    } catch (error) {
      throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter entries based on ignore patterns
   */
  private filterEntries(entries: FileEntry[], ignorePatterns?: string[]): FileEntry[] {
    if (!ignorePatterns || ignorePatterns.length === 0) {
      return entries;
    }

    return entries.filter(entry => {
      return !this.shouldIgnoreFile(entry.name, ignorePatterns);
    });
  }

  /**
   * Check if a filename matches any ignore pattern
   */
  private shouldIgnoreFile(filename: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Convert glob pattern to RegExp
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(filename)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply gitignore filtering (simplified implementation)
   */
  private applyGitIgnoreFiltering(entries: FileEntry[]): { filtered: FileEntry[]; ignoredCount: number } {
    // Common gitignore patterns
    const commonIgnorePatterns = [
      '.git',
      'node_modules',
      '.obsidian',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.log'
    ];

    const filtered = entries.filter(entry => {
      return !commonIgnorePatterns.some(pattern => {
        if (pattern.startsWith('*')) {
          return entry.name.endsWith(pattern.slice(1));
        }
        return entry.name === pattern || entry.name.includes(pattern);
      });
    });

    return {
      filtered,
      ignoredCount: entries.length - filtered.length
    };
  }

  /**
   * Compare function for sorting file entries (directories first, then alphabetical)
   */
  private compareFileEntries(a: FileEntry, b: FileEntry): number {
    // Directories come first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    
    // Then sort alphabetically (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  }

  /**
   * Create formatted result message
   */
  private createResultMessage(entries: FileEntry[], dirPath: string, gitIgnoredCount: number): string {
    let message = `Directory listing for "${dirPath}":\n\n`;
    
    if (entries.length === 0) {
      message += '(empty directory)';
    } else {
      // Format entries with type indicators
      const formattedEntries = entries.map(entry => {
        const typeIndicator = entry.isDirectory ? '[DIR]' : '[FILE]';
        const sizeInfo = entry.isDirectory ? '' : ` (${this.formatFileSize(entry.size)})`;
        return `${typeIndicator} ${entry.name}${sizeInfo}`;
      });
      
      message += formattedEntries.join('\n');
    }

    if (gitIgnoredCount > 0) {
      message += `\n\n(${gitIgnoredCount} items were git-ignored)`;
    }

    return message;
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(1);
    
    return `${size} ${units[i]}`;
  }

  /**
   * List directory operations are never destructive
   */
  protected isDestructiveOperation(params: ListDirectoryParams): boolean {
    return false;
  }
}