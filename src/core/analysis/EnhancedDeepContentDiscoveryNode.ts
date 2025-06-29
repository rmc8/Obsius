/**
 * Enhanced Deep Content Discovery Node - Comprehensive vault content understanding
 * 
 * This node replaces the basic overview+sampling approach with a sophisticated
 * staged analysis system that ensures true vault comprehension:
 * 
 * 1. Overview Stage: Read first 1024 characters of ALL files for importance scoring
 * 2. Deep Stage: Complete reading of high-importance files (top 25%)
 * 3. Intelligence Analysis: Extract patterns, connections, and insights
 * 
 * This addresses the fundamental limitation of surface-level analysis by
 * implementing the user's suggested approach of reading content previews
 * for all files, then deep-reading the most important ones.
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { AnalysisNode, AnalysisData, AnalysisProgress } from './VaultAnalysisWorkflow';

/**
 * Enhanced content analysis result with staged insights
 */
export interface EnhancedContentAnalysis {
  stagingResults: {
    totalFilesAnalyzed: number;
    deepFilesRead: number;
    totalCharactersRead: number;
    analysisMode: string;
    averageImportanceScore: number;
    averageQualityScore: number;
  };
  
  contentDistribution: {
    documentTypes: Map<string, number>;
    technicalComplexity: Map<string, number>;
    structureQuality: Map<string, number>;
    importanceCategories: Map<string, number>;
  };
  
  knowledgePatterns: {
    primaryDomains: string[];
    technicalPatterns: string[];
    organizationPrinciples: string[];
    contentQualityAssessment: string;
    knowledgeConnections: string[];
  };
  
  vaultCharacteristics: {
    overallComplexity: 'simple' | 'moderate' | 'complex';
    contentFocus: string[];
    organizationLevel: 'basic' | 'structured' | 'sophisticated';
    knowledgeDepth: 'surface' | 'moderate' | 'deep';
  };
  
  workflowRecommendations: {
    suggestedPatterns: string[];
    optimizationOpportunities: string[];
    contentEnhancementSuggestions: string[];
  };
  
  representativeFiles: {
    path: string;
    category: string;
    importance: number;
    analysis: string;
    keyTopics: string[];
  }[];
}

/**
 * Enhanced Deep Content Discovery Node - True vault understanding through staged analysis
 * 
 * Features:
 * - Complete file overview with 1024-character previews
 * - Intelligent importance scoring and file prioritization  
 * - Deep reading of critical files (25% of total)
 * - Comprehensive pattern recognition and insight generation
 * - Knowledge network mapping and connection analysis
 */
export class EnhancedDeepContentDiscoveryNode extends AnalysisNode {
  get name(): string { return "🧠 Enhanced Deep Content Discovery"; }
  get description(): string { return "Comprehensive vault understanding through staged analysis: preview all files, deep-read important ones"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Initiating enhanced content discovery...",
      "Starting comprehensive staged analysis for true vault understanding",
      [
        "📋 Stage 1: Overview all files (1024 chars each)",
        "🎯 Stage 2: Deep-read important files (complete content)",
        "🧠 Stage 3: Generate comprehensive insights"
      ],
      this.getPhaseNumber()
    );

    await this.think(1000);

