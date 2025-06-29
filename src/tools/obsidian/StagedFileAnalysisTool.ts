/**
 * StagedFileAnalysisTool for OBSIUS - Enhanced Content Understanding
 * 
 * This tool implements a staged approach to file analysis:
 * 1. Overview Stage: Read first 1024 characters of ALL files for importance scoring
 * 2. Deep Stage: Complete reading of high-importance files for comprehensive understanding
 * 
 * This addresses the limitation of surface-level content analysis by ensuring
 * true vault comprehension through intelligent content prioritization.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult } from '../../utils/types';
import { z } from 'zod';
import { TFile } from 'obsidian';

/**
 * Schema for staged file analysis parameters
 */
const StagedFileAnalysisParamsSchema = z.object({
  patterns: z.array(z.string())
    .default(['**/*.md'])
    .describe('File patterns to analyze (default: all markdown files)'),
  
  overviewCharacterLimit: z.number()
    .min(512)
    .max(2048)
    .default(1024)
    .describe('Characters to read per file in overview stage (default: 1024)'),
  
  deepReadingPercentage: z.number()
    .min(0.1)
    .max(0.5)
    .default(0.25)
    .describe('Percentage of files to read completely (default: 25%)'),
  
  maxTotalCharacters: z.number()
    .min(50000)
    .max(1000000)
    .default(500000)
    .describe('Maximum total characters to read across all stages (default: 500,000)'),
  
  forceIncludePatterns: z.array(z.string())
    .optional()
    .describe('File patterns to always include in deep reading (e.g., ["**/README.md", "**/index.md"])'),
  
  analysisMode: z.enum(['comprehensive', 'focused', 'technical'])
    .default('comprehensive')
    .describe('Analysis mode: comprehensive (all content), focused (high-value), technical (code/docs)')
});

type StagedFileAnalysisParams = z.infer<typeof StagedFileAnalysisParamsSchema>;

/**
 * File importance score calculation result
 */
interface FileImportanceScore {
  path: string;
  score: number;
  reasons: string[];
  category: 'critical' | 'high' | 'medium' | 'low';
  shouldDeepRead: boolean;
}

/**
 * Overview stage analysis result for a single file
 */
interface FileOverview {
  path: string;
  success: boolean;
  preview: string;
  contentLength: number;
  metadata: {
    hasCodeBlocks: boolean;
    hasLinks: boolean;
    hasHeaders: boolean;
    hasTasks: boolean;
    isTechnical: boolean;
    isDocumentation: boolean;
    isIndex: boolean;
    estimatedWordCount: number;
  };
  importance: FileImportanceScore;
  error?: string;
}

/**
 * Deep stage analysis result for a single file
 */
interface FileDeepAnalysis {
  path: string;
  success: boolean;
  fullContent: string;
  contentAnalysis: {
    documentType: string;
    primaryTopics: string[];
    technicalComplexity: 'low' | 'medium' | 'high';
    knowledgeConnections: string[];
    structureQuality: 'poor' | 'fair' | 'good' | 'excellent';
    informationDensity: number; // 0-1 scale
  };
  error?: string;
}

/**
 * Complete staged analysis result
 */
interface StagedAnalysisResult {
  overview: {
    totalFilesAnalyzed: number;
    averageImportanceScore: number;
    importanceDistribution: Record<string, number>;
    topCategories: string[];
  };
  deepAnalysis: {
    filesAnalyzed: number;
    totalCharactersRead: number;
    averageQuality: number;
    primaryKnowledgeDomains: string[];
    technicalPatterns: string[];
  };
  insights: {
    vaultCharacteristics: string[];
    organizationPatterns: string[];
    contentQualityAssessment: string;
    recommendedWorkflows: string[];
  };
  files: {
    overviews: FileOverview[];
    deepAnalyses: FileDeepAnalysis[];
  };
}

/**
 * StagedFileAnalysisTool - Intelligent vault content analysis
 * 
 * Features:
 * - Overview stage: 1024-character preview of ALL files for importance scoring
 * - Deep stage: Complete reading of high-importance files (top 25%)
 * - Intelligent file prioritization based on content characteristics
 * - Comprehensive vault understanding beyond surface sampling
 * - Adaptive analysis based on content type and structure
 */
export class StagedFileAnalysisTool extends BaseTool<StagedFileAnalysisParams> {
  
