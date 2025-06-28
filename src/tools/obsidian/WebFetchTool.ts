/**
 * WebFetchTool for Obsius - Web Content Fetching and Processing
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This tool fetches web content and processes it for knowledge management.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, WebFetchParams } from '../../utils/types';
import { z } from 'zod';

/**
 * Schema for web fetch parameters
 */
const WebFetchParamsSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  prompt: z.string().optional(),
  timeout: z.number().min(1000).max(30000).optional().default(10000)
});

/**
 * Helper function to extract URLs from text
 */
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Convert HTML to clean text
 */
function htmlToText(html: string): string {
  // Basic HTML to text conversion
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * WebFetchTool - Fetch and process web content
 * 
 * Features:
 * - URL content fetching with timeout
 * - HTML to text conversion
 * - Content length limits for performance
 * - GitHub blob URL conversion
 * - Error handling and fallback
 */
export class WebFetchTool extends BaseTool<WebFetchParams> {
  
  private static readonly MAX_CONTENT_LENGTH = 100000;
  private static readonly DEFAULT_TIMEOUT = 10000;
  
  get name(): string {
    return 'web_fetch';
  }

  get description(): string {
    return 'Fetch and process web content from URLs for knowledge management and research';
  }

  get parameterSchema(): z.ZodSchema<WebFetchParams> {
    return WebFetchParamsSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  /**
   * Convert GitHub blob URLs to raw URLs
   */
  private convertGitHubUrl(url: string): string {
    if (url.includes('github.com') && url.includes('/blob/')) {
      return url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }
    return url;
  }

  /**
   * Fetch URL content with timeout
   */
  private async fetchUrl(url: string, timeout: number): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Obsius-AI-Agent/1.0 (Obsidian Plugin)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Process fetched content
   */
  private processContent(content: string, url: string): string {
    // Convert HTML to text
    const textContent = htmlToText(content);
    
    // Limit content length
    const limitedContent = textContent.length > WebFetchTool.MAX_CONTENT_LENGTH
      ? textContent.substring(0, WebFetchTool.MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to length limit]'
      : textContent;

    return limitedContent;
  }

  /**
   * Execute web fetch with proper error handling
   */
  protected async executeInternal(params: WebFetchParams): Promise<ToolResult> {
    try {
      const url = this.convertGitHubUrl(params.url);
      const timeout = params.timeout || WebFetchTool.DEFAULT_TIMEOUT;

      // Fetch content
      const rawContent = await this.fetchUrl(url, timeout);
      const processedContent = this.processContent(rawContent, url);

      // Extract metadata
      const titleMatch = rawContent.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? htmlToText(titleMatch[1]) : 'Untitled';

      const contentPreview = processedContent.substring(0, 200) + 
        (processedContent.length > 200 ? '...' : '');

      return {
        success: true,
        message: `Successfully fetched content from ${url}`,
        data: {
          url: params.url,
          resolvedUrl: url,
          title,
          content: processedContent,
          contentLength: processedContent.length,
          preview: contentPreview,
          fetchedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return this.createErrorResult(
        `Failed to fetch web content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Unknown web fetch error')
      );
    }
  }

  /**
   * Validate URL accessibility (basic check)
   */
  private validateUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return 'Only HTTP and HTTPS URLs are supported';
      }

      // Basic security checks
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
        return 'Local URLs are not allowed for security reasons';
      }

      return null;
    } catch {
      return 'Invalid URL format';
    }
  }
}