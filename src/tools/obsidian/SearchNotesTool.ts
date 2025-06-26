/**
 * Tool for searching notes in the Obsidian vault
 */

import { z } from 'zod';
import { TFile } from 'obsidian';
import { BaseTool } from '../BaseTool';
import { SearchNotesParams, ToolResult, SearchResult, SearchMatch } from '../../utils/types';

/**
 * Zod schema for search notes parameters
 */
const SearchNotesSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .describe('The search query string'),
  
  searchType: z.enum(['content', 'title', 'tags', 'all'])
    .default('all')
    .describe('Type of search to perform'),
  
  limit: z.number()
    .int()
    .positive()
    .default(20)
    .describe('Maximum number of results to return'),
  
  folder: z.string()
    .optional()
    .describe('Limit search to specific folder'),
  
  includeSnippets: z.boolean()
    .default(true)
    .describe('Include content snippets in results')
});

/**
 * Tool for searching notes in Obsidian
 */
export class SearchNotesTool extends BaseTool<SearchNotesParams> {
  get name(): string {
    return 'search_notes';
  }

  get description(): string {
    return 'Search for notes in the Obsidian vault by content, title, or tags';
  }

  get parameterSchema(): z.ZodSchema<SearchNotesParams> {
    return SearchNotesSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  protected async executeInternal(params: SearchNotesParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // 1. Get files to search
      const files = this.getFilesToSearch(params.folder);
      
      if (files.length === 0) {
        return this.createSuccessResult(
          'No files found to search',
          { results: [], totalFiles: 0 }
        );
      }

      // 2. Perform the search
      const searchResults = await this.performSearch(files, params);

      // 3. Sort by relevance score
      searchResults.sort((a, b) => (b.score || 0) - (a.score || 0));

      // 4. Apply limit
      const limitedResults = searchResults.slice(0, params.limit);

      return this.createSuccessResult(
        `Found ${limitedResults.length} results for "${params.query}"`,
        {
          results: limitedResults,
          totalFiles: files.length,
          totalMatches: searchResults.length,
          query: params.query,
          searchType: params.searchType
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Search failed for "${params.query}": ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Get files to search based on folder filter
   */
  private getFilesToSearch(folder?: string): TFile[] {
    let files = this.app.vault.getMarkdownFiles();

    if (folder) {
      const folderPath = folder.endsWith('/') ? folder : folder + '/';
      files = files.filter(file => file.path.startsWith(folderPath));
    }

    return files;
  }

  /**
   * Perform the actual search across files
   */
  private async performSearch(files: TFile[], params: SearchNotesParams): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = params.query.toLowerCase();

    for (const file of files) {
      try {
        let score = 0;
        let matches: SearchMatch[] = [];
        let snippet = '';

        // Search based on type
        switch (params.searchType) {
          case 'title':
            ({ score, matches } = this.searchInTitle(file, queryLower));
            break;
          
          case 'content':
            const content = await this.app.vault.read(file);
            ({ score, matches, snippet } = this.searchInContent(content, queryLower, params.includeSnippets || false));
            break;
          
          case 'tags':
            const tagsContent = await this.app.vault.read(file);
            ({ score, matches } = this.searchInTags(tagsContent, queryLower));
            break;
          
          case 'all':
          default:
            const fullContent = await this.app.vault.read(file);
            const titleResult = this.searchInTitle(file, queryLower);
            const contentResult = this.searchInContent(fullContent, queryLower, params.includeSnippets || false);
            const tagsResult = this.searchInTags(fullContent, queryLower);
            
            score = titleResult.score + contentResult.score + tagsResult.score;
            matches = [...titleResult.matches, ...contentResult.matches, ...tagsResult.matches];
            snippet = contentResult.snippet;
            break;
        }

        // Add to results if matches found
        if (score > 0) {
          results.push({
            title: file.basename,
            path: file.path,
            snippet: snippet || undefined,
            score,
            matches: matches.length > 0 ? matches : undefined
          });
        }

      } catch (error) {
        console.warn(`Failed to search in file ${file.path}:`, error);
      }
    }

    return results;
  }

  /**
   * Search in note title
   */
  private searchInTitle(file: TFile, query: string): { score: number; matches: SearchMatch[] } {
    const title = file.basename.toLowerCase();
    const matches: SearchMatch[] = [];
    let score = 0;

    // Exact match gets highest score
    if (title === query) {
      score = 100;
      matches.push({
        line: 0,
        column: 0,
        text: file.basename,
        context: file.basename
      });
    }
    // Starts with query gets high score
    else if (title.startsWith(query)) {
      score = 80;
      matches.push({
        line: 0,
        column: 0,
        text: file.basename,
        context: file.basename
      });
    }
    // Contains query gets medium score
    else if (title.includes(query)) {
      score = 50;
      const index = title.indexOf(query);
      matches.push({
        line: 0,
        column: index,
        text: file.basename,
        context: file.basename
      });
    }

    return { score, matches };
  }

  /**
   * Search in note content
   */
  private searchInContent(
    content: string, 
    query: string, 
    includeSnippets: boolean
  ): { score: number; matches: SearchMatch[]; snippet: string } {
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];
    let score = 0;
    let snippet = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      if (lineLower.includes(query)) {
        const index = lineLower.indexOf(query);
        
        matches.push({
          line: i + 1,
          column: index,
          text: line,
          context: this.getLineContext(lines, i)
        });

        // Score based on match quality
        if (lineLower === query) {
          score += 20; // Exact line match
        } else if (lineLower.trim().startsWith(query)) {
          score += 15; // Line starts with query
        } else {
          score += 10; // Line contains query
        }

        // Use first match for snippet
        if (!snippet && includeSnippets) {
          snippet = this.extractSnippet(lines, i, query);
        }
      }
    }

    return { score, matches, snippet };
  }

  /**
   * Search in tags (frontmatter and inline)
   */
  private searchInTags(content: string, query: string): { score: number; matches: SearchMatch[] } {
    const matches: SearchMatch[] = [];
    let score = 0;

    // Search in frontmatter tags
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const tagMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
      if (tagMatch) {
        const tags = tagMatch[1].toLowerCase();
        if (tags.includes(query)) {
          score += 30;
          matches.push({
            line: 2, // Approximate line in frontmatter
            column: 0,
            text: `tags: [${tagMatch[1]}]`,
            context: 'frontmatter'
          });
        }
      }
    }

    // Search in inline tags
    const inlineTagRegex = new RegExp(`#${query}\\b`, 'gi');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const matches_on_line = lines[i].match(inlineTagRegex);
      if (matches_on_line) {
        score += matches_on_line.length * 20;
        matches.push({
          line: i + 1,
          column: lines[i].indexOf('#' + query),
          text: lines[i],
          context: this.getLineContext(lines, i)
        });
      }
    }

    return { score, matches };
  }

  /**
   * Get context around a line
   */
  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract snippet around search match
   */
  private extractSnippet(lines: string[], matchLineIndex: number, query: string): string {
    const contextLines = 2;
    const start = Math.max(0, matchLineIndex - contextLines);
    const end = Math.min(lines.length, matchLineIndex + contextLines + 1);
    
    const snippet = lines.slice(start, end).join('\n');
    
    // Truncate if too long
    if (snippet.length > 200) {
      const queryIndex = snippet.toLowerCase().indexOf(query.toLowerCase());
      if (queryIndex >= 0) {
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(snippet.length, queryIndex + query.length + 50);
        return '...' + snippet.substring(start, end) + '...';
      }
      return snippet.substring(0, 200) + '...';
    }
    
    return snippet;
  }

  /**
   * Search operations are never destructive
   */
  protected isDestructiveOperation(params: SearchNotesParams): boolean {
    return false;
  }
}