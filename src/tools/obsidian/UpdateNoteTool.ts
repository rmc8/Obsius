/**
 * Tool for updating existing notes in the Obsidian vault
 */

import { z } from 'zod';
import { TFile } from 'obsidian';
import { BaseTool } from '../BaseTool';
import { UpdateNoteParams, ToolResult } from '../../utils/types';

/**
 * Zod schema for update note parameters
 */
const UpdateNoteSchema = z.object({
  path: z.string()
    .optional()
    .describe('Exact path to the note file'),
  
  title: z.string()
    .optional()
    .describe('Note title for lookup (alternative to path)'),
  
  operation: z.enum(['replace', 'append', 'prepend', 'insert', 'section_replace'])
    .describe('Type of update operation to perform'),
  
  content: z.string()
    .min(1, 'Content cannot be empty')
    .describe('New content to add or replace'),
  
  section: z.string()
    .optional()
    .describe('Section name for section operations'),
  
  position: z.number()
    .int()
    .min(0)
    .optional()
    .describe('Line position for insert operations'),
  
  backup: z.boolean()
    .default(true)
    .describe('Create backup before updating')
}).refine(
  data => data.path || data.title,
  {
    message: "Either 'path' or 'title' must be provided",
    path: ['path']
  }
).refine(
  data => {
    if (data.operation === 'insert' && data.position === undefined) {
      return false;
    }
    if (data.operation === 'section_replace' && !data.section) {
      return false;
    }
    return true;
  },
  {
    message: "Insert operations require 'position', section_replace requires 'section'",
    path: ['position']
  }
);

/**
 * Tool for updating notes in Obsidian
 */
export class UpdateNoteTool extends BaseTool<UpdateNoteParams> {
  get name(): string {
    return 'update_note';
  }

  get description(): string {
    return 'Update the content of an existing note in the Obsidian vault';
  }

  get parameterSchema(): z.ZodSchema<UpdateNoteParams> {
    return UpdateNoteSchema;
  }

  get riskLevel() {
    return 'medium' as const;
  }

