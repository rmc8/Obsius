/**
 * ReadManyFilesTool for Obsius - Batch File Reading
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This tool reads multiple files efficiently for analysis and processing.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, ReadManyFilesParams } from '../../utils/types';
import { z } from 'zod';
import { TFile } from 'obsidian';

/**
 * Schema for read many files parameters
 */
const ReadManyFilesParamsSchema = z.object({
  paths: z.array(z.string())
    .min(1, 'At least one file path must be specified')
    .describe('Array of file paths relative to vault root to read'),
  
  charactersToRead: z.number()
    .min(1)
    .optional()
    .describe('Limit characters read per file (optional)'),
  
  totalCharacterLimit: z.number()
    .min(1000)
    .max(500000)
    .optional()
    .default(150000)
    .describe('Total character limit across all files (default: 150,000)')
});

/**
 * Result for a single file read operation
 */
interface FileReadResult {
  path: string;
  success: boolean;
  content?: string;
  error?: string;
  size?: number;
  truncated?: boolean;
}

/**
 * ReadManyFilesTool - Read multiple files efficiently
 * 
 * Features:
 * - Batch file reading with path validation
 * - Per-file and total character limits
 * - Vault-scoped file access only
 * - Error handling per file
 * - Content truncation with clear indicators
 */
export class ReadManyFilesTool extends BaseTool<ReadManyFilesParams> {
  
  private static readonly DEFAULT_TOTAL_LIMIT = 150000;
  
  get name(): string {
    return 'read_many_files';
  }

  get description(): string {
    return 'Read multiple files from the vault for batch analysis and processing';
  }

  get parameterSchema(): z.ZodSchema<ReadManyFilesParams> {
    return ReadManyFilesParamsSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  /**
   * Validate file paths are within vault and not absolute
   */
  private validatePaths(paths: string[]): string | null {
    for (const filePath of paths) {
      // Check for absolute paths
      if (filePath.startsWith('/') || filePath.includes('..') || filePath.startsWith('\\')) {
        return `File path '${filePath}' must be relative to vault root and cannot contain '..' or be absolute`;
      }
      
      // Check for suspicious paths
      if (filePath.includes('node_modules') || filePath.includes('.git')) {
        return `Access to '${filePath}' is restricted for security reasons`;
      }
    }
    
    return null;
  }

  /**
   * Read a single file with error handling
   */
  private async readSingleFile(
    path: string, 
    charactersToRead?: number,
    remainingCharacters?: number
  ): Promise<FileReadResult> {
    try {
      // Get file from vault
      const file = this.app.vault.getAbstractFileByPath(path);
      
      if (!file) {
        return {
          path,
          success: false,
          error: 'File not found in vault'
        };
      }
      
      if (!(file instanceof TFile)) {
        return {
          path,
          success: false,
          error: 'Path refers to a folder, not a file'
        };
      }
      
      // Read file content
      let content = await this.app.vault.read(file);
      let truncated = false;
      
      // Apply per-file character limit
      if (charactersToRead && charactersToRead > 0 && content.length > charactersToRead) {
        content = content.substring(0, charactersToRead);
        truncated = true;
      }
      
      // Apply remaining total character limit
      if (remainingCharacters && content.length > remainingCharacters) {
        content = content.substring(0, remainingCharacters);
        truncated = true;
      }
      
      return {
        path,
        success: true,
        content,
        size: content.length,
        truncated
      };
      
    } catch (error) {
      return {
        path,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file'
      };
    }
  }

  /**
   * Execute batch file reading with proper error handling
   */
  protected async executeInternal(params: ReadManyFilesParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Validate paths
      const pathValidationError = this.validatePaths(params.paths);
      if (pathValidationError) {
        return this.createErrorResult(
          pathValidationError,
          new Error(pathValidationError)
        );
      }

      const totalCharacterLimit = params.totalCharacterLimit || ReadManyFilesTool.DEFAULT_TOTAL_LIMIT;
      let cumulativeLength = 0;
      const results: FileReadResult[] = [];
      const fileContents: string[] = [];
      
      // Process each file
      for (const filePath of params.paths) {
        const remainingCharacters = totalCharacterLimit - cumulativeLength;
        
        if (remainingCharacters <= 0) {
          fileContents.push(
            `\n[Total character limit of ${totalCharacterLimit} reached. Remaining files not read.]\n`
          );
          break;
        }
        
        const result = await this.readSingleFile(
          filePath,
          params.charactersToRead,
          remainingCharacters
        );
        
        results.push(result);
        
        if (result.success && result.content) {
          const header = `--- ${result.path} ---\n`;
          const footer = result.truncated ? '\n[File content truncated]\n' : '\n';
          const fileOutput = header + result.content + footer;
          
          fileContents.push(fileOutput);
          cumulativeLength += result.size || 0;
          
          // If this file used up remaining characters, break
          if (result.size && result.size >= remainingCharacters) {
            break;
          }
        } else if (!result.success) {
          fileContents.push(`--- ${result.path} ---\nError: ${result.error}\n`);
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      return {
        success: true,
        message: `Read ${successCount} file(s) successfully, ${errorCount} error(s), ${cumulativeLength} total characters`,
        data: {
          results,
          totalFiles: params.paths.length,
          successfulReads: successCount,
          errors: errorCount,
          totalCharacters: cumulativeLength,
          characterLimit: totalCharacterLimit,
          content: fileContents.join('')
        }
      };

    } catch (error) {
      return this.createErrorResult(
        `Batch file reading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Unknown batch read error')
      );
    }
  }
}