    try {
      // Stage 1: Execute staged file analysis for comprehensive understanding
      const stagedAnalysisResult = await this.performStagedAnalysis();
      
      this.reportProgress(
        "Processing staged analysis results...",
        `Analyzed ${stagedAnalysisResult.overview.totalFilesAnalyzed} files, deep-read ${stagedAnalysisResult.deepAnalysis.filesAnalyzed} critical files`,
        [
          `📊 ${stagedAnalysisResult.overview.totalFilesAnalyzed} files overviewed`,
          `🔍 ${stagedAnalysisResult.deepAnalysis.filesAnalyzed} files deeply analyzed`,
          `📈 ${Math.round(stagedAnalysisResult.overview.averageImportanceScore * 10) / 10} avg importance score`,
          `⭐ ${Math.round(stagedAnalysisResult.deepAnalysis.averageQuality * 10) / 10} avg quality score`
        ],
        this.getPhaseNumber()
      );

      await this.think(1500);

      // Stage 2: Transform staged results into enhanced analysis
      const enhancedAnalysis = this.transformStagedResults(stagedAnalysisResult);
      
      this.reportProgress(
        "Generating comprehensive insights...",
        "Synthesizing vault characteristics and knowledge patterns",
        [
          `🎯 ${enhancedAnalysis.knowledgePatterns.primaryDomains.length} primary knowledge domains identified`,
          `🏗️ ${enhancedAnalysis.knowledgePatterns.organizationPrinciples.length} organization principles discovered`,
          `💡 ${enhancedAnalysis.workflowRecommendations.suggestedPatterns.length} workflow patterns recommended`,
          `📋 Vault complexity: ${enhancedAnalysis.vaultCharacteristics.overallComplexity}`
        ],
        this.getPhaseNumber()
      );

      await this.think(1200);

      // Stage 3: Final insight synthesis and integration
      const finalAnalysis = this.synthesizeFinalInsights(enhancedAnalysis, stagedAnalysisResult);
      
      this.reportProgress(
        "Enhanced content discovery complete",
        "Comprehensive vault understanding achieved through staged analysis",
        [
          `🎯 ${finalAnalysis.representativeFiles.length} representative files identified`,
          `🧠 ${finalAnalysis.knowledgePatterns.knowledgeConnections.length} knowledge connections mapped`,
          `📈 Content depth: ${finalAnalysis.vaultCharacteristics.knowledgeDepth}`,
          `✨ ${finalAnalysis.workflowRecommendations.optimizationOpportunities.length} optimization opportunities found`
        ],
        this.getPhaseNumber(),
        true
      );

      // Integrate enhanced analysis into main analysis data
      data = this.integrateEnhancedAnalysis(data, finalAnalysis);

      return data;

    } catch (error) {
      console.error('Enhanced content discovery failed:', error);
      throw new Error(`Enhanced content discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform staged file analysis using the new StagedFileAnalysisTool
   */
  private async performStagedAnalysis(): Promise<any> {
    console.log('🧠 Enhanced Deep Content Discovery: Starting staged analysis...');
    
    // Configure staged analysis for comprehensive vault understanding
    const stagedParams = {
      patterns: ['**/*.md'],  // Focus on markdown files
      overviewCharacterLimit: 1024,  // Read first 1024 chars of ALL files
      deepReadingPercentage: 0.25,   // Deep-read top 25% of files
      maxTotalCharacters: 500000,    // Up to 500K chars total
      forceIncludePatterns: [
        '**/README.md', 
        '**/index.md', 
        '**/CLAUDE.md',
        '**/OBSIUS.md'
      ],
      analysisMode: 'comprehensive' as const
    };

    console.log('🔍 Staged analysis parameters:', stagedParams);

    const stagedResult = await this.toolRegistry.executeTool('staged_file_analysis', stagedParams);

    if (!stagedResult.success || !stagedResult.data) {
      throw new Error(`Staged file analysis failed: ${stagedResult.error || 'No analysis data returned'}`);
    }

    console.log('✅ Staged analysis completed successfully');
    console.log(`   - Files analyzed: ${stagedResult.data.overview?.totalFilesAnalyzed || 0}`);
    console.log(`   - Files deep-read: ${stagedResult.data.deepAnalysis?.filesAnalyzed || 0}`);
    console.log(`   - Characters read: ${stagedResult.data.deepAnalysis?.totalCharactersRead || 0}`);

    return stagedResult.data;
  }

  /**
   * Transform staged analysis results into enhanced analysis format
   */
  private transformStagedResults(stagedResults: any): EnhancedContentAnalysis {
    // Extract basic statistics
    const stagingResults = {
      totalFilesAnalyzed: stagedResults.overview?.totalFilesAnalyzed || 0,
      deepFilesRead: stagedResults.deepAnalysis?.filesAnalyzed || 0,
      totalCharactersRead: stagedResults.deepAnalysis?.totalCharactersRead || 0,
      analysisMode: 'comprehensive',
      averageImportanceScore: stagedResults.overview?.averageImportanceScore || 0,
      averageQualityScore: stagedResults.deepAnalysis?.averageQuality || 0
    };

    // Transform content distribution
    const contentDistribution = {
      documentTypes: new Map<string, number>(),
      technicalComplexity: new Map<string, number>(),
      structureQuality: new Map<string, number>(),
      importanceCategories: new Map<string, number>()
    };

    // Process importance distribution
    if (stagedResults.overview?.importanceDistribution) {
      Object.entries(stagedResults.overview.importanceDistribution as Record<string, unknown>).forEach(([category, count]) => {
        if (typeof count === 'number') {
          contentDistribution.importanceCategories.set(category, count);
        }
      });
    }

    // Process deep analysis files for patterns
    const deepFiles = stagedResults.files?.deepAnalyses || [];
    for (const file of deepFiles) {
      if (file.success && file.contentAnalysis) {
        const analysis = file.contentAnalysis as any;
        
        // Document types
        const docType = analysis.documentType || 'Unknown';
        contentDistribution.documentTypes.set(
          docType, 
          (contentDistribution.documentTypes.get(docType) || 0) + 1
        );
        
        // Technical complexity
        const complexity = analysis.technicalComplexity || 'low';
        contentDistribution.technicalComplexity.set(
          complexity,
          (contentDistribution.technicalComplexity.get(complexity) || 0) + 1
        );
        
        // Structure quality
        const quality = analysis.structureQuality || 'poor';
        contentDistribution.structureQuality.set(
          quality,
          (contentDistribution.structureQuality.get(quality) || 0) + 1
        );
      }
    }

    // Extract knowledge patterns
    const knowledgePatterns = {
      primaryDomains: stagedResults.deepAnalysis?.primaryKnowledgeDomains || [],
      technicalPatterns: stagedResults.deepAnalysis?.technicalPatterns || [],
      organizationPrinciples: stagedResults.insights?.organizationPatterns || [],
      contentQualityAssessment: stagedResults.insights?.contentQualityAssessment || 'Assessment pending',
      knowledgeConnections: this.extractKnowledgeConnections(deepFiles)
    };

    // Determine vault characteristics
    const vaultCharacteristics = this.analyzeVaultCharacteristics(
      stagingResults,
      contentDistribution,
      knowledgePatterns
    );

    // Generate workflow recommendations
    const workflowRecommendations = {
      suggestedPatterns: stagedResults.insights?.recommendedWorkflows || [],
      optimizationOpportunities: this.identifyOptimizationOpportunities(
        contentDistribution,
        knowledgePatterns
      ),
      contentEnhancementSuggestions: this.generateContentEnhancementSuggestions(
        vaultCharacteristics,
        contentDistribution
      )
    };

    // Extract representative files
    const representativeFiles = this.selectRepresentativeFiles(
      stagedResults.files?.overviews || [],
      stagedResults.files?.deepAnalyses || []
    );

    return {
      stagingResults,
      contentDistribution,
      knowledgePatterns,
      vaultCharacteristics,
      workflowRecommendations,
      representativeFiles
    };
  }

  /**
   * Extract knowledge connections from deep analysis files
   */
  private extractKnowledgeConnections(deepFiles: any[]): string[] {
    const connections = new Set<string>();
    
    for (const file of deepFiles) {
      if (file.success && (file.contentAnalysis as any)?.knowledgeConnections) {
        const analysis = file.contentAnalysis as any;
        if (Array.isArray(analysis.knowledgeConnections)) {
          analysis.knowledgeConnections.forEach((connection: string) => {
            if (connection.length > 2 && connection.length < 50) {
              connections.add(connection);
            }
          });
        }
      }
    }
    
    return Array.from(connections).slice(0, 20); // Limit to top 20 connections
  }

  /**
   * Analyze vault characteristics based on content analysis
   */
  private analyzeVaultCharacteristics(
    stagingResults: any,
    contentDistribution: any,
    knowledgePatterns: any
  ): EnhancedContentAnalysis['vaultCharacteristics'] {
    // Determine overall complexity
    const technicalFiles = contentDistribution.technicalComplexity.get('high') || 0;
    const totalDeepFiles = stagingResults.deepFilesRead;
    const complexityRatio = totalDeepFiles > 0 ? technicalFiles / totalDeepFiles : 0;
    
    let overallComplexity: 'simple' | 'moderate' | 'complex';
    if (complexityRatio > 0.4 || stagingResults.averageImportanceScore > 8) {
      overallComplexity = 'complex';
    } else if (complexityRatio > 0.2 || stagingResults.averageImportanceScore > 5) {
      overallComplexity = 'moderate';
    } else {
      overallComplexity = 'simple';
    }

    // Determine content focus
    const contentFocus = knowledgePatterns.primaryDomains.slice(0, 5);

    // Determine organization level
    const excellentStructure = contentDistribution.structureQuality.get('excellent') || 0;
    const goodStructure = contentDistribution.structureQuality.get('good') || 0;
    const qualityRatio = totalDeepFiles > 0 ? (excellentStructure + goodStructure) / totalDeepFiles : 0;
    
    let organizationLevel: 'basic' | 'structured' | 'sophisticated';
    if (qualityRatio > 0.7) {
      organizationLevel = 'sophisticated';
    } else if (qualityRatio > 0.4) {
      organizationLevel = 'structured';
    } else {
      organizationLevel = 'basic';
    }

    // Determine knowledge depth
    const connectionCount = knowledgePatterns.knowledgeConnections.length;
    let knowledgeDepth: 'surface' | 'moderate' | 'deep';
    
    if (connectionCount > 15 && stagingResults.averageQualityScore > 3) {
      knowledgeDepth = 'deep';
    } else if (connectionCount > 8 && stagingResults.averageQualityScore > 2) {
      knowledgeDepth = 'moderate';
    } else {
      knowledgeDepth = 'surface';
    }

    return {
      overallComplexity,
      contentFocus,
      organizationLevel,
      knowledgeDepth
    };
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(
    contentDistribution: any,
    knowledgePatterns: any
  ): string[] {
    const opportunities: string[] = [];
    
    const poorStructure = contentDistribution.structureQuality.get('poor') || 0;
    const totalFiles = Array.from(contentDistribution.structureQuality.values() as Iterable<number>)
      .reduce((sum: number, count: number) => sum + count, 0);
    
    if (totalFiles > 0 && poorStructure / totalFiles > 0.3) {
      opportunities.push('Improve document structure and organization');
    }
    
    if (knowledgePatterns.knowledgeConnections.length < 10) {
      opportunities.push('Enhance knowledge connectivity with more cross-references');
    }
    
    const technicalComplexity = contentDistribution.technicalComplexity;
    const lowComplexity = technicalComplexity.get('low') || 0;
    const totalTechnical = Array.from(technicalComplexity.values() as Iterable<number>)
      .reduce((sum: number, count: number) => sum + count, 0);
    
    if (totalTechnical > 0 && lowComplexity / totalTechnical > 0.7) {
      opportunities.push('Add more detailed technical documentation and examples');
    }
    
    return opportunities;
  }

  /**
   * Generate content enhancement suggestions
   */
  private generateContentEnhancementSuggestions(
    vaultCharacteristics: any,
    contentDistribution: any
  ): string[] {
    const suggestions: string[] = [];
    
    if (vaultCharacteristics.organizationLevel === 'basic') {
      suggestions.push('Implement consistent folder structure and naming conventions');
      suggestions.push('Create index pages for major content areas');
    }
    
    if (vaultCharacteristics.knowledgeDepth === 'surface') {
      suggestions.push('Add more detailed content with examples and explanations');
      suggestions.push('Create linking patterns to connect related concepts');
    }
    
    const documentTypes = contentDistribution.documentTypes;
    const generalContent = documentTypes.get('General Content') || 0;
    const totalDocs = Array.from(documentTypes.values() as Iterable<number>)
      .reduce((sum: number, count: number) => sum + count, 0);
    
    if (totalDocs > 0 && generalContent / totalDocs > 0.6) {
      suggestions.push('Categorize content into specific document types');
      suggestions.push('Add structured metadata and tagging systems');
    }
    
    return suggestions;
  }

  /**
   * Select representative files for analysis insight
   */
  private selectRepresentativeFiles(
    overviewFiles: any[],
    deepFiles: any[]
  ): EnhancedContentAnalysis['representativeFiles'] {
    const representativeFiles: EnhancedContentAnalysis['representativeFiles'] = [];
    
    // Get top importance files from overview
    const topImportanceFiles = overviewFiles
      .filter(file => file.success && file.importance)
      .sort((a, b) => b.importance.score - a.importance.score)
      .slice(0, 10);
    
    for (const file of topImportanceFiles) {
      const deepAnalysis = deepFiles.find(df => df.path === file.path);
      
      representativeFiles.push({
        path: file.path,
        category: file.importance.category || 'unknown',
        importance: file.importance.score || 0,
        analysis: file.importance.reasons?.join('; ') || 'No analysis available',
        keyTopics: deepAnalysis?.contentAnalysis?.primaryTopics || []
      });
    }
    
    return representativeFiles.slice(0, 15); // Limit to top 15 representative files
  }

  /**
   * Synthesize final insights combining all analysis stages
   */
  private synthesizeFinalInsights(
    enhancedAnalysis: EnhancedContentAnalysis,
    stagedResults: any
  ): EnhancedContentAnalysis {
    // Enhance knowledge patterns with cross-analysis insights
    const additionalPatterns = this.discoverCrossPatterns(enhancedAnalysis, stagedResults);
    
    enhancedAnalysis.knowledgePatterns.organizationPrinciples.push(...additionalPatterns);
    
    // Add insights from vault characteristics
    if (enhancedAnalysis.vaultCharacteristics.overallComplexity === 'complex') {
      enhancedAnalysis.workflowRecommendations.suggestedPatterns.push(
        'Implement advanced knowledge management workflows',
        'Use specialized tools for technical content management'
      );
    }
    
    return enhancedAnalysis;
  }

  /**
   * Discover cross-analysis patterns
   */
  private discoverCrossPatterns(enhancedAnalysis: EnhancedContentAnalysis, stagedResults: any): string[] {
    const patterns: string[] = [];
    
    // Pattern: High-quality technical content
    const technicalFiles = enhancedAnalysis.contentDistribution.technicalComplexity.get('high') || 0;
    const excellentStructure = enhancedAnalysis.contentDistribution.structureQuality.get('excellent') || 0;
    
    if (technicalFiles > 0 && excellentStructure > 0) {
      patterns.push('Technical documentation with excellent structure quality');
    }
    
    // Pattern: Knowledge hub detection
    const hubFiles = enhancedAnalysis.representativeFiles.filter(
      file => file.keyTopics.length > 5 || file.importance > 10
    );
    
    if (hubFiles.length > 3) {
      patterns.push('Multiple knowledge hub files detected');
    }
    
    // Pattern: Specialized domain focus
    const primaryDomains = enhancedAnalysis.knowledgePatterns.primaryDomains;
    if (primaryDomains.length > 0 && primaryDomains.length <= 3) {
      patterns.push(`Specialized focus on: ${primaryDomains.join(', ')}`);
    }
    
    return patterns;
  }

  /**
   * Integrate enhanced analysis into main analysis data
   */
  private integrateEnhancedAnalysis(data: AnalysisData, enhancedAnalysis: EnhancedContentAnalysis): AnalysisData {
    // Store enhanced content analysis for other nodes
    data.enhancedContent = {
      stagingResults: enhancedAnalysis.stagingResults,
      contentDistribution: enhancedAnalysis.contentDistribution,
      knowledgePatterns: enhancedAnalysis.knowledgePatterns,
      vaultCharacteristics: enhancedAnalysis.vaultCharacteristics,
      workflowRecommendations: enhancedAnalysis.workflowRecommendations,
      representativeFiles: enhancedAnalysis.representativeFiles
    };

    // Update main analysis insights
    data.insights.primaryDomains.push(...enhancedAnalysis.knowledgePatterns.primaryDomains);
    data.insights.organizationPrinciples.push(...enhancedAnalysis.knowledgePatterns.organizationPrinciples);
    data.insights.workflowPatterns.push(...enhancedAnalysis.workflowRecommendations.suggestedPatterns);

    // Update content patterns
    enhancedAnalysis.contentDistribution.documentTypes.forEach((count, type) => {
      data.contentPatterns.tagCategories.set(type, count);
    });

    // Update project characteristics
    data.projectCharacteristics = {
      ...data.projectCharacteristics,
      complexity: enhancedAnalysis.vaultCharacteristics.overallComplexity,
      organizationLevel: enhancedAnalysis.vaultCharacteristics.organizationLevel,
      contentFocus: enhancedAnalysis.vaultCharacteristics.contentFocus.join(', '),
      knowledgeDepth: enhancedAnalysis.vaultCharacteristics.knowledgeDepth
    };

    return data;
  }

  private getPhaseNumber(): number {
    return 2; // Position in workflow
  }
}