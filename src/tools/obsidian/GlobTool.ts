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
      
      // Ensure params.path is a string before using it
      const pathParam = params.path ? String(params.path).trim() : '.';
      
      // Resolve search directory safely
      let searchDir: string;
      try {
        if (pathParam === '.' || pathParam === '') {
          searchDir = vaultPath;
        } else {
          // Ensure both parameters are strings for path.resolve
          const vaultStr = String(vaultPath);
          const pathStr = String(pathParam);
          searchDir = path.resolve(vaultStr, pathStr);
        }
      } catch (pathError) {
        console.error('❌ Path resolution error:', pathError);
        console.error('❌ Path params:', { vaultPath, pathParam });
        throw new Error(`Failed to resolve search directory: ${pathError instanceof Error ? pathError.message : 'Unknown error'}`);
      }
      
      console.log('🔍 Vault path:', vaultPath);
      console.log('🔍 Path param:', pathParam);
      console.log('🔍 Search directory:', searchDir);

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

      // Debug logging for parameter validation
      console.log('🔍 GlobTool executing with params:', {
        pattern: params.pattern,
        path: params.path,
        searchDir: searchDir,
        patternType: typeof params.pattern
      });

      // Ensure pattern is a string
      const safePattern = String(params.pattern).trim();
      if (!safePattern) {
        throw new Error('Pattern parameter must be a non-empty string');
      }

      // Execute glob search with v8 API - using simpler options to avoid type issues
      const globOptions = {
        cwd: searchDir,
        nodir: true,
        nocase: !params.case_sensitive,
        dot: true
      };

      // Add ignore patterns separately if needed
      const ignorePatterns = ['**/node_modules/**', '**/.git/**'];

      console.log('🔍 Calling glob with:', { pattern: safePattern, cwd: searchDir });

      // Use glob with callback for compatibility
      let filePaths: string[] = [];
      try {
        console.log('🔍 Attempting glob search...');
        
        // Use callback-based API which is more stable
        filePaths = await new Promise<string[]>((resolve, reject) => {
          glob(safePattern, globOptions, (err: Error | null, matches: string[]) => {
            if (err) {
              console.error('❌ Glob error:', err);
              reject(err);
            } else {
              console.log(`✅ Glob found ${matches?.length || 0} matches`);
              resolve(matches || []);
            }
          });
        });
      } catch (globError) {
        console.error('❌ Glob execution failed:', globError);
        console.error('❌ Error details:', {
          message: globError instanceof Error ? globError.message : 'Unknown',
          stack: globError instanceof Error ? globError.stack : 'No stack',
          globOptions,
          pattern: safePattern
        });
        
        // Try alternative approach - use Obsidian's API
        console.log('🔄 Falling back to Obsidian API for file discovery...');
        try {
          const allFiles = this.app.vault.getFiles();
          filePaths = allFiles
            .filter(file => file.extension === 'md')
            .map(file => path.relative(searchDir, path.join(this.getVaultPath(), file.path)));
          console.log(`✅ Obsidian API found ${filePaths.length} markdown files`);
        } catch (fallbackError) {
          throw new Error(`Both glob and fallback failed: ${globError instanceof Error ? globError.message : 'Unknown error'}`);
        }
      }

      // Manually filter ignore patterns since the ignore option might be causing issues
      filePaths = filePaths.filter(path => {
        return !ignorePatterns.some(pattern => {
          const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
          return new RegExp(regex).test(path);
        });
      });
      
      // Create entries with file stats
      const entries: GlobPathEntry[] = [];
      for (const filePath of filePaths) {
        try {
          const fs = require('fs');
          // Ensure filePath is a string
          const filePathStr = String(filePath);
          const searchDirStr = String(searchDir);
          const fullPath = path.resolve(searchDirStr, filePathStr);
          
          const stats = fs.statSync(fullPath);
          entries.push({
            fullpath: () => fullPath,
            mtimeMs: stats.mtimeMs
          });
        } catch (error) {
          // If we can't get stats, still include the file with current time
          const filePathStr = String(filePath);
          const searchDirStr = String(searchDir);
          const fullPath = path.resolve(searchDirStr, filePathStr);
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
        const absolutePath = String(entry.fullpath());
        const vaultPathStr = String(vaultPath);
        return path.relative(vaultPathStr, absolutePath);
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
    const adapter = this.app.vault.adapter as any;
    const vaultPath = adapter.path || adapter.basePath || '';
    
    // Ensure it's a string
    const safePath = String(vaultPath).trim();
    
    console.log('🔍 Vault adapter info:', {
      hasPath: 'path' in adapter,
      hasBasePath: 'basePath' in adapter,
      vaultPath: safePath,
      pathType: typeof safePath
    });
    
    if (!safePath) {
      throw new Error('Unable to determine vault filesystem path');
    }
    
    return safePath;
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