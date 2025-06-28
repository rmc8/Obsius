/**
 * Glob Tool for Obsius - Find Files by Pattern
 * Adapted from gemini-cli glob tool for Obsidian vault operations
 */

import { z } from 'zod';
import { TFile, TFolder } from 'obsidian';
import { glob } from 'glob';
import * as path from 'path';
import { BaseTool } from '../BaseTool';
import { GlobParams, ToolResult } from '../../utils/types';

/**
 * Zod schema for glob tool parameters
 */
const GlobSchema = z.object({
  pattern: z.string()
    .min(1)
    .describe('The glob pattern to match against (e.g., "**/*.md", "src/**/*.ts")'),
  
  path: z.string()
    .optional()
    .describe('Optional: The directory to search within (relative to vault root)'),
  
  case_sensitive: z.boolean()
    .default(false)
    .describe('Optional: Whether the search should be case-sensitive. Defaults to false.'),
  
  respect_git_ignore: z.boolean()
    .default(true)
    .describe('Optional: Whether to respect .gitignore patterns. Defaults to true.')
});

/**
 * Interface for glob path entries (similar to gemini-cli's GlobPath)
 */
interface GlobPathEntry {
  fullpath(): string;
  mtimeMs?: number;
}

/**
 * Tool for finding files using glob patterns in Obsidian vault
 */
export class GlobTool extends BaseTool<GlobParams> {
  get name(): string {
    return 'glob';
  }

  get description(): string {
    return 'Efficiently finds files matching specific glob patterns (e.g., `**/*.md`, `src/**/*.ts`), returning paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure.';
  }

