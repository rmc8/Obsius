/**
 * Grep Tool for Obsius - Content Search with Regular Expressions
 * Adapted from gemini-cli grep tool for Obsidian vault operations
 */

import { z } from 'zod';
import { TFile } from 'obsidian';
import * as path from 'path';
import { BaseTool } from '../BaseTool';
import { GrepParams, ToolResult, GrepMatch } from '../../utils/types';

/**
 * Zod schema for grep tool parameters
 */
const GrepSchema = z.object({
  pattern: z.string()
    .min(1)
    .describe('The regular expression pattern to search for in file contents'),
  
  path: z.string()
    .optional()
    .describe('Optional: The directory to search within (relative to vault root)'),
  
  include: z.string()
    .optional()
    .describe('Optional: File pattern to filter search (e.g., "*.js", "*.{ts,tsx}")')
});

/**
 * Tool for searching file contents using regular expressions in Obsidian vault
 */
export class GrepTool extends BaseTool<GrepParams> {
  get name(): string {
    return 'grep';
  }

  get description(): string {
    return 'Search for regular expression patterns within file contents. Returns matching lines with file paths and line numbers. Supports file pattern filtering.';
  }

  get parameterSchema(): z.ZodSchema<GrepParams> {
    return GrepSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: GrepParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Validate and compile regex pattern
      let regex: RegExp;
      try {
        regex = new RegExp(params.pattern, 'i'); // Case-insensitive search
      } catch (error) {
        return this.createErrorResult(
          `Invalid regular expression pattern: ${params.pattern}`,
          error instanceof Error ? error : new Error('Invalid regex')
        );
      }

      // Get search directory
      const searchPath = params.path || '';
      if (!this.isValidVaultPath(searchPath)) {
        return this.createErrorResult(
          `Invalid search path: ${params.path}`,
          new Error('Path outside vault boundary')
        );
      }

      // Get files to search
      const filesToSearch = await this.getFilesToSearch(searchPath, params.include);
      
      if (filesToSearch.length === 0) {
        const location = params.path || 'vault root';
        const filter = params.include ? ` (filter: ${params.include})` : '';
        return this.createSuccessResult(
          `No files found to search in ${location}${filter}`,
          { matches: [], matchCount: 0, fileCount: 0 }
        );
      }

      // Perform search across files
      const allMatches: GrepMatch[] = [];
      let searchedFileCount = 0;

      for (const file of filesToSearch) {
        try {
          const content = await this.app.vault.read(file);
          const fileMatches = this.searchInContent(content, regex, file.path);
          allMatches.push(...fileMatches);
          searchedFileCount++;
        } catch (error) {
          // Skip files that can't be read (binary files, permission issues, etc.)
          console.debug(`Skipping file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Format results
      const resultMessage = this.formatSearchResults(
        allMatches,
        params.pattern,
        params.path || 'vault root',
        params.include,
        searchedFileCount
      );

      return this.createSuccessResult(
        resultMessage,
        {
          matches: allMatches,
          matchCount: allMatches.length,
          fileCount: searchedFileCount,
          pattern: params.pattern,
          searchPath: params.path || 'vault root'
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Grep search failed: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Check if path is valid within vault
   */
  private isValidVaultPath(searchPath: string): boolean {
    if (!searchPath) return true; // Empty path = vault root
    
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(searchPath);
    return !normalizedPath.startsWith('../') && !path.isAbsolute(normalizedPath);
  }

  /**
   * Get list of files to search based on path and include pattern
   */
  private async getFilesToSearch(searchPath: string, includePattern?: string): Promise<TFile[]> {
    let allFiles = this.app.vault.getMarkdownFiles();

    // Filter by search path if specified
    if (searchPath) {
      allFiles = allFiles.filter(file => 
        file.path.startsWith(searchPath) || 
        file.path.startsWith(searchPath + '/')
      );
    }

    // Filter by include pattern if specified
    if (includePattern) {
      const pattern = this.convertGlobToRegex(includePattern);
      allFiles = allFiles.filter(file => pattern.test(file.name) || pattern.test(file.path));
    }

    return allFiles;
  }

  /**
   * Convert glob pattern to regular expression
   */
  private convertGlobToRegex(glob: string): RegExp {
    // Handle common glob patterns
    let regexPattern = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*')                 // * matches any characters
      .replace(/\?/g, '.')                  // ? matches single character
      .replace(/\{([^}]+)\}/g, '($1)')      // {ts,tsx} becomes (ts|tsx)
      .replace(/,/g, '|');                  // Convert commas to OR

    return new RegExp(`^${regexPattern}$`, 'i');
  }

  /**
   * Search for pattern within file content
   */
  private searchInContent(content: string, regex: RegExp, filePath: string): GrepMatch[] {
    const matches: GrepMatch[] = [];
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (regex.test(line)) {
        matches.push({
          filePath,
          lineNumber: index + 1, // 1-based line numbers
          line: line.trim()
        });
      }
    });

    return matches;
  }

  /**
   * Format search results for display
   */
  private formatSearchResults(
    matches: GrepMatch[],
    pattern: string,
    searchPath: string,
    includePattern?: string,
    fileCount?: number
  ): string {
    if (matches.length === 0) {
      let message = `No matches found for pattern "${pattern}" in ${searchPath}`;
      if (includePattern) {
        message += ` (filter: "${includePattern}")`;
      }
      if (fileCount !== undefined) {
        message += ` across ${fileCount} file(s)`;
      }
      return message;
    }

    // Group matches by file
    const matchesByFile = this.groupMatchesByFile(matches);
    
    let result = `Found ${matches.length} match(es) for pattern "${pattern}" in ${searchPath}`;
    if (includePattern) {
      result += ` (filter: "${includePattern}")`;
    }
    if (fileCount !== undefined) {
      result += ` across ${fileCount} file(s)`;
    }
    result += ':\n\n';

    // Format each file's matches
    for (const [filePath, fileMatches] of Object.entries(matchesByFile)) {
      result += `**${filePath}**\n`;
      fileMatches.forEach(match => {
        result += `  L${match.lineNumber}: ${match.line}\n`;
      });
      result += '\n';
    }

    return result.trim();
  }

  /**
   * Group matches by file path
   */
  private groupMatchesByFile(matches: GrepMatch[]): Record<string, GrepMatch[]> {
    const grouped: Record<string, GrepMatch[]> = {};
    
    matches.forEach(match => {
      if (!grouped[match.filePath]) {
        grouped[match.filePath] = [];
      }
      grouped[match.filePath].push(match);
    });

    // Sort matches within each file by line number
    Object.values(grouped).forEach(fileMatches => {
      fileMatches.sort((a, b) => a.lineNumber - b.lineNumber);
    });

    return grouped;
  }

  /**
   * Grep operations are never destructive
   */
  protected isDestructiveOperation(params: GrepParams): boolean {
    return false;
  }
}