  protected async executeInternal(params: UpdateNoteParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // 1. Resolve the note file
      const file = await this.resolveNoteFile(params);
      if (!file) {
        const identifier = params.path || params.title || 'unknown';
        return this.createErrorResult(
          `Note not found: ${identifier}`,
          new Error('File not found')
        );
      }

      // 2. Read current content
      const originalContent = await this.app.vault.read(file);

      // 3. Create backup if requested
      if (params.backup) {
        await this.createBackup(file, originalContent);
      }

      // 4. Generate new content based on operation
      const newContent = this.generateNewContent(originalContent, params);

      // 5. Write updated content
      await this.app.vault.modify(file, newContent);

      // 6. Calculate changes
      const changes = this.calculateChanges(originalContent, newContent);

      return this.createSuccessResult(
        `Successfully updated note "${file.basename}"`,
        {
          path: file.path,
          title: file.basename,
          operation: params.operation,
          originalSize: originalContent.length,
          newSize: newContent.length,
          changes,
          backupCreated: params.backup
        }
      );

    } catch (error) {
      const identifier = params.path || params.title || 'unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to update note "${identifier}": ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Resolve note file from path or title
   */
  private async resolveNoteFile(params: UpdateNoteParams): Promise<TFile | null> {
    // If path is provided, use it directly
    if (params.path) {
      const file = this.app.vault.getAbstractFileByPath(params.path);
      return file instanceof TFile ? file : null;
    }

    // If title is provided, search for it
    if (params.title) {
      return this.findNoteByTitle(params.title);
    }

    return null;
  }

  /**
   * Find note by title (case-insensitive)
   */
  private findNoteByTitle(title: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();
    
    // First try exact match
    for (const file of files) {
      if (file.basename === title) {
        return file;
      }
    }

    // Then try case-insensitive match
    const titleLower = title.toLowerCase();
    for (const file of files) {
      if (file.basename.toLowerCase() === titleLower) {
        return file;
      }
    }

    return null;
  }

  /**
   * Create backup of the original content
   */
  private async createBackup(file: TFile, content: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${file.basename}_backup_${timestamp}.md`;
      const backupPath = file.parent ? `${file.parent.path}/${backupName}` : backupName;
      
      await this.app.vault.create(backupPath, content);
    } catch (error) {
      console.warn('Failed to create backup:', error);
      // Don't fail the entire operation if backup fails
    }
  }

  /**
   * Generate new content based on the operation type
   */
  private generateNewContent(originalContent: string, params: UpdateNoteParams): string {
    switch (params.operation) {
      case 'replace':
        return params.content;
      
      case 'append':
        return originalContent + '\n\n' + params.content;
      
      case 'prepend':
        return params.content + '\n\n' + originalContent;
      
      case 'insert':
        return this.insertAtPosition(originalContent, params.content, params.position!);
      
      case 'section_replace':
        return this.replaceSectionContent(originalContent, params.section!, params.content);
      
      default:
        throw new Error(`Unknown operation: ${params.operation}`);
    }
  }

  /**
   * Insert content at specific line position
   */
  private insertAtPosition(originalContent: string, newContent: string, position: number): string {
    const lines = originalContent.split('\n');
    
    // Ensure position is valid
    const insertIndex = Math.min(Math.max(0, position), lines.length);
    
    // Insert new content
    lines.splice(insertIndex, 0, newContent);
    
    return lines.join('\n');
  }

  /**
   * Replace content of a specific section
   */
  private replaceSectionContent(originalContent: string, sectionName: string, newContent: string): string {
    const lines = originalContent.split('\n');
    const sectionPattern = new RegExp(`^#+\\s+${sectionName}\\s*$`, 'i');
    
    let sectionStartIndex = -1;
    let sectionEndIndex = lines.length;
    let sectionLevel = 0;

    // Find section start
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (sectionPattern.test(line)) {
        sectionStartIndex = i;
        sectionLevel = this.getHeaderLevel(line);
        break;
      }
    }

    if (sectionStartIndex === -1) {
      // Section not found, append at end
      return originalContent + '\n\n## ' + sectionName + '\n\n' + newContent;
    }

    // Find section end (next header of same or higher level)
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^#+/)) {
        const currentLevel = this.getHeaderLevel(line);
        if (currentLevel <= sectionLevel) {
          sectionEndIndex = i;
          break;
        }
      }
    }

    // Replace section content
    const before = lines.slice(0, sectionStartIndex + 1);
    const after = lines.slice(sectionEndIndex);
    
    return [...before, '', newContent, ''].concat(after).join('\n');
  }

  /**
   * Get header level from a header line
   */
  private getHeaderLevel(line: string): number {
    const match = line.match(/^(#+)/);
    return match ? match[1].length : 0;
  }

  /**
   * Calculate changes between original and new content
   */
  private calculateChanges(originalContent: string, newContent: string): {
    linesAdded: number;
    linesRemoved: number;
    charactersAdded: number;
    charactersRemoved: number;
  } {
    const originalLines = originalContent.split('\n');
    const newLines = newContent.split('\n');
    
    const linesAdded = Math.max(0, newLines.length - originalLines.length);
    const linesRemoved = Math.max(0, originalLines.length - newLines.length);
    const charactersAdded = Math.max(0, newContent.length - originalContent.length);
    const charactersRemoved = Math.max(0, originalContent.length - newContent.length);

    return {
      linesAdded,
      linesRemoved,
      charactersAdded,
      charactersRemoved
    };
  }

  /**
   * Update operations are generally destructive
   */
  protected isDestructiveOperation(params: UpdateNoteParams): boolean {
    // Replace operations are always destructive
    if (params.operation === 'replace' || params.operation === 'section_replace') {
      return true;
    }
    
    // Large content additions might be considered destructive
    if (params.content.length > 1000) {
      return true;
    }
    
    return false;
  }
}