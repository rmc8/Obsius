/**
 * ProjectExplorerTool for Obsius - Comprehensive Project Discovery
 * Adapted from gemini-cli's file discovery and folder structure patterns
 * 
 * This tool provides aggressive project exploration to ensure actual file reading
 * rather than AI assumptions, addressing the core issue of tool execution enforcement.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, ProjectExplorerParams } from '../../utils/types';
import { z } from 'zod';
import { TFile, TFolder } from 'obsidian';
import * as path from 'path';
import { GitIgnoreParser } from '../../utils/gitIgnoreParser';

/**
 * Schema for project explorer parameters
 */
const ProjectExplorerParamsSchema = z.object({
  directory: z.string()
    .default('.')
    .describe('Directory to explore (relative to vault root, defaults to vault root)'),
  
  maxItems: z.number()
    .min(50)
    .max(1000)
    .default(1000)
    .describe('Maximum number of items to process (50-1000, default: 1000)'),
  
  includeFileContent: z.boolean()
    .default(false)
    .describe('Whether to include file content preview (increases output size)'),
  
  fileTypes: z.array(z.string())
    .optional()
    .describe('File extensions to focus on (e.g., ["md", "ts", "js"])'),
  
  respectGitIgnore: z.boolean()
    .default(true)
    .describe('Whether to respect .gitignore patterns'),
  
  maxDepth: z.number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum directory depth to explore (1-10, default: 5)'),
  
  maxDirs: z.number()
    .min(10)
    .max(500)
    .optional()
    .describe('Maximum number of directories to scan (10-500, helps with performance on large projects)'),
  
  includeKeyFiles: z.boolean()
    .default(false)
    .describe('Whether to include content sampling from key project files (README, config files) for enhanced analysis')
});

/**
 * Represents file metadata with optional content
 */
interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  modifiedTime?: Date;
  extension?: string;
  content?: string;
  truncated?: boolean;
}

/**
 * Represents folder structure node
 */
interface FolderNode {
  name: string;
  path: string;
  relativePath: string;
  files: FileInfo[];
  subFolders: FolderNode[];
  totalChildren: number;
  hasMoreFiles?: boolean;
  hasMoreSubfolders?: boolean;
  isIgnored?: boolean;
}

/**
 * ProjectExplorerTool - Comprehensive project discovery and analysis
 * 
 * Features:
 * - BFS-based folder traversal with configurable limits
 * - Gitignore pattern respect
 * - File type filtering
 * - Optional content preview
 * - Structured output for AI analysis
 * - Aggressive exploration to ensure actual execution
 */
export class ProjectExplorerTool extends BaseTool<ProjectExplorerParams> {
  
  private static readonly TRUNCATION_INDICATOR = '...';
  private static readonly DEFAULT_IGNORED_FOLDERS = new Set([
    'node_modules', '.git', '.obsidian', 'dist', 'build', '.next', '.vscode'
  ]);
  
  private static readonly PREVIEW_CHAR_LIMIT = 500;
  private gitIgnoreParser: GitIgnoreParser;
  
  get name(): string {
    return 'project_explorer';
  }

  get description(): string {
    return 'Comprehensively explore and analyze project structure with file discovery, content preview, and structured output for AI analysis. Based on gemini-cli patterns with aggressive exploration to ensure actual tool execution.';
  }

