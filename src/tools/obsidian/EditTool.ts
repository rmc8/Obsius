/**
 * EditTool for Obsius - Precise String Replacement
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This tool performs precise text replacement operations on files.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, EditParams } from '../../utils/types';
import { z } from 'zod';
import { TFile } from 'obsidian';

/**
 * Schema for edit parameters
 */
const EditParamsSchema = z.object({
  file_path: z.string()
    .min(1, 'File path cannot be empty')
    .describe('Path to the file to modify (relative to vault root)'),
  
  old_string: z.string()
    .describe('The exact text to replace (empty string for new file creation)'),
  
  new_string: z.string()
    .describe('The text to replace old_string with'),
  
  expected_replacements: z.number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe('Number of replacements expected (defaults to 1)')
});

/**
 * EditTool - Precise string replacement for files
 * 
 * Features:
 * - Exact string matching and replacement
 * - Multiple occurrence replacement support
 * - New file creation (when old_string is empty)
 * - Vault-scoped file operations
 * - Safety checks and validation
 */
export class EditTool extends BaseTool<EditParams> {
  
  get name(): string {
    return 'edit';
  }

  get description(): string {
    return 'Replace exact text strings in files with precise control. Supports multiple replacements and new file creation.';
  }

  get parameterSchema(): z.ZodSchema<EditParams> {
    return EditParamsSchema;
  }

  get riskLevel() {
    return 'medium' as const;
  }

  /**
   * Validate file path is within vault and safe
   */
  private validateFilePath(filePath: string): string | null {
    // Check for absolute paths
    if (filePath.startsWith('/') || filePath.includes('..') || filePath.startsWith('\\')) {
      return 'File path must be relative to vault root and cannot contain ".." or be absolute';
    }
    
    // Check for suspicious paths
    if (filePath.includes('node_modules') || filePath.includes('.git')) {
      return `Access to '${filePath}' is restricted for security reasons`;
    }
    
    return null;
  }

  /**
   * Calculate edit result without applying changes
   */
  private async calculateEdit(params: EditParams): Promise<{
    currentContent: string | null;
    newContent: string;
    occurrences: number;
    isNewFile: boolean;
    error?: string;
  }> {
    const file = this.app.vault.getAbstractFileByPath(params.file_path);
    let currentContent: string | null = null;
    let isNewFile = false;
    
    // Handle file existence
    if (!file) {
      if (params.old_string === '') {
        // Creating new file
        isNewFile = true;
      } else {
        return {
          currentContent: null,
          newContent: '',
          occurrences: 0,
          isNewFile: false,
          error: 'File not found. Use empty old_string to create new file.'
        };
      }
    } else if (!(file instanceof TFile)) {
      return {
        currentContent: null,
        newContent: '',
        occurrences: 0,
        isNewFile: false,
        error: 'Path refers to a folder, not a file'
      };
    } else {
      // Read existing file
      currentContent = await this.app.vault.read(file);
      
      if (params.old_string === '') {
        return {
          currentContent,
          newContent: '',
          occurrences: 0,
          isNewFile: false,
          error: 'Cannot create file that already exists. Use non-empty old_string to edit existing file.'
        };
      }
    }

    // Calculate replacements
    let newContent: string;
    let occurrences: number;
    
    if (isNewFile) {
      newContent = params.new_string;
      occurrences = 1;
    } else if (currentContent !== null) {
      // Count occurrences
      if (params.old_string === '') {
        occurrences = 0;
      } else {
        const regex = new RegExp(this.escapeRegExp(params.old_string), 'g');
        const matches = currentContent.match(regex);
        occurrences = matches ? matches.length : 0;
      }
      
      // Check expected replacements
      if (occurrences !== params.expected_replacements) {
        return {
          currentContent,
          newContent: currentContent,
          occurrences,
          isNewFile: false,
          error: `Expected ${params.expected_replacements} occurrence(s) but found ${occurrences}`
        };
      }
      
      // Perform replacement
      newContent = currentContent.split(params.old_string).join(params.new_string);
    } else {
      return {
        currentContent: null,
        newContent: '',
        occurrences: 0,
        isNewFile: false,
        error: 'Failed to read file content'
      };
    }

    return {
      currentContent,
      newContent,
      occurrences,
      isNewFile
    };
  }

  /**
   * Escape string for regex
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Execute edit operation with proper error handling
   */
  protected async executeInternal(params: EditParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Validate file path
      const pathValidationError = this.validateFilePath(params.file_path);
      if (pathValidationError) {
        return this.createErrorResult(
          pathValidationError,
          new Error(pathValidationError)
        );
      }

      // Calculate edit
      const editResult = await this.calculateEdit(params);
      
      if (editResult.error) {
        return this.createErrorResult(
          editResult.error,
          new Error(editResult.error)
        );
      }

      // Apply edit
      if (editResult.isNewFile) {
        // Create new file
        await this.app.vault.create(params.file_path, editResult.newContent);
        
        return {
          success: true,
          message: `Created new file: ${params.file_path}`,
          data: {
            filePath: params.file_path,
            operation: 'create',
            newSize: editResult.newContent.length,
            replacements: 0
          }
        };
      } else {
        // Modify existing file
        const file = this.app.vault.getAbstractFileByPath(params.file_path) as TFile;
        await this.app.vault.modify(file, editResult.newContent);
        
        const sizeDiff = editResult.newContent.length - (editResult.currentContent?.length || 0);
        
        return {
          success: true,
          message: `Successfully edited ${params.file_path} (${editResult.occurrences} replacement(s))`,
          data: {
            filePath: params.file_path,
            operation: 'edit',
            originalSize: editResult.currentContent?.length || 0,
            newSize: editResult.newContent.length,
            sizeDiff,
            replacements: editResult.occurrences,
            oldString: params.old_string.length > 50 
              ? params.old_string.substring(0, 50) + '...'
              : params.old_string,
            newString: params.new_string.length > 50
              ? params.new_string.substring(0, 50) + '...'
              : params.new_string
          }
        };
      }

    } catch (error) {
      return this.createErrorResult(
        `Edit operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Unknown edit error')
      );
    }
  }

  /**
   * Edit operations are generally destructive
   */
  protected isDestructiveOperation(params: EditParams): boolean {
    // File replacement or large changes are destructive
    if (params.old_string === '' || params.old_string.length > 100 || params.new_string.length > 1000) {
      return true;
    }
    
    // Multiple replacements might be destructive
    if (params.expected_replacements && params.expected_replacements > 1) {
      return true;
    }
    
    return false;
  }
}