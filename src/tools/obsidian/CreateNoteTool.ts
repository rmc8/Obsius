/**
 * Tool for creating new notes in the Obsidian vault
 */

import { z } from 'zod';
import { TFile } from 'obsidian';
import { BaseTool } from '../BaseTool';
import { CreateNoteParams, ToolResult } from '../../utils/types';

/**
 * Zod schema for create note parameters
 */
const CreateNoteSchema = z.object({
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title too long'),
  
  content: z.string()
    .optional()
    .default(''),
  
  folder: z.string()
    .optional()
    .describe('Folder path where the note should be created'),
  
  tags: z.array(z.string())
    .optional()
    .describe('Tags to add to the note'),
  
  template: z.string()
    .optional()
    .describe('Template name to apply to the note'),
  
  frontmatter: z.record(z.any())
    .optional()
    .describe('Additional frontmatter properties')
});

/**
 * Tool for creating new notes in Obsidian
 */
export class CreateNoteTool extends BaseTool<CreateNoteParams> {
  get name(): string {
    return 'create_note';
  }

  get description(): string {
    return 'Create a new note in the Obsidian vault with specified title and content';
  }

  get parameterSchema(): z.ZodSchema<CreateNoteParams> {
    return CreateNoteSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: CreateNoteParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // 1. Generate the file path
      const filePath = await this.generateFilePath(params.title, params.folder);
      
      // 2. Check if file already exists
      if (this.app.vault.getAbstractFileByPath(filePath)) {
        return this.createErrorResult(
          `Note "${params.title}" already exists at ${filePath}`,
          new Error('File already exists')
        );
      }

      // 3. Generate the note content
      const noteContent = await this.generateNoteContent(params);

      // 4. Create the note
      const file = await this.app.vault.create(filePath, noteContent);

      // 5. Return success result
      return this.createSuccessResult(
        `Created note "${params.title}" successfully`,
        {
          path: file.path,
          title: params.title,
          size: noteContent.length,
          created: new Date().toISOString()
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to create note "${params.title}": ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Generate appropriate file path for the note
   */
  private async generateFilePath(title: string, folder?: string): Promise<string> {
    // Sanitize the title for use as filename
    const sanitizedTitle = this.sanitizeFileName(title);
    
    // Ensure .md extension
    const fileName = sanitizedTitle.endsWith('.md') ? sanitizedTitle : `${sanitizedTitle}.md`;

    // Handle folder path
    if (folder) {
      // Ensure folder exists
      await this.ensureFolderExists(folder);
      return `${folder}/${fileName}`;
    }

    return fileName;
  }

  /**
   * Sanitize title for use as filename
   */
  private sanitizeFileName(title: string): string {
    // Remove or replace invalid filename characters
    return title
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim()                         // Remove leading/trailing whitespace
      .substring(0, 200);             // Limit length
  }

  /**
   * Ensure the target folder exists, creating it if necessary
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      try {
        await this.app.vault.createFolder(folderPath);
      } catch (error) {
        // Folder might already exist or be created by another process
        console.warn(`Could not create folder ${folderPath}:`, error);
      }
    }
  }

  /**
   * Generate the complete note content including frontmatter
   */
  private async generateNoteContent(params: CreateNoteParams): Promise<string> {
    const parts: string[] = [];

    // Check if content already contains frontmatter to avoid duplication
    const contentHasFrontmatter = params.content && 
      params.content.trim().startsWith('---') && 
      params.content.includes('\n---\n');

    // 1. Generate frontmatter only if content doesn't already have it
    if (!contentHasFrontmatter) {
      const frontmatter = this.generateFrontmatter(params);
      if (frontmatter) {
        parts.push(frontmatter);
      }
    }

    // 2. Add main content
    if (params.content && params.content.length > 0) {
      parts.push(params.content);
    }

    // 3. Apply template if specified
    if (params.template) {
      const templateContent = await this.applyTemplate(params.template, params);
      if (templateContent) {
        parts.push(templateContent);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Generate frontmatter for the note
   */
  private generateFrontmatter(params: CreateNoteParams): string | null {
    const frontmatterData: Record<string, any> = {};

    // Add creation timestamp
    frontmatterData.created = new Date().toISOString();

    // Add tags if specified
    if (params.tags && params.tags.length > 0) {
      frontmatterData.tags = params.tags;
    }

    // Add custom frontmatter properties
    if (params.frontmatter) {
      Object.assign(frontmatterData, params.frontmatter);
    }

    // Return null if no frontmatter to add
    if (Object.keys(frontmatterData).length === 0) {
      return null;
    }

    // Generate YAML frontmatter
    const frontmatterEntries = Object.entries(frontmatterData)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          const items = value.map(item => `  - ${item}`).join('\n');
          return `${key}:\n${items}`;
        }
        if (typeof value === 'object' && value !== null) {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    return `---\n${frontmatterEntries}\n---`;
  }

  /**
   * Apply a template to the note content
   */
  private async applyTemplate(templateName: string, params: CreateNoteParams): Promise<string | null> {
    try {
      // Look for template file in common locations
      const templatePaths = [
        `Templates/${templateName}.md`,
        `templates/${templateName}.md`,
        `${templateName}.md`
      ];

      let templateFile: TFile | null = null;
      for (const path of templatePaths) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          templateFile = file;
          break;
        }
      }

      if (!templateFile) {
        console.warn(`Template "${templateName}" not found`);
        return null;
      }

      // Read template content
      let templateContent = await this.app.vault.read(templateFile);

      // Simple template variable substitution
      templateContent = templateContent
        .replace(/{{title}}/g, params.title)
        .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
        .replace(/{{time}}/g, new Date().toLocaleTimeString());

      return templateContent;

    } catch (error) {
      console.warn(`Failed to apply template "${templateName}":`, error);
      return null;
    }
  }

  /**
   * Check if this operation is destructive
   * For create operations, this is generally false unless overwriting
   */
  protected isDestructiveOperation(params: CreateNoteParams): boolean {
    // Creating a new note is generally not destructive
    // unless it would overwrite an existing file
    const filePath = params.folder 
      ? `${params.folder}/${this.sanitizeFileName(params.title)}.md`
      : `${this.sanitizeFileName(params.title)}.md`;
    
    return !!this.app.vault.getAbstractFileByPath(filePath);
  }
}