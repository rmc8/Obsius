/**
 * Deep Content Discovery Node - Comprehensive folder structure and Markdown content analysis
 * Uses Glob + ReadManyFiles for deep vault understanding beyond sampling
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { AnalysisNode, AnalysisData, AnalysisProgress } from './VaultAnalysisWorkflow';

/**
 * Folder content summary for structured analysis
 */
export interface FolderContentSummary {
  folderPath: string;
  totalMarkdownFiles: number;
  representativeFiles: string[];
  contentTypes: string[];
  averageFileSize: number;
  lastModified: number;
  organizationPattern: string;
}

/**
 * Deep content analysis result
 */
export interface DeepContentAnalysis {
  folderSummaries: FolderContentSummary[];
  globalPatterns: {
    documentTypes: Map<string, number>;
    contentCategories: Map<string, string[]>;
    linkNetworks: Map<string, string[]>;
    projectStructure: string[];
  };
  readFiles: {
    path: string;
    content: string;
    analysis: string;
  }[];
}

/**
 * Deep Content Discovery Node - Comprehensive vault exploration
 * 
 * Features:
 * - Complete .md file discovery via Glob
 * - Strategic file sampling per folder
 * - Batch content reading via ReadManyFiles
 * - Folder structure semantic analysis
 * - Project-specific pattern recognition
 */
export class DeepContentDiscoveryNode extends AnalysisNode {
  get name(): string { return "🔍 Deep Content Discovery"; }
  get description(): string { return "Comprehensive folder structure and content analysis using Glob + ReadManyFiles"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Starting deep content discovery...",
      "Using Glob and ReadManyFiles for comprehensive vault exploration",
      [],
      this.getPhaseNumber()
    );

    await this.think(1000);

