/**
 * Tool for reading notes from the Obsidian vault
 */

import { z } from 'zod';
import { TFile } from 'obsidian';
import { BaseTool } from '../BaseTool';
import { ReadNoteParams, ToolResult } from '../../utils/types';

/**
 * Zod schema for read note parameters
 */
const ReadNoteSchema = z.object({
  path: z.string()
    .optional()
    .describe('Exact path to the note file'),
  
  title: z.string()
    .optional()
    .describe('Note title for lookup (alternative to path)'),
  
  includeMetadata: z.boolean()
    .default(true)
    .describe('Include file metadata in the response')
}).refine(
  data => data.path || data.title,
  {
    message: "Either 'path' or 'title' must be provided",
    path: ['path']
  }
);

/**
 * Tool for reading notes from Obsidian
 */
export class ReadNoteTool extends BaseTool<ReadNoteParams> {
  get name(): string {
    return 'read_note';
  }

  get description(): string {
    return 'Read the content of an existing note in the Obsidian vault';
  }

  get parameterSchema(): z.ZodSchema<ReadNoteParams> {
    return ReadNoteSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: ReadNoteParams): Promise<ToolResult> {
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

      // 2. Read the note content
      const content = await this.app.vault.read(file);

      // 3. Parse frontmatter if present
      const { frontmatter, body } = this.parseFrontmatter(content);

      // 4. Prepare response data
      const responseData: any = {
        path: file.path,
        title: file.basename,
        content: body,
        fullContent: content,
        size: content.length
      };

      // 5. Add metadata if requested
      if (params.includeMetadata) {
        responseData.metadata = {
          frontmatter,
          stat: file.stat,
          extension: file.extension,
          folder: file.parent?.path || '',
          tags: this.extractTags(frontmatter, body),
          links: this.extractLinks(body),
          wordCount: this.countWords(body),
          lineCount: body.split('\n').length
        };
      }

      return this.createSuccessResult(
        `Successfully read note "${file.basename}"`,
        responseData
      );

    } catch (error) {
      const identifier = params.path || params.title || 'unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to read note "${identifier}": ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Resolve note file from path or title
   */
  private async resolveNoteFile(params: ReadNoteParams): Promise<TFile | null> {
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

    // Finally try partial match
    for (const file of files) {
      if (file.basename.toLowerCase().includes(titleLower)) {
        return file;
      }
    }

    return null;
  }

  /**
   * Parse frontmatter from note content
   */
  private parseFrontmatter(content: string): { frontmatter: Record<string, any> | null; body: string } {
    // Check if content starts with frontmatter
    if (!content.startsWith('---\n')) {
      return { frontmatter: null, body: content };
    }

    // Find the end of frontmatter
    const endIndex = content.indexOf('\n---\n', 4);
    if (endIndex === -1) {
      return { frontmatter: null, body: content };
    }

    try {
      // Extract frontmatter YAML
      const frontmatterText = content.substring(4, endIndex);
      const body = content.substring(endIndex + 5);

      // Parse YAML frontmatter (simplified parsing)
      const frontmatter = this.parseSimpleYAML(frontmatterText);

      return { frontmatter, body };
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      return { frontmatter: null, body: content };
    }
  }

  /**
   * Simple YAML parser for frontmatter
   */
  private parseSimpleYAML(yamlText: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yamlText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      // Handle different value types
      if (value.startsWith('[') && value.endsWith(']')) {
        // Array value
        const arrayContent = value.slice(1, -1);
        result[key] = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
      } else if (value === 'true' || value === 'false') {
        // Boolean value
        result[key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        // Numeric value
        result[key] = Number(value);
      } else {
        // String value
        result[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return result;
  }

  /**
   * Extract tags from frontmatter and content
   */
  private extractTags(frontmatter: Record<string, any> | null, content: string): string[] {
    const tags = new Set<string>();

    // Tags from frontmatter
    if (frontmatter?.tags) {
      const frontmatterTags = Array.isArray(frontmatter.tags) 
        ? frontmatter.tags 
        : [frontmatter.tags];
      frontmatterTags.forEach(tag => tags.add(tag.toString()));
    }

    // Inline tags from content
    const inlineTagRegex = /#([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = inlineTagRegex.exec(content)) !== null) {
      tags.add(match[1]);
    }

    return Array.from(tags);
  }

  /**
   * Extract internal links from content
   */
  private extractLinks(content: string): string[] {
    const links = new Set<string>();

    // Wikilinks [[...]]
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikilinkRegex.exec(content)) !== null) {
      links.add(match[1]);
    }

    // Markdown links [text](path)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      if (!match[2].startsWith('http')) {
        links.add(match[2]);
      }
    }

    return Array.from(links);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    // Remove markdown formatting and count words
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '')        // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/[#*_~`]/g, '')        // Remove formatting characters
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();

    return cleanText ? cleanText.split(' ').length : 0;
  }

  /**
   * Read operations are never destructive
   */
  protected isDestructiveOperation(params: ReadNoteParams): boolean {
    return false;
  }
}