  get parameterSchema(): z.ZodSchema<ProjectExplorerParams> {
    return ProjectExplorerParamsSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  /**
   * Get vault filesystem path
   */
  private getVaultPath(): string {
    return (this.app.vault.adapter as any).path || '';
  }

  /**
   * Check if path is within vault boundary
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
   * Check if file should be ignored based on gitignore patterns
   */
  private shouldIgnoreFile(filePath: string): boolean {
    if (this.gitIgnoreParser) {
      return this.gitIgnoreParser.isIgnored(filePath);
    }
    
    // Fallback to simple pattern matching if no parser available
    const commonIgnorePatterns = [
      '.git', 'node_modules', '.obsidian', '.DS_Store', 'Thumbs.db',
      '*.tmp', '*.log', '*.swp', '*.cache', 'dist', 'build', '.next'
    ];

    return commonIgnorePatterns.some(pattern => {
      if (pattern.startsWith('*')) {
        return filePath.endsWith(pattern.slice(1));
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Check if folder should be ignored
   */
  private shouldIgnoreFolder(folderName: string): boolean {
    return ProjectExplorerTool.DEFAULT_IGNORED_FOLDERS.has(folderName);
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return ext.startsWith('.') ? ext.slice(1) : ext;
  }

  /**
   * Check if file matches requested file types
   */
  private matchesFileTypes(filename: string, fileTypes?: string[]): boolean {
    if (!fileTypes || fileTypes.length === 0) {
      return true;
    }
    
    const extension = this.getFileExtension(filename);
    return fileTypes.some(type => type.toLowerCase() === extension);
  }

  /**
   * Read file content preview if requested
   */
  private async getFileContentPreview(file: TFile): Promise<{ content: string; truncated: boolean }> {
    try {
      const fullContent = await this.app.vault.read(file);
      
      if (fullContent.length <= ProjectExplorerTool.PREVIEW_CHAR_LIMIT) {
        return { content: fullContent, truncated: false };
      }
      
      return {
        content: fullContent.substring(0, ProjectExplorerTool.PREVIEW_CHAR_LIMIT),
        truncated: true
      };
    } catch (error) {
      return { content: `[Error reading file: ${error}]`, truncated: false };
    }
  }

  /**
   * Process a single file into FileInfo
   */
  private async processFile(
    file: TFile, 
    vaultPath: string, 
    includeContent: boolean,
    fileTypes?: string[]
  ): Promise<FileInfo | null> {
    const relativePath = file.path;
    const filename = file.name;
    
    // Check file type filter
    if (!this.matchesFileTypes(filename, fileTypes)) {
      return null;
    }
    
    // Check gitignore patterns (enhanced with real .gitignore parsing)
    if (this.shouldIgnoreFile(relativePath)) {
      return null;
    }
    
    const fileInfo: FileInfo = {
      name: filename,
      path: file.path,
      relativePath,
      isDirectory: false,
      size: file.stat.size,
      modifiedTime: new Date(file.stat.mtime),
      extension: this.getFileExtension(filename)
    };
    
    if (includeContent) {
      const preview = await this.getFileContentPreview(file);
      fileInfo.content = preview.content;
      fileInfo.truncated = preview.truncated;
    }
    
    return fileInfo;
  }

  /**
   * Build folder structure using BFS traversal
   */
  private async buildFolderStructure(
    startFolder: TFolder,
    params: ProjectExplorerParams,
    vaultPath: string
  ): Promise<{ rootNode: FolderNode; scannedDirCount: number }> {
    const rootNode: FolderNode = {
      name: startFolder.name || 'vault-root',
      path: startFolder.path,
      relativePath: startFolder.path,
      files: [],
      subFolders: [],
      totalChildren: 0
    };

    const queue: Array<{ node: FolderNode; folder: TFolder; depth: number }> = [
      { node: rootNode, folder: startFolder, depth: 0 }
    ];
    
    let currentItemCount = 0;
    let scannedDirCount = 0;
    const maxDirs = params.maxDirs || Infinity;
    const processedPaths = new Set<string>();

    while (queue.length > 0 && scannedDirCount < maxDirs) {
      const { node, folder, depth } = queue.shift()!;
      
      if (processedPaths.has(folder.path) || depth >= (params.maxDepth || 5)) {
        continue;
      }
      
      processedPaths.add(folder.path);
      scannedDirCount++;
      
      if (currentItemCount >= (params.maxItems || 1000)) {
        continue;
      }

      try {
        // Process files in current folder
        for (const child of folder.children) {
          if (currentItemCount >= (params.maxItems || 1000)) {
            node.hasMoreFiles = true;
            break;
          }

          if (child instanceof TFile) {
            const fileInfo = await this.processFile(
              child, 
              vaultPath, 
              params.includeFileContent || false,
              params.fileTypes
            );
            
            if (fileInfo) {
              node.files.push(fileInfo);
              node.totalChildren++;
              currentItemCount++;
            }
          }
        }

        // Process subfolders
        for (const child of folder.children) {
          if (currentItemCount >= (params.maxItems || 1000)) {
            node.hasMoreSubfolders = true;
            break;
          }

          if (child instanceof TFolder) {
            const folderName = child.name;
            
            if (this.shouldIgnoreFolder(folderName)) {
              const ignoredNode: FolderNode = {
                name: folderName,
                path: child.path,
                relativePath: child.path,
                files: [],
                subFolders: [],
                totalChildren: 0,
                isIgnored: true
              };
              node.subFolders.push(ignoredNode);
              node.totalChildren++;
              currentItemCount++;
              continue;
            }

            const subNode: FolderNode = {
              name: folderName,
              path: child.path,
              relativePath: child.path,
              files: [],
              subFolders: [],
              totalChildren: 0
            };

            node.subFolders.push(subNode);
            node.totalChildren++;
            currentItemCount++;

            // Queue for processing if not at max depth
            if (depth + 1 < (params.maxDepth || 5)) {
              queue.push({ node: subNode, folder: child, depth: depth + 1 });
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not process folder ${folder.path}:`, error);
      }
    }

    return { rootNode, scannedDirCount };
  }

  /**
   * Format folder structure as tree string
   */
  private formatFolderStructure(node: FolderNode, indent = '', isLast = true, isRoot = true): string {
    const lines: string[] = [];
    
    if (!isRoot || node.isIgnored) {
      const connector = isLast ? '└───' : '├───';
      const suffix = node.isIgnored ? ProjectExplorerTool.TRUNCATION_INDICATOR : '';
      lines.push(`${indent}${connector}${node.name}/${suffix}`);
    }
    
    const childIndent = isRoot ? '' : indent + (isLast ? '    ' : '│   ');
    
    // Add files
    const fileCount = node.files.length;
    for (let i = 0; i < fileCount; i++) {
      const file = node.files[i];
      const isLastFile = i === fileCount - 1 && node.subFolders.length === 0 && !node.hasMoreSubfolders;
      const fileConnector = isLastFile ? '└───' : '├───';
      lines.push(`${childIndent}${fileConnector}${file.name}`);
    }
    
    if (node.hasMoreFiles) {
      const isLastIndicator = node.subFolders.length === 0 && !node.hasMoreSubfolders;
      const fileConnector = isLastIndicator ? '└───' : '├───';
      lines.push(`${childIndent}${fileConnector}${ProjectExplorerTool.TRUNCATION_INDICATOR}`);
    }
    
    // Add subfolders
    const subFolderCount = node.subFolders.length;
    for (let i = 0; i < subFolderCount; i++) {
      const isLastSubfolder = i === subFolderCount - 1 && !node.hasMoreSubfolders;
      lines.push(this.formatFolderStructure(node.subFolders[i], childIndent, isLastSubfolder, false));
    }
    
    if (node.hasMoreSubfolders) {
      lines.push(`${childIndent}└───${ProjectExplorerTool.TRUNCATION_INDICATOR}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Identify and sample key project files for enhanced analysis
   */
  private async sampleKeyProjectFiles(rootNode: FolderNode): Promise<string> {
    const keyFileSamples: string[] = [];
    
    // Key files to prioritize for sampling (based on gemini-cli patterns)
    const keyFilePatterns = [
      { pattern: /^README\.(md|txt)$/i, priority: 1, description: 'Project Documentation' },
      { pattern: /^package\.json$/i, priority: 2, description: 'Node.js Dependencies' },
      { pattern: /^tsconfig\.json$/i, priority: 3, description: 'TypeScript Configuration' },
      { pattern: /^\.gitignore$/i, priority: 4, description: 'Git Exclusions' },
      { pattern: /^(webpack|vite|rollup)\.config\.(js|ts|mjs)$/i, priority: 5, description: 'Build Configuration' },
      { pattern: /^manifest\.json$/i, priority: 6, description: 'Application Manifest' },
      { pattern: /^CLAUDE\.md$/i, priority: 7, description: 'AI Context Instructions' },
      { pattern: /^GEMINI\.md$/i, priority: 8, description: 'AI Context Instructions' }
    ];

    const foundKeyFiles: Array<{ file: FileInfo; priority: number; description: string }> = [];

    // Recursively find key files
    const searchForKeyFiles = (node: FolderNode) => {
      for (const file of node.files) {
        for (const { pattern, priority, description } of keyFilePatterns) {
          if (pattern.test(file.name)) {
            foundKeyFiles.push({ file, priority, description });
          }
        }
      }
      
      for (const subNode of node.subFolders) {
        if (!subNode.isIgnored) {
          searchForKeyFiles(subNode);
        }
      }
    };

    searchForKeyFiles(rootNode);

    // Sort by priority and sample content
    foundKeyFiles.sort((a, b) => a.priority - b.priority);

    for (const { file, description } of foundKeyFiles.slice(0, 5)) { // Limit to top 5 key files
      try {
        const tFile = this.app.vault.getAbstractFileByPath(file.relativePath);
        if (tFile instanceof TFile) {
          const content = await this.app.vault.read(tFile);
          
          // Sample first 500 characters for analysis
          const sample = content.length > 500 ? content.substring(0, 500) + '...' : content;
          
          keyFileSamples.push(`### ${description}: ${file.name}\n\`\`\`\n${sample}\n\`\`\``);
        }
      } catch (error) {
        console.warn(`Could not read key file ${file.relativePath}:`, error);
      }
    }

    return keyFileSamples.length > 0 
      ? `\n\n📄 KEY FILE CONTENT SAMPLES:\n═══════════════════════════════\n\n${keyFileSamples.join('\n\n')}`
      : '';
  }

  /**
   * Generate comprehensive project analysis summary
   */
  private generateAnalysisSummary(rootNode: FolderNode, params: ProjectExplorerParams, scannedDirCount?: number): string {
    const summary: string[] = [];
    
    // Count statistics
    let totalFiles = 0;
    let totalFolders = 0;
    const fileExtensions = new Map<string, number>();
    
    const countItems = (node: FolderNode) => {
      totalFolders++;
      totalFiles += node.files.length;
      
      node.files.forEach(file => {
        if (file.extension) {
          fileExtensions.set(file.extension, (fileExtensions.get(file.extension) || 0) + 1);
        }
      });
      
      node.subFolders.forEach(countItems);
    };
    
    countItems(rootNode);
    
    summary.push(`📊 PROJECT ANALYSIS SUMMARY`);
    summary.push(`════════════════════════════`);
    summary.push(`📁 Total Folders: ${totalFolders}`);
    summary.push(`📄 Total Files: ${totalFiles}`);
    summary.push(`🎯 Search Directory: ${params.directory}`);
    summary.push(`📏 Max Items Limit: ${params.maxItems}`);
    summary.push(`🔍 Max Depth: ${params.maxDepth}`);
    
    if (scannedDirCount !== undefined) {
      summary.push(`📊 Directories Scanned: ${scannedDirCount}${params.maxDirs ? ` / ${params.maxDirs}` : ''}`);
    }
    
    if (fileExtensions.size > 0) {
      summary.push(`\n📋 FILE TYPE BREAKDOWN:`);
      const sortedExtensions = Array.from(fileExtensions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      sortedExtensions.forEach(([ext, count]) => {
        summary.push(`   .${ext}: ${count} files`);
      });
    }
    
    return summary.join('\n');
  }

  /**
   * Execute comprehensive project exploration
   */
  protected async executeInternal(params: ProjectExplorerParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Initialize gitignore parser
      this.gitIgnoreParser = new GitIgnoreParser(this.app);
      if (params.respectGitIgnore !== false) {
        await this.gitIgnoreParser.loadGitIgnoreFile();
        this.gitIgnoreParser.addDefaultPatterns();
      }
      
      const vaultPath = this.getVaultPath();
      let targetFolder: TFolder;
      
      // Resolve target directory
      const directory = params.directory || '.';
      if (directory === '.' || directory === '' || directory === '/') {
        targetFolder = this.app.vault.getRoot();
      } else {
        const cleanPath = directory.replace(/^\/+/, '').replace(/\/+$/, '');
        const abstractFile = this.app.vault.getAbstractFileByPath(cleanPath);
        
        if (!(abstractFile instanceof TFolder)) {
          return this.createErrorResult(
            `Directory not found or is not a folder: ${directory}`,
            new Error('Invalid directory path')
          );
        }
        
        targetFolder = abstractFile;
      }

      // Build comprehensive folder structure
      const { rootNode, scannedDirCount } = await this.buildFolderStructure(targetFolder, params, vaultPath);
      
      // Generate formatted tree structure
      const treeStructure = this.formatFolderStructure(rootNode);
      
      // Generate analysis summary
      const analysisSummary = this.generateAnalysisSummary(rootNode, params, scannedDirCount);
      
      // Generate key file samples if requested
      const keyFileSamples = params.includeKeyFiles ? await this.sampleKeyProjectFiles(rootNode) : '';
      
      // Build final output
      const output: string[] = [];
      output.push(analysisSummary);
      output.push(`\n🌳 FOLDER STRUCTURE:`);
      output.push(`══════════════════════`);
      output.push(treeStructure);
      
      // Add key file samples if available
      if (keyFileSamples) {
        output.push(keyFileSamples);
      }
      
      if (params.includeFileContent) {
        output.push(`\n📄 FILE CONTENT PREVIEWS:`);
        output.push(`═══════════════════════════`);
        
        const addFileContent = (node: FolderNode, depth = 0) => {
          node.files.forEach(file => {
            if (file.content) {
              output.push(`\n--- ${file.relativePath} ---`);
              output.push(file.content);
              if (file.truncated) {
                output.push(`[Content truncated at ${ProjectExplorerTool.PREVIEW_CHAR_LIMIT} characters]`);
              }
            }
          });
          
          node.subFolders.forEach(subNode => addFileContent(subNode, depth + 1));
        };
        
        addFileContent(rootNode);
      }
      
      const message = `Project exploration completed: analyzed ${rootNode.totalChildren} items in "${params.directory}"`;
      
      return this.createSuccessResult(
        message,
        {
          structure: output.join('\n'),
          rootNode,
          totalItems: rootNode.totalChildren,
          directory: params.directory,
          parameters: params
        }
      );

    } catch (error) {
      return this.createErrorResult(
        `Project exploration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Project exploration error')
      );
    }
  }

  /**
   * Project exploration is never destructive
   */
  protected isDestructiveOperation(params: ProjectExplorerParams): boolean {
    return false;
  }
}