  get parameterSchema(): z.ZodSchema<GlobParams> {
    return GlobSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: GlobParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Get vault adapter path for filesystem operations
      const vaultPath = this.getVaultPath();
      const searchDir = params.path 
        ? path.resolve(vaultPath, params.path)
        : vaultPath;

      // Validate search directory exists and is within vault
      if (!this.isWithinVault(searchDir)) {
        return this.createErrorResult(
          `Search path must be within the vault: ${params.path}`,
          new Error('Path outside vault boundary')
        );
      }

      if (!this.directoryExists(searchDir)) {
        return this.createErrorResult(
          `Search directory does not exist: ${params.path || 'vault root'}`,
          new Error('Directory not found')
        );
      }

      // Execute glob search with v8 API
      const globOptions = {
        cwd: searchDir,
        nodir: true,
        nocase: !params.case_sensitive,
        dot: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      };

      // Use glob v8 API to get file paths (glob returns a Promise<string[]> in v8)
      const filePaths: string[] = await new Promise((resolve, reject) => {
        glob(params.pattern, globOptions, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      
      // Create entries with file stats
      const entries: GlobPathEntry[] = [];
      for (const filePath of filePaths) {
        try {
          const fs = require('fs');
          const fullPath = path.resolve(searchDir, filePath);
          const stats = fs.statSync(fullPath);
          entries.push({
            fullpath: () => fullPath,
            mtimeMs: stats.mtimeMs
          });
        } catch (error) {
          // If we can't get stats, still include the file with current time
          const fullPath = path.resolve(searchDir, filePath);
          entries.push({
            fullpath: () => fullPath,
            mtimeMs: Date.now()
          });
        }
      }

      if (!entries || entries.length === 0) {
        const searchLocation = params.path || 'vault root';
        return this.createSuccessResult(
          `No files found matching pattern "${params.pattern}" in ${searchLocation}`,
          { files: [], count: 0, pattern: params.pattern, searchPath: searchLocation }
        );
      }

      // Sort by modification time (newest first), then alphabetically
      const sortedEntries = this.sortFileEntries(entries);
      
      // Convert to relative paths from vault root
      const relativePaths = sortedEntries.map(entry => {
        const absolutePath = entry.fullpath();
        return path.relative(vaultPath, absolutePath);
      });

      // Filter based on gitignore if requested
      let filteredPaths = relativePaths;
      let gitIgnoredCount = 0;

      if (params.respect_git_ignore) {
        const { filtered, ignoredCount } = this.applyGitIgnoreFiltering(relativePaths);
        filteredPaths = filtered;
        gitIgnoredCount = ignoredCount;
      }

      const resultMessage = this.createResultMessage(
        filteredPaths, 
        params.pattern, 
        params.path || 'vault root',
        gitIgnoredCount
      );

      return this.createSuccessResult(
        resultMessage,
        { 
          files: filteredPaths, 
          count: filteredPaths.length, 
          pattern: params.pattern,
          searchPath: params.path || 'vault root',
          gitIgnoredCount
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Glob search failed: ${errorMessage}`,
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
   * Check if a path is within the vault boundary
   */
  private isWithinVault(pathToCheck: string): boolean {
    const vaultPath = this.getVaultPath();
    const absolutePathToCheck = path.resolve(pathToCheck);
    const normalizedPath = path.normalize(absolutePathToCheck);
    const normalizedVault = path.normalize(vaultPath);
    
    return normalizedPath === normalizedVault || 
           normalizedPath.startsWith(normalizedVault + path.sep);
  }

  /**
   * Check if directory exists
   */
  private directoryExists(dirPath: string): boolean {
    try {
      const vaultPath = this.getVaultPath();
      const relativePath = path.relative(vaultPath, dirPath);
      
      // Check if it's the vault root
      if (relativePath === '' || relativePath === '.') {
        return true;
      }

      // Check if folder exists in Obsidian
      const folder = this.app.vault.getAbstractFileByPath(relativePath);
      return folder instanceof TFolder;
    } catch {
      return false;
    }
  }

  /**
   * Sort file entries by modification time (newest first), then alphabetically
   */
  private sortFileEntries(entries: GlobPathEntry[]): GlobPathEntry[] {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const nowTimestamp = Date.now();

    return entries.sort((a, b) => {
      const mtimeA = a.mtimeMs ?? 0;
      const mtimeB = b.mtimeMs ?? 0;
      const aIsRecent = nowTimestamp - mtimeA < oneDayInMs;
      const bIsRecent = nowTimestamp - mtimeB < oneDayInMs;

      // Recent files first (within 24 hours), sorted by modification time
      if (aIsRecent && bIsRecent) {
        return mtimeB - mtimeA; // Newest first
      } else if (aIsRecent) {
        return -1; // Recent files come first
      } else if (bIsRecent) {
        return 1; // Recent files come first
      } else {
        // Older files sorted alphabetically
        return a.fullpath().localeCompare(b.fullpath());
      }
    });
  }

  /**
   * Apply gitignore filtering (simplified implementation)
   */
  private applyGitIgnoreFiltering(filePaths: string[]): { filtered: string[]; ignoredCount: number } {
    // Simple gitignore patterns - in a full implementation, this would read .gitignore files
    const commonIgnorePatterns = [
      '.git',
      'node_modules',
      '.obsidian',
      '*.tmp',
      '*.log',
      '.DS_Store',
      'Thumbs.db'
    ];

    const filtered = filePaths.filter(filePath => {
      return !commonIgnorePatterns.some(pattern => {
        if (pattern.startsWith('*')) {
          return filePath.endsWith(pattern.slice(1));
        }
        return filePath.includes(pattern);
      });
    });

    return {
      filtered,
      ignoredCount: filePaths.length - filtered.length
    };
  }

  /**
   * Create formatted result message
   */
  private createResultMessage(
    files: string[], 
    pattern: string, 
    searchPath: string,
    gitIgnoredCount: number
  ): string {
    const fileCount = files.length;
    let message = `Found ${fileCount} file(s) matching "${pattern}" in ${searchPath}`;
    
    if (gitIgnoredCount > 0) {
      message += ` (${gitIgnoredCount} additional files were git-ignored)`;
    }
    
    message += ', sorted by modification time (newest first):\n\n';
    message += files.join('\n');

    return message;
  }

  /**
   * Glob operations are never destructive
   */
  protected isDestructiveOperation(params: GlobParams): boolean {
    return false;
  }
}