  get name(): string {
    return 'staged_file_analysis';
  }

  get description(): string {
    return 'Intelligent staged analysis: overview all files (1024 chars) then deep-read important files for comprehensive vault understanding';
  }

  get parameterSchema(): z.ZodType<StagedFileAnalysisParams> {
    return StagedFileAnalysisParamsSchema as z.ZodType<StagedFileAnalysisParams>;
  }

  get riskLevel() {
    return 'low' as const;
  }

  /**
   * Execute staged file analysis
   */
  protected async executeInternal(params: StagedFileAnalysisParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Stage 1: Discover all files using patterns
      const allFiles = await this.discoverFiles(params.patterns);
      
      if (allFiles.length === 0) {
        return this.createErrorResult(
          'No files found matching the specified patterns',
          new Error('No files to analyze')
        );
      }

      // Stage 2: Overview analysis - read first N characters of ALL files
      const overviewResults = await this.performOverviewAnalysis(
        allFiles, 
        params.overviewCharacterLimit
      );

      // Stage 3: Calculate importance scores and select files for deep reading
      const selectedForDeepReading = this.selectFilesForDeepReading(
        overviewResults,
        params.deepReadingPercentage,
        params.forceIncludePatterns || []
      );

      // Stage 4: Deep analysis - complete reading of selected important files
      const deepAnalysisResults = await this.performDeepAnalysis(
        selectedForDeepReading,
        params.maxTotalCharacters
      );

      // Stage 5: Generate comprehensive insights
      const finalResults = this.generateStagedAnalysisResults(
        overviewResults,
        deepAnalysisResults,
        params.analysisMode
      );

      return {
        success: true,
        message: `Staged analysis complete: ${overviewResults.length} files overviewed, ${deepAnalysisResults.length} files deeply analyzed`,
        data: finalResults
      };

    } catch (error) {
      return this.createErrorResult(
        `Staged file analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Unknown staged analysis error')
      );
    }
  }

  /**
   * Discover files using glob patterns
   */
  private async discoverFiles(patterns: string[]): Promise<string[]> {
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const files = this.app.vault.getMarkdownFiles()
          .map(file => file.path)
          .filter(path => this.matchesPattern(path, pattern));
        
        allFiles.push(...files);
      } catch (error) {
        console.warn(`Failed to process pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allFiles));
  }

  /**
   * Simple pattern matching (basic glob support)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** matches any path
      .replace(/\*/g, '[^/]*') // * matches anything except path separator
      .replace(/\?/g, '.'); // ? matches single character
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Stage 2: Overview analysis - read preview of all files
   */
  private async performOverviewAnalysis(
    filePaths: string[],
    characterLimit: number
  ): Promise<FileOverview[]> {
    const results: FileOverview[] = [];
    
    for (const filePath of filePaths) {
      try {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        
        if (!file || !(file instanceof TFile)) {
          results.push({
            path: filePath,
            success: false,
            preview: '',
            contentLength: 0,
            metadata: this.createEmptyMetadata(),
            importance: this.createLowImportanceScore(filePath),
            error: 'File not found or not accessible'
          });
          continue;
        }

        // Read limited content for overview
        const fullContent = await this.app.vault.read(file);
        const preview = fullContent.substring(0, characterLimit);
        
        // Analyze preview content
        const metadata = this.analyzeContentMetadata(preview, filePath);
        const importance = this.calculateImportanceScore(filePath, preview, metadata);
        
        results.push({
          path: filePath,
          success: true,
          preview,
          contentLength: fullContent.length,
          metadata,
          importance
        });

      } catch (error) {
        results.push({
          path: filePath,
          success: false,
          preview: '',
          contentLength: 0,
          metadata: this.createEmptyMetadata(),
          importance: this.createLowImportanceScore(filePath),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Analyze content metadata from preview
   */
  private analyzeContentMetadata(content: string, filePath: string): FileOverview['metadata'] {
    const lowerContent = content.toLowerCase();
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    
    return {
      hasCodeBlocks: /```[\s\S]*?```|`[^`]+`/.test(content),
      hasLinks: /\[.*?\]\(.*?\)|\[\[.*?\]\]/.test(content),
      hasHeaders: /^#+\s/m.test(content),
      hasTasks: /- \[(x| )\]/.test(content),
      isTechnical: this.isTechnicalContent(content, filePath),
      isDocumentation: this.isDocumentationFile(content, filePath),
      isIndex: /\b(index|readme|home|main)\b/i.test(fileName),
      estimatedWordCount: content.split(/\s+/).length
    };
  }

  /**
   * Check if content is technical
   */
  private isTechnicalContent(content: string, filePath: string): boolean {
    const technicalPatterns = [
      /\b(function|class|import|export|const|let|var)\b/,
      /\b(typescript|javascript|python|rust|go|java)\b/i,
      /\b(api|endpoint|schema|database|algorithm)\b/i,
      /```(ts|js|py|rs|go|java|sql|json|yaml)/,
      /@\w+/,  // decorators
      /\b(npm|pip|cargo|git|docker)\b/i
    ];

    const folderPatterns = ['src/', 'docs/', 'api/', 'lib/', 'tools/'];
    
    return technicalPatterns.some(pattern => pattern.test(content)) ||
           folderPatterns.some(folder => filePath.includes(folder));
  }

  /**
   * Check if file is documentation
   */
  private isDocumentationFile(content: string, filePath: string): boolean {
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    const docPatterns = [
      /\b(readme|guide|tutorial|documentation|spec|api)\b/i,
      /^#\s+/,  // Starts with header
      /installation|getting.?started|overview|introduction/i
    ];

    return docPatterns.some(pattern => pattern.test(fileName) || pattern.test(content));
  }

  /**
   * Calculate file importance score
   */
  private calculateImportanceScore(
    filePath: string, 
    content: string, 
    metadata: FileOverview['metadata']
  ): FileImportanceScore {
    let score = 0;
    const reasons: string[] = [];
    const fileName = filePath.split('/').pop() || '';
    
    // Base score factors
    if (metadata.isIndex) {
      score += 10;
      reasons.push('Index/main file');
    }
    
    if (metadata.isDocumentation) {
      score += 8;
      reasons.push('Documentation file');
    }
    
    if (metadata.isTechnical) {
      score += 6;
      reasons.push('Technical content');
    }
    
    if (metadata.hasCodeBlocks) {
      score += 4;
      reasons.push('Contains code examples');
    }
    
    if (metadata.hasLinks) {
      score += 3;
      reasons.push('Well-connected content');
    }
    
    if (metadata.estimatedWordCount > 500) {
      score += 3;
      reasons.push('Substantial content');
    }
    
    if (metadata.estimatedWordCount > 1500) {
      score += 2;
      reasons.push('Comprehensive content');
    }
    
    // File name importance
    if (/\b(architecture|design|spec|api)\b/i.test(fileName)) {
      score += 5;
      reasons.push('Architectural documentation');
    }
    
    // Folder depth penalty (deeper = less likely to be important)
    const depth = filePath.split('/').length - 1;
    if (depth > 3) {
      score -= Math.min(3, depth - 3);
      reasons.push('Deep nested file (lower priority)');
    }
    
    // Determine category and deep read decision
    let category: FileImportanceScore['category'];
    let shouldDeepRead = false;
    
    if (score >= 15) {
      category = 'critical';
      shouldDeepRead = true;
    } else if (score >= 10) {
      category = 'high';
      shouldDeepRead = true;
    } else if (score >= 5) {
      category = 'medium';
      shouldDeepRead = false; // Will be decided by percentage
    } else {
      category = 'low';
      shouldDeepRead = false;
    }
    
    return {
      path: filePath,
      score,
      reasons,
      category,
      shouldDeepRead
    };
  }

  /**
   * Select files for deep reading based on importance scores
   */
  private selectFilesForDeepReading(
    overviewResults: FileOverview[],
    percentage: number,
    forceIncludePatterns: string[]
  ): FileOverview[] {
    // Always include critical and high importance files
    const alwaysInclude = overviewResults.filter(
      result => result.importance.shouldDeepRead
    );
    
    // Force include files matching patterns
    const forceInclude = overviewResults.filter(result =>
      forceIncludePatterns.some(pattern => this.matchesPattern(result.path, pattern))
    );
    
    // Calculate remaining slots for medium importance files
    const combinedAlways = new Set([...alwaysInclude, ...forceInclude]);
    const targetTotal = Math.ceil(overviewResults.length * percentage);
    const remainingSlots = Math.max(0, targetTotal - combinedAlways.size);
    
    // Select top medium importance files to fill remaining slots
    const mediumFiles = overviewResults
      .filter(result => 
        result.importance.category === 'medium' && 
        !combinedAlways.has(result)
      )
      .sort((a, b) => b.importance.score - a.importance.score)
      .slice(0, remainingSlots);
    
    return Array.from(new Set([...combinedAlways, ...mediumFiles]));
  }

  /**
   * Stage 4: Deep analysis - complete reading of selected files
   */
  private async performDeepAnalysis(
    selectedFiles: FileOverview[],
    maxTotalCharacters: number
  ): Promise<FileDeepAnalysis[]> {
    const results: FileDeepAnalysis[] = [];
    let totalCharacters = 0;
    
    // Sort by importance for character limit management
    const sortedFiles = selectedFiles.sort((a, b) => 
      b.importance.score - a.importance.score
    );
    
    for (const fileOverview of sortedFiles) {
      if (totalCharacters >= maxTotalCharacters) {
        break;
      }
      
      try {
        const file = this.app.vault.getAbstractFileByPath(fileOverview.path);
        
        if (!file || !(file instanceof TFile)) {
          results.push({
            path: fileOverview.path,
            success: false,
            fullContent: '',
            contentAnalysis: this.createEmptyContentAnalysis(),
            error: 'File not accessible for deep reading'
          });
          continue;
        }
        
        const fullContent = await this.app.vault.read(file);
        const remainingCharacters = maxTotalCharacters - totalCharacters;
        
        // Truncate if necessary to stay within limits
        const contentToAnalyze = fullContent.length > remainingCharacters
          ? fullContent.substring(0, remainingCharacters)
          : fullContent;
        
        const contentAnalysis = this.performDeepContentAnalysis(
          fileOverview.path,
          contentToAnalyze
        );
        
        results.push({
          path: fileOverview.path,
          success: true,
          fullContent: contentToAnalyze,
          contentAnalysis
        });
        
        totalCharacters += contentToAnalyze.length;
        
      } catch (error) {
        results.push({
          path: fileOverview.path,
          success: false,
          fullContent: '',
          contentAnalysis: this.createEmptyContentAnalysis(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Perform deep content analysis on complete file content
   */
  private performDeepContentAnalysis(filePath: string, content: string): FileDeepAnalysis['contentAnalysis'] {
    // Determine document type
    const documentType = this.classifyDocumentType(filePath, content);
    
    // Extract primary topics
    const primaryTopics = this.extractPrimaryTopics(content);
    
    // Assess technical complexity
    const technicalComplexity = this.assessTechnicalComplexity(content);
    
    // Find knowledge connections
    const knowledgeConnections = this.findKnowledgeConnections(content);
    
    // Evaluate structure quality
    const structureQuality = this.evaluateStructureQuality(content);
    
    // Calculate information density
    const informationDensity = this.calculateInformationDensity(content);
    
    return {
      documentType,
      primaryTopics,
      technicalComplexity,
      knowledgeConnections,
      structureQuality,
      informationDensity
    };
  }

  /**
   * Classify document type based on comprehensive content analysis
   */
  private classifyDocumentType(filePath: string, content: string): string {
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    const lowerContent = content.toLowerCase();
    
    // Technical documentation patterns
    if (lowerContent.includes('api') && (lowerContent.includes('endpoint') || lowerContent.includes('method'))) {
      return 'API Documentation';
    }
    
    if (fileName.includes('readme') || (lowerContent.includes('getting started') && lowerContent.includes('installation'))) {
      return 'Project Overview';
    }
    
    if (lowerContent.includes('tutorial') || (lowerContent.includes('step') && lowerContent.includes('example'))) {
      return 'Tutorial/Guide';
    }
    
    if (content.match(/```[\s\S]*?```/g)?.length && content.match(/```[\s\S]*?```/g)!.length >= 3) {
      return 'Code Documentation';
    }
    
    if (fileName.includes('architecture') || lowerContent.includes('system design') || lowerContent.includes('component')) {
      return 'Architecture Documentation';
    }
    
    if (lowerContent.includes('specification') || lowerContent.includes('requirements')) {
      return 'Specification';
    }
    
    if (content.includes('- [ ]') || content.includes('- [x]')) {
      return 'Task/Project Management';
    }
    
    return 'General Documentation';
  }

  /**
   * Extract primary topics from content
   */
  private extractPrimaryTopics(content: string): string[] {
    const topics: string[] = [];
    
    // Extract from headers
    const headers = content.match(/^#+\s+(.+)$/gm);
    if (headers) {
      topics.push(...headers.map(h => h.replace(/^#+\s+/, '').trim()));
    }
    
    // Extract from code blocks
    const codeBlocks = content.match(/```(\w+)/g);
    if (codeBlocks) {
      topics.push(...codeBlocks.map(cb => cb.replace('```', '').trim()));
    }
    
    // Extract technical terms
    const technicalTerms = content.match(/\b(typescript|javascript|python|react|node|api|database|docker|kubernetes|aws|azure|gcp)\b/gi);
    if (technicalTerms) {
      topics.push(...technicalTerms.map(term => term.toLowerCase()));
    }
    
    // Remove duplicates and return top 10
    return Array.from(new Set(topics)).slice(0, 10);
  }

  /**
   * Assess technical complexity
   */
  private assessTechnicalComplexity(content: string): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // Code block complexity
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    complexityScore += codeBlocks.length * 2;
    
    // Technical terminology density
    const technicalTerms = content.match(/\b(algorithm|architecture|implementation|interface|protocol|framework|library|dependency|configuration|deployment)\b/gi) || [];
    complexityScore += technicalTerms.length;
    
    // Depth indicators
    if (content.includes('deep dive') || content.includes('advanced') || content.includes('complex')) {
      complexityScore += 5;
    }
    
    if (complexityScore >= 15) return 'high';
    if (complexityScore >= 5) return 'medium';
    return 'low';
  }

  /**
   * Find knowledge connections (links to other concepts)
   */
  private findKnowledgeConnections(content: string): string[] {
    const connections: string[] = [];
    
    // Internal links
    const internalLinks = content.match(/\[\[([^\]]+)\]\]/g);
    if (internalLinks) {
      connections.push(...internalLinks.map(link => link.replace(/\[\[|\]\]/g, '')));
    }
    
    // External references
    const externalLinks = content.match(/\[([^\]]+)\]\([^)]+\)/g);
    if (externalLinks) {
      connections.push(...externalLinks.map(link => {
        const match = link.match(/\[([^\]]+)\]/);
        return match ? match[1] : '';
      }).filter(Boolean));
    }
    
    return connections.slice(0, 20); // Limit to prevent overflow
  }

  /**
   * Evaluate structure quality
   */
  private evaluateStructureQuality(content: string): 'poor' | 'fair' | 'good' | 'excellent' {
    let score = 0;
    
    // Has clear headers
    if (content.match(/^#+\s/m)) score += 2;
    
    // Multiple header levels
    if (content.match(/^##\s/m) && content.match(/^###\s/m)) score += 1;
    
    // Has introduction and conclusion patterns
    if (content.match(/introduction|overview|getting started/i)) score += 1;
    if (content.match(/conclusion|summary|next steps/i)) score += 1;
    
    // Good use of lists
    if (content.match(/^[-*+]\s/m)) score += 1;
    
    // Code examples with explanations
    if (content.includes('```') && content.match(/example|usage|how to/i)) score += 1;
    
    // Table of contents or navigation
    if (content.match(/table of contents|navigation|\[toc\]/i)) score += 1;
    
    if (score >= 6) return 'excellent';
    if (score >= 4) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
  }

  /**
   * Calculate information density (0-1 scale)
   */
  private calculateInformationDensity(content: string): number {
    const totalChars = content.length;
    if (totalChars === 0) return 0;
    
    // Count information-rich elements
    let infoScore = 0;
    
    // Headers contribute to information structure
    infoScore += (content.match(/^#+\s/gm) || []).length * 10;
    
    // Code blocks are information-dense
    infoScore += (content.match(/```[\s\S]*?```/g) || []).length * 50;
    
    // Links indicate connections
    infoScore += (content.match(/\[.*?\][\(\[].*?[\)\]]/g) || []).length * 5;
    
    // Lists provide organized information
    infoScore += (content.match(/^[-*+]\s/gm) || []).length * 3;
    
    // Technical terms indicate depth
    infoScore += (content.match(/\b[A-Z]{2,}\b/g) || []).length * 2;
    
    // Calculate density as ratio of info score to content length
    const density = Math.min(1, infoScore / totalChars * 100);
    
    return Math.round(density * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate final staged analysis results
   */
  private generateStagedAnalysisResults(
    overviewResults: FileOverview[],
    deepAnalysisResults: FileDeepAnalysis[],
    analysisMode: string
  ): StagedAnalysisResult {
    // Calculate overview statistics
    const successfulOverviews = overviewResults.filter(r => r.success);
    const averageImportanceScore = successfulOverviews.reduce((sum, r) => sum + r.importance.score, 0) / successfulOverviews.length;
    
    const importanceDistribution = overviewResults.reduce((dist, r) => {
      dist[r.importance.category] = (dist[r.importance.category] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
    
    // Calculate deep analysis statistics
    const successfulDeepAnalyses = deepAnalysisResults.filter(r => r.success);
    const totalCharactersRead = successfulDeepAnalyses.reduce((sum, r) => sum + r.fullContent.length, 0);
    const averageQuality = successfulDeepAnalyses.reduce((sum, r) => {
      const qualityScore = r.contentAnalysis.structureQuality === 'excellent' ? 4 :
                          r.contentAnalysis.structureQuality === 'good' ? 3 :
                          r.contentAnalysis.structureQuality === 'fair' ? 2 : 1;
      return sum + qualityScore;
    }, 0) / successfulDeepAnalyses.length;
    
    // Extract insights
    const allTopics = successfulDeepAnalyses.flatMap(r => r.contentAnalysis.primaryTopics);
    const primaryKnowledgeDomains = Array.from(new Set(allTopics)).slice(0, 10);
    
    const allDocTypes = successfulDeepAnalyses.map(r => r.contentAnalysis.documentType);
    const topCategories = Array.from(new Set(allDocTypes)).slice(0, 5);
    
    // Generate vault characteristics
    const vaultCharacteristics = this.generateVaultCharacteristics(overviewResults, deepAnalysisResults);
    const organizationPatterns = this.generateOrganizationPatterns(overviewResults);
    const contentQualityAssessment = this.generateQualityAssessment(averageQuality, averageImportanceScore);
    const recommendedWorkflows = this.generateWorkflowRecommendations(analysisMode, deepAnalysisResults);
    
    return {
      overview: {
        totalFilesAnalyzed: overviewResults.length,
        averageImportanceScore,
        importanceDistribution,
        topCategories
      },
      deepAnalysis: {
        filesAnalyzed: successfulDeepAnalyses.length,
        totalCharactersRead,
        averageQuality,
        primaryKnowledgeDomains,
        technicalPatterns: this.extractTechnicalPatterns(deepAnalysisResults)
      },
      insights: {
        vaultCharacteristics,
        organizationPatterns,
        contentQualityAssessment,
        recommendedWorkflows
      },
      files: {
        overviews: overviewResults,
        deepAnalyses: deepAnalysisResults
      }
    };
  }

  /**
   * Generate vault characteristics
   */
  private generateVaultCharacteristics(
    overviewResults: FileOverview[],
    deepAnalysisResults: FileDeepAnalysis[]
  ): string[] {
    const characteristics: string[] = [];
    
    const technicalFiles = overviewResults.filter(r => r.metadata.isTechnical).length;
    const documentationFiles = overviewResults.filter(r => r.metadata.isDocumentation).length;
    const totalFiles = overviewResults.length;
    
    if (technicalFiles / totalFiles > 0.4) {
      characteristics.push('Technical documentation focused');
    }
    
    if (documentationFiles / totalFiles > 0.3) {
      characteristics.push('Well-documented codebase');
    }
    
    const highQualityFiles = deepAnalysisResults.filter(r => 
      r.contentAnalysis.structureQuality === 'excellent' || r.contentAnalysis.structureQuality === 'good'
    ).length;
    
    if (highQualityFiles / deepAnalysisResults.length > 0.7) {
      characteristics.push('High-quality content structure');
    }
    
    const complexFiles = deepAnalysisResults.filter(r => 
      r.contentAnalysis.technicalComplexity === 'high'
    ).length;
    
    if (complexFiles / deepAnalysisResults.length > 0.3) {
      characteristics.push('Advanced technical content');
    }
    
    return characteristics;
  }

  /**
   * Generate organization patterns
   */
  private generateOrganizationPatterns(overviewResults: FileOverview[]): string[] {
    const patterns: string[] = [];
    
    const indexFiles = overviewResults.filter(r => r.metadata.isIndex).length;
    if (indexFiles > 5) {
      patterns.push('Hub-based organization with multiple index files');
    }
    
    const linkedFiles = overviewResults.filter(r => r.metadata.hasLinks).length;
    if (linkedFiles / overviewResults.length > 0.6) {
      patterns.push('Well-connected knowledge network');
    }
    
    const taskFiles = overviewResults.filter(r => r.metadata.hasTasks).length;
    if (taskFiles > 0) {
      patterns.push('Task-oriented content management');
    }
    
    return patterns;
  }

  /**
   * Generate quality assessment
   */
  private generateQualityAssessment(averageQuality: number, averageImportance: number): string {
    if (averageQuality >= 3.5 && averageImportance >= 8) {
      return 'Excellent: High-quality, well-structured content with strong information value';
    } else if (averageQuality >= 2.5 && averageImportance >= 6) {
      return 'Good: Well-organized content with decent information density';
    } else if (averageQuality >= 2 && averageImportance >= 4) {
      return 'Fair: Basic organization with room for improvement in structure and depth';
    } else {
      return 'Needs improvement: Consider restructuring and enriching content quality';
    }
  }

  /**
   * Generate workflow recommendations
   */
  private generateWorkflowRecommendations(
    analysisMode: string,
    deepAnalysisResults: FileDeepAnalysis[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (analysisMode === 'technical') {
      recommendations.push('Implement code documentation standards');
      recommendations.push('Create API reference guides');
    }
    
    const poorStructureFiles = deepAnalysisResults.filter(r => 
      r.contentAnalysis.structureQuality === 'poor'
    ).length;
    
    if (poorStructureFiles > 0) {
      recommendations.push('Improve document structure with consistent headers and organization');
    }
    
    const lowDensityFiles = deepAnalysisResults.filter(r => 
      r.contentAnalysis.informationDensity < 0.3
    ).length;
    
    if (lowDensityFiles > deepAnalysisResults.length * 0.4) {
      recommendations.push('Enhance content density with more detailed information and examples');
    }
    
    const disconnectedFiles = deepAnalysisResults.filter(r => 
      r.contentAnalysis.knowledgeConnections.length < 2
    ).length;
    
    if (disconnectedFiles > deepAnalysisResults.length * 0.5) {
      recommendations.push('Increase knowledge connectivity with more cross-references and links');
    }
    
    return recommendations;
  }

  /**
   * Extract technical patterns
   */
  private extractTechnicalPatterns(deepAnalysisResults: FileDeepAnalysis[]): string[] {
    const patterns: Set<string> = new Set();
    
    for (const result of deepAnalysisResults) {
      // Extract programming languages and frameworks
      const topics = result.contentAnalysis.primaryTopics;
      topics.forEach(topic => {
        if (/^(typescript|javascript|python|rust|go|java|react|vue|angular|node|express|fastapi|django|flask)$/i.test(topic)) {
          patterns.add(topic.toLowerCase());
        }
      });
      
      // Extract architectural patterns
      if (result.contentAnalysis.documentType === 'Architecture Documentation') {
        patterns.add('architectural-documentation');
      }
      
      if (result.contentAnalysis.documentType === 'API Documentation') {
        patterns.add('api-documentation');
      }
    }
    
    return Array.from(patterns);
  }

  /**
   * Utility methods
   */
  private createEmptyMetadata(): FileOverview['metadata'] {
    return {
      hasCodeBlocks: false,
      hasLinks: false,
      hasHeaders: false,
      hasTasks: false,
      isTechnical: false,
      isDocumentation: false,
      isIndex: false,
      estimatedWordCount: 0
    };
  }

  private createLowImportanceScore(filePath: string): FileImportanceScore {
    return {
      path: filePath,
      score: 0,
      reasons: ['Analysis failed'],
      category: 'low',
      shouldDeepRead: false
    };
  }

  private createEmptyContentAnalysis(): FileDeepAnalysis['contentAnalysis'] {
    return {
      documentType: 'Unknown',
      primaryTopics: [],
      technicalComplexity: 'low',
      knowledgeConnections: [],
      structureQuality: 'poor',
      informationDensity: 0
    };
  }
}