    try {
      // Phase 1: Discover all Markdown files using Glob
      const allMarkdownFiles = await this.discoverAllMarkdownFiles();
      
      this.reportProgress(
        "Analyzing folder structure...",
        `Discovered ${allMarkdownFiles.length} Markdown files across the vault`,
        [`📄 ${allMarkdownFiles.length} .md files found`],
        this.getPhaseNumber()
      );

      await this.think(800);

      // Phase 2: Organize files by folder and select representatives
      const folderAnalysis = await this.analyzeFolderStructure(allMarkdownFiles);
      
      this.reportProgress(
        "Selecting representative files...",
        "Choosing strategic files from each folder for deep content analysis",
        [
          `📁 ${folderAnalysis.folderSummaries.length} folders analyzed`,
          `🎯 ${this.countSelectedFiles(folderAnalysis)} files selected for reading`
        ],
        this.getPhaseNumber()
      );

      await this.think(1200);

      // Phase 3: Read selected files in batch
      const contentAnalysis = await this.performDeepContentReading(folderAnalysis);
      
      this.reportProgress(
        "Deep content analysis complete",
        "Successfully analyzed folder structure and representative content",
        [
          `📖 ${contentAnalysis.readFiles.length} files read and analyzed`,
          `🏗️ ${contentAnalysis.globalPatterns.projectStructure.length} structural patterns identified`,
          `📋 ${contentAnalysis.globalPatterns.documentTypes.size} document types discovered`
        ],
        this.getPhaseNumber(),
        true
      );

      // Integrate deep analysis into main analysis data
      data = this.integrateDeepAnalysis(data, contentAnalysis);

      return data;

    } catch (error) {
      console.error('Deep content discovery failed:', error);
      throw new Error(`Deep content discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Discover all Markdown files using Glob tool
   */
  private async discoverAllMarkdownFiles(): Promise<string[]> {
    const globResult = await this.toolRegistry.executeTool('glob', {
      pattern: '**/*.md',
      path: '.',
      case_sensitive: false,
      respect_git_ignore: true
    });

    if (!globResult.success || !globResult.data?.files) {
      throw new Error(`Glob discovery failed: ${globResult.error || 'No files found'}`);
    }

    // Handle various return formats from GlobTool
    const files = globResult.data.files;
    if (!Array.isArray(files)) {
      throw new Error('Glob tool returned invalid files format (not an array)');
    }

    const stringPaths: string[] = [];
    for (const file of files) {
      let pathString: string;
      
      if (typeof file === 'string') {
        pathString = file;
      } else if (file && typeof file === 'object') {
        // Handle object format with fullpath() method or path property
        if (typeof file.fullpath === 'function') {
          pathString = file.fullpath();
        } else if (file.path && typeof file.path === 'string') {
          pathString = file.path;
        } else if (file.fullpath && typeof file.fullpath === 'string') {
          pathString = file.fullpath;
        } else {
          console.warn('Skipping file with unexpected format:', file);
          continue;
        }
      } else {
        console.warn('Skipping file with unexpected format:', file);
        continue;
      }

      // Ensure the path ends with .md
      if (pathString && pathString.endsWith('.md')) {
        stringPaths.push(pathString);
      }
    }

    return stringPaths;
  }

  /**
   * Analyze folder structure and select representative files
   */
  private async analyzeFolderStructure(markdownFiles: string[]): Promise<DeepContentAnalysis> {
    const folderMap = new Map<string, string[]>();
    
    // Group files by folder
    for (const filePath of markdownFiles) {
      const folderPath = this.extractFolderPath(filePath);
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, []);
      }
      folderMap.get(folderPath)!.push(filePath);
    }

    const folderSummaries: FolderContentSummary[] = [];
    
    // Analyze each folder and select representative files
    for (const [folderPath, files] of folderMap.entries()) {
      const summary = await this.createFolderSummary(folderPath, files);
      folderSummaries.push(summary);
    }

    return {
      folderSummaries,
      globalPatterns: {
        documentTypes: new Map(),
        contentCategories: new Map(),
        linkNetworks: new Map(),
        projectStructure: []
      },
      readFiles: []
    };
  }

  /**
   * Create folder summary with representative file selection
   */
  private async createFolderSummary(folderPath: string, files: string[]): Promise<FolderContentSummary> {
    // Strategic file selection: README, index, recent files, diverse names
    const representativeFiles = this.selectRepresentativeFiles(files, folderPath);
    
    // Analyze folder characteristics
    const organizationPattern = this.detectFolderOrganizationPattern(folderPath, files);
    const contentTypes = this.inferContentTypes(folderPath, files);

    return {
      folderPath,
      totalMarkdownFiles: files.length,
      representativeFiles,
      contentTypes,
      averageFileSize: 0, // Will be calculated after reading
      lastModified: Date.now(),
      organizationPattern
    };
  }

  /**
   * Select representative files from a folder for content analysis
   */
  private selectRepresentativeFiles(files: string[], folderPath: string): string[] {
    const selected: string[] = [];
    const maxFilesPerFolder = this.calculateMaxFilesPerFolder(files.length);

    // Priority 1: Index and README files
    const indexFiles = files.filter(f => 
      /\b(readme|index|home|main)\b/i.test(this.extractFileName(f))
    );
    selected.push(...indexFiles.slice(0, 1));

    // Priority 2: Recent or large files (approximation)
    const otherFiles = files.filter(f => !selected.includes(f));
    const sortedFiles = otherFiles.sort((a, b) => {
      // Heuristic: longer names often indicate more comprehensive content
      const aScore = this.calculateFileImportanceScore(a, folderPath);
      const bScore = this.calculateFileImportanceScore(b, folderPath);
      return bScore - aScore;
    });

    // Add remaining files up to limit
    const remainingSlots = Math.max(0, maxFilesPerFolder - selected.length);
    selected.push(...sortedFiles.slice(0, remainingSlots));

    return selected;
  }

  /**
   * Calculate file importance score for selection
   */
  private calculateFileImportanceScore(filePath: string, folderPath: string): number {
    const fileName = this.extractFileName(filePath);
    let score = 0;

    // Bonus for comprehensive names
    if (fileName.length > 10) score += 2;
    
    // Bonus for documentation patterns
    if (/\b(guide|tutorial|spec|api|architecture|design)\b/i.test(fileName)) score += 3;
    
    // Bonus for folder-specific patterns
    if (folderPath.includes('docs') && /\b(intro|overview|getting-started)\b/i.test(fileName)) score += 3;
    
    // Bonus for technical content indicators
    if (/\b(implementation|code|example|demo)\b/i.test(fileName)) score += 2;

    return score;
  }

  /**
   * Perform deep content reading using ReadManyFiles
   */
  private async performDeepContentReading(folderAnalysis: DeepContentAnalysis): Promise<DeepContentAnalysis> {
    // Collect all selected files
    const allSelectedFiles: string[] = [];
    for (const folder of folderAnalysis.folderSummaries) {
      // Ensure each file path is a string
      for (const file of folder.representativeFiles) {
        if (typeof file === 'string') {
          allSelectedFiles.push(file);
        } else {
          console.warn('Skipping non-string file path in representative files:', file, 'Type:', typeof file);
        }
      }
    }

    if (allSelectedFiles.length === 0) {
      console.warn('No files selected for deep content reading');
      return folderAnalysis;
    }

    // Debug logging: verify all paths are strings
    console.log('🔍 DeepContentDiscovery: Selected files for reading:', allSelectedFiles.length);
    console.log('🔍 First few paths:', allSelectedFiles.slice(0, 3));
    
    // Final validation: ensure all items are strings
    const validatedPaths: string[] = [];
    for (let i = 0; i < allSelectedFiles.length; i++) {
      const path = allSelectedFiles[i];
      if (typeof path === 'string' && path.length > 0) {
        validatedPaths.push(path);
      } else {
        console.error(`❌ Invalid path at index ${i}:`, path, 'Type:', typeof path);
      }
    }

    if (validatedPaths.length === 0) {
      console.error('❌ No valid file paths found after validation');
      return folderAnalysis;
    }

    console.log(`✅ Validated ${validatedPaths.length} file paths for ReadManyFiles`);

    // Ensure 100% string array with defensive conversion
    const safeStringPaths = this.ensureStringArray(validatedPaths);
    console.log(`🔒 Final parameter safety check: ${safeStringPaths.length} string paths`);
    console.log(`🔍 Sample paths:`, safeStringPaths.slice(0, 2));

    // Read files in batch using ReadManyFiles tool
    const readResult = await this.toolRegistry.executeTool('read_many_files', {
      paths: safeStringPaths,
      totalCharacterLimit: 150000, // Stay within limits
      charactersToRead: Math.floor(150000 / safeStringPaths.length) // Distribute evenly
    });

    if (!readResult.success || !readResult.data?.results) {
      console.warn('Batch file reading failed:', readResult.error);
      return folderAnalysis;
    }

    // Process read results
    const readFiles: { path: string; content: string; analysis: string; }[] = [];
    const globalPatterns = {
      documentTypes: new Map<string, number>(),
      contentCategories: new Map<string, string[]>(),
      linkNetworks: new Map<string, string[]>(),
      projectStructure: [] as string[]
    };

    for (const result of readResult.data.results) {
      if (result.success && result.content) {
        const analysis = this.analyzeFileContent(result.path, result.content);
        readFiles.push({
          path: result.path,
          content: result.content,
          analysis
        });

        // Update global patterns
        this.updateGlobalPatterns(globalPatterns, result.path, result.content, analysis);
      }
    }

    return {
      ...folderAnalysis,
      globalPatterns,
      readFiles
    };
  }

  /**
   * Analyze individual file content
   */
  private analyzeFileContent(filePath: string, content: string): string {
    const analyses: string[] = [];

    // Document type analysis
    if (content.includes('```') || content.includes('`')) {
      analyses.push('Contains code blocks or inline code');
    }
    
    if (content.match(/^#+\s/m)) {
      analyses.push('Well-structured with headers');
    }

    if (content.includes('- [ ]') || content.includes('- [x]')) {
      analyses.push('Contains task lists');
    }

    if (content.match(/\[\[.*?\]\]/)) {
      analyses.push('Contains internal links');
    }

    if (content.match(/https?:\/\//)) {
      analyses.push('Contains external links');
    }

    // Content sophistication
    if (content.length > 2000) {
      analyses.push('Comprehensive content');
    } else if (content.length > 500) {
      analyses.push('Moderate content');
    } else {
      analyses.push('Brief content');
    }

    return analyses.join('; ');
  }

  /**
   * Update global patterns from file analysis
   */
  private updateGlobalPatterns(
    patterns: DeepContentAnalysis['globalPatterns'], 
    filePath: string, 
    content: string, 
    analysis: string
  ): void {
    // Document type classification
    const docType = this.classifyDocumentType(filePath, content);
    patterns.documentTypes.set(docType, (patterns.documentTypes.get(docType) || 0) + 1);

    // Content category
    const category = this.extractFolderPath(filePath);
    if (!patterns.contentCategories.has(category)) {
      patterns.contentCategories.set(category, []);
    }
    patterns.contentCategories.get(category)!.push(this.extractFileName(filePath));

    // Project structure insights
    if (filePath.includes('README') || filePath.includes('index')) {
      patterns.projectStructure.push(`${category}: Primary documentation`);
    }
  }

  /**
   * Classify document type based on content and path
   */
  private classifyDocumentType(filePath: string, content: string): string {
    const fileName = this.extractFileName(filePath).toLowerCase();
    const folderPath = this.extractFolderPath(filePath);

    // Technical documentation
    if (folderPath.includes('docs') || folderPath.includes('documentation')) {
      if (fileName.includes('api')) return 'API Documentation';
      if (fileName.includes('guide') || fileName.includes('tutorial')) return 'Guide/Tutorial';
      if (fileName.includes('spec') || fileName.includes('specification')) return 'Specification';
      return 'Technical Documentation';
    }

    // Code-related
    if (content.includes('```typescript') || content.includes('```javascript')) {
      return 'Code Documentation';
    }

    // Architecture/Design
    if (fileName.includes('architecture') || fileName.includes('design')) {
      return 'Architecture/Design';
    }

    // Project management
    if (fileName.includes('readme') || fileName.includes('todo') || fileName.includes('changelog')) {
      return 'Project Management';
    }

    return 'General Content';
  }

  /**
   * Utility methods
   */
  private extractFolderPath(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : '.';
  }

  private extractFileName(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    const nameWithExt = lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
    return nameWithExt.replace(/\.md$/, '');
  }

  private calculateMaxFilesPerFolder(folderSize: number): number {
    // Dynamic calculation: 2-4 files per folder based on size
    if (folderSize <= 3) return Math.min(2, folderSize);
    if (folderSize <= 10) return 3;
    return 4;
  }

  private detectFolderOrganizationPattern(folderPath: string, files: string[]): string {
    const folderName = folderPath.split('/').pop()?.toLowerCase() || '';
    
    if (folderName.includes('docs') || folderName.includes('documentation')) {
      return 'Documentation-focused';
    }
    if (folderName.includes('src') || folderName.includes('source')) {
      return 'Source-code documentation';
    }
    if (folderName.includes('api') || folderName.includes('spec')) {
      return 'API/Specification';
    }
    if (folderName.includes('guide') || folderName.includes('tutorial')) {
      return 'Educational content';
    }
    if (files.some(f => f.includes('README'))) {
      return 'Project structure';
    }
    
    return 'General organization';
  }

  private inferContentTypes(folderPath: string, files: string[]): string[] {
    const types: string[] = [];
    
    if (files.some(f => /readme/i.test(f))) types.push('Documentation');
    if (files.some(f => /api|spec/i.test(f))) types.push('Specifications');
    if (files.some(f => /guide|tutorial/i.test(f))) types.push('Guides');
    if (files.some(f => /example|demo/i.test(f))) types.push('Examples');
    if (files.some(f => /changelog|history/i.test(f))) types.push('Change logs');
    
    return types.length > 0 ? types : ['General content'];
  }

  private countSelectedFiles(analysis: DeepContentAnalysis): number {
    return analysis.folderSummaries.reduce((count, folder) => 
      count + folder.representativeFiles.length, 0
    );
  }

  private getPhaseNumber(): number {
    return 2; // Position in workflow
  }

  /**
   * Integrate deep analysis results into main analysis data
   */
  private integrateDeepAnalysis(data: AnalysisData, deepAnalysis: DeepContentAnalysis): AnalysisData {
    // Store deep content analysis data for other nodes to use
    data.deepContent = {
      folderSummaries: deepAnalysis.folderSummaries,
      globalPatterns: deepAnalysis.globalPatterns,
      readFiles: deepAnalysis.readFiles,
      documentTypes: deepAnalysis.globalPatterns.documentTypes,
      contentCategories: deepAnalysis.globalPatterns.contentCategories
    };

    // Add folder structure insights
    data.insights.organizationPrinciples.push(
      ...deepAnalysis.folderSummaries.map(f => f.organizationPattern)
    );

    // Add document type diversity
    data.insights.primaryDomains.push(
      ...Array.from(deepAnalysis.globalPatterns.documentTypes.keys())
    );

    // Update content patterns with deep insights
    deepAnalysis.globalPatterns.contentCategories.forEach((files, category) => {
      data.contentPatterns.tagCategories.set(category, files.length);
    });

    // Add project structure patterns
    data.insights.workflowPatterns.push(
      ...deepAnalysis.globalPatterns.projectStructure
    );

    return data;
  }

  /**
   * Ensure array contains only strings, converting objects safely
   */
  private ensureStringArray(input: any[]): string[] {
    const result: string[] = [];
    
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      
      if (typeof item === 'string') {
        result.push(item);
      } else if (item && typeof item === 'object') {
        // Handle various object formats that might contain paths
        let pathString: string | null = null;
        
        if (typeof item.fullpath === 'function') {
          pathString = item.fullpath();
        } else if (item.path && typeof item.path === 'string') {
          pathString = item.path;
        } else if (item.fullpath && typeof item.fullpath === 'string') {
          pathString = item.fullpath;
        } else if (item.toString && typeof item.toString === 'function') {
          pathString = item.toString();
        } else {
          pathString = String(item);
        }
        
        if (pathString && pathString.length > 0) {
          result.push(pathString);
          console.log(`🔄 Converted object to string at index ${i}:`, pathString);
        } else {
          console.warn(`⚠️ Failed to convert object to string at index ${i}:`, item);
        }
      } else {
        console.warn(`⚠️ Skipping non-string, non-object item at index ${i}:`, item, 'Type:', typeof item);
      }
    }
    
    return result;
  }
}