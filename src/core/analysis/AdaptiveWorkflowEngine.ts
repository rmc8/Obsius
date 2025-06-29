/**
 * Adaptive Workflow Engine - Dynamic analysis workflow construction
 * Creates optimal analysis workflows based on project characteristics
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { 
  AnalysisNode, 
  AnalysisData, 
  AnalysisProgress,
  DiscoveryNode,
  ContentAnalysisNode,
  PatternRecognitionNode,
  RelationshipMappingNode,
  InsightGenerationNode,
  InstructionSynthesisNode
} from './VaultAnalysisWorkflow';
import { DeepContentDiscoveryNode } from './DeepContentDiscoveryNode';
import { DynamicInstructionGeneratorNode } from './DynamicInstructionGeneratorNode';
import { DynamicInstructionFormatterNode } from './DynamicInstructionFormatterNode';
import { FinalInstructionSynthesisNode } from './FinalInstructionSynthesisNode';
import { 
  ProjectProfile, 
  AnalysisNodeType, 
  VaultComplexity, 
  OrganizationLevel 
} from './ProjectCharacteristicDetector';

/**
 * Workflow strategy for adaptive analysis
 */
export interface WorkflowStrategy {
  profile: ProjectProfile;
  selectedNodes: AnalysisNode[];
  executionOrder: AnalysisNodeType[];
  estimatedDuration: number;
  adaptationReasons: string[];
}

/**
 * Advanced analysis nodes for complex vaults
 */

/**
 * Domain Analysis Node - For multi-domain vaults
 */
export class DomainAnalysisNode extends AnalysisNode {
  get name(): string { return "🎯 Domain Analysis"; }
  get description(): string { return "Analyzing distinct knowledge domains and their characteristics"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Analyzing knowledge domains...",
      "Identifying distinct knowledge areas and their organizational patterns",
      [],
      this.getPhaseNumber()
    );

    await this.think(1500);

    // Analyze domains based on folder structure and content patterns
    const domainMap = new Map<string, any>();
    
    // Analyze tag-based domains
    const topTags = Array.from(data.contentPatterns.tagCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const domains = topTags.map(([tag, count]) => ({
      name: tag,
      prevalence: count,
      type: this.categorizeDomain(tag)
    }));

    // Identify domain relationships and hierarchies
    const domainRelationships = this.analyzeDomainRelationships(domains);
    
    const thinking = this.createThinkingChain(
      `Identified ${domains.length} distinct knowledge domains with varying prevalence`,
      `The vault demonstrates multi-domain expertise with clear domain separation`,
      `Different domains may require different AI assistance strategies`,
      `Domain-specific workflows and terminology should be preserved in AI interactions`
    );

    const discoveries = [
      `🎯 ${domains.length} distinct knowledge domains identified`,
      `📊 Domain distribution: ${domains.slice(0, 3).map(d => `${d.name} (${d.prevalence})`).join(', ')}`,
      `🔗 ${domainRelationships.length} cross-domain relationships found`,
      `📋 Domain-specific organization patterns detected`
    ];

    this.reportProgress(
      "Domain analysis complete",
      `${thinking.observation}. ${thinking.analysis}. ${thinking.hypothesis}.`,
      discoveries,
      this.getPhaseNumber(),
      true
    );

    // Update insights with domain information
    data.insights.primaryDomains = domains.map(d => d.name);
    
    return data;
  }

  private getPhaseNumber(): number {
    // This will be set dynamically by the workflow engine
    return 4; // Default position
  }

  private categorizeDomain(tag: string): string {
    const technicalTerms = ['programming', 'technology', 'development', 'code', 'software'];
    const personalTerms = ['hobby', 'personal', 'health', 'lifestyle', 'interests'];
    const academicTerms = ['research', 'academic', 'study', 'learning', 'education'];
    
    const lowerTag = tag.toLowerCase();
    
    if (technicalTerms.some(term => lowerTag.includes(term))) return 'Technical';
    if (personalTerms.some(term => lowerTag.includes(term))) return 'Personal';
    if (academicTerms.some(term => lowerTag.includes(term))) return 'Academic';
    
    return 'General';
  }

  private analyzeDomainRelationships(domains: any[]): any[] {
    // Simple relationship analysis based on domain proximity
    const relationships = [];
    
    for (let i = 0; i < domains.length - 1; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const similarity = this.calculateDomainSimilarity(domains[i], domains[j]);
        if (similarity > 0.3) {
          relationships.push({
            domain1: domains[i].name,
            domain2: domains[j].name,
            strength: similarity
          });
        }
      }
    }
    
    return relationships;
  }

  private calculateDomainSimilarity(domain1: any, domain2: any): number {
    // Simple similarity based on domain type and prevalence
    if (domain1.type === domain2.type) return 0.5;
    return 0.1;
  }
}

/**
 * Optimization Analysis Node - For large, complex vaults
 */
export class OptimizationAnalysisNode extends AnalysisNode {
  get name(): string { return "⚡ Optimization Analysis"; }
  get description(): string { return "Identifying performance and organizational optimization opportunities"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Analyzing optimization opportunities...",
      "Identifying bottlenecks and enhancement possibilities for large-scale operations",
      [],
      this.getPhaseNumber()
    );

    await this.think(1200);

    const optimizations: string[] = [];
    
    // Analyze structure efficiency
    if (data.vaultStructure.totalFolders > 50) {
      optimizations.push("Folder hierarchy consolidation opportunities");
    }
    
    // Analyze metadata consistency
    const metadataConsistency = this.analyzeMetadataConsistency(data);
    if (metadataConsistency < 0.7) {
      optimizations.push("Metadata standardization needed");
    }
    
    // Analyze link density optimization
    if (data.relationships.linkDensity < 0.1) {
      optimizations.push("Knowledge connection enhancement recommended");
    }
    
    // Analyze tag system efficiency
    if (data.contentPatterns.tagCategories.size > 30) {
      optimizations.push("Tag taxonomy consolidation beneficial");
    }

    const thinking = this.createThinkingChain(
      `Identified ${optimizations.length} optimization opportunities for enhanced efficiency`,
      `Large-scale vaults benefit from systematic optimization to maintain usability`,
      `Strategic improvements can significantly enhance AI assistance effectiveness`,
      `Optimization should preserve existing workflows while improving efficiency`
    );

    const discoveries = [
      `⚡ ${optimizations.length} optimization opportunities identified`,
      `📈 Performance enhancement potential detected`,
      `🎯 Structural improvements recommended`,
      `🔧 Workflow efficiency gains possible`
    ];

    this.reportProgress(
      "Optimization analysis complete",
      `${thinking.observation}. ${thinking.analysis}. ${thinking.hypothesis}.`,
      discoveries,
      this.getPhaseNumber(),
      true
    );

    // Update insights with optimization information
    data.insights.organizationPrinciples.push(...optimizations);
    
    return data;
  }

  private getPhaseNumber(): number {
    return 5; // Default position
  }

  private analyzeMetadataConsistency(data: AnalysisData): number {
    // Simple consistency analysis based on frontmatter field distribution
    const totalFields = Array.from(data.contentPatterns.frontmatterFields.values())
      .reduce((sum, count) => sum + count, 0);
    const avgFieldUsage = totalFields / data.contentPatterns.frontmatterFields.size;
    
    // Consistency score based on how evenly fields are used
    return Math.min(avgFieldUsage / 10, 1.0);
  }
}

/**
 * Legacy Migration Analysis Node - For mixed organizational patterns
 */
export class LegacyMigrationNode extends AnalysisNode {
  get name(): string { return "🔄 Legacy Migration Analysis"; }
  get description(): string { return "Analyzing migration paths from legacy organizational patterns"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Analyzing legacy patterns...",
      "Identifying migration opportunities from existing organizational patterns",
      [],
      this.getPhaseNumber()
    );

    await this.think(1000);

    const migrationOpportunities: string[] = [];
    
    // Detect legacy patterns
    if (data.contentPatterns.namingConventions.length > 3) {
      migrationOpportunities.push("Naming convention standardization");
    }
    
    // Detect inconsistent organization
    const organizationInconsistencies = this.detectOrganizationInconsistencies(data);
    migrationOpportunities.push(...organizationInconsistencies);

    const thinking = this.createThinkingChain(
      `Detected ${migrationOpportunities.length} migration opportunities for organizational improvement`,
      `Legacy patterns can be gradually migrated to more efficient systems`,
      `Careful migration preserves valuable content while improving structure`,
      `AI can assist in systematic migration while maintaining content integrity`
    );

    const discoveries = [
      `🔄 ${migrationOpportunities.length} migration opportunities identified`,
      `📋 Legacy pattern analysis complete`,
      `🎯 Systematic improvement paths available`,
      `⚡ Gradual migration strategy recommended`
    ];

    this.reportProgress(
      "Legacy migration analysis complete",
      `${thinking.observation}. ${thinking.analysis}. ${thinking.hypothesis}.`,
      discoveries,
      this.getPhaseNumber(),
      true
    );

    // Update insights with migration information
    data.insights.organizationPrinciples.push(...migrationOpportunities);
    
    return data;
  }

  private getPhaseNumber(): number {
    return 6; // Default position
  }

  private detectOrganizationInconsistencies(data: AnalysisData): string[] {
    const inconsistencies: string[] = [];
    
    // Check for frontmatter inconsistencies
    if (data.contentPatterns.frontmatterFields.size > 10) {
      inconsistencies.push("Frontmatter field consolidation needed");
    }
    
    // Check for tag inconsistencies  
    if (data.contentPatterns.tagCategories.size > 25) {
      inconsistencies.push("Tag category optimization needed");
    }
    
    return inconsistencies;
  }
}

/**
 * Adaptive Workflow Engine for dynamic workflow construction
 */
export class AdaptiveWorkflowEngine {
  private app: App;
  private toolRegistry: ToolRegistry;
  private progressCallback: (progress: AnalysisProgress) => void;

  constructor(
    app: App, 
    toolRegistry: ToolRegistry, 
    progressCallback: (progress: AnalysisProgress) => void
  ) {
    this.app = app;
    this.toolRegistry = toolRegistry;
    this.progressCallback = progressCallback;
  }

  /**
   * Create optimal workflow based on project characteristics
   */
  async createOptimalWorkflow(profile: ProjectProfile): Promise<WorkflowStrategy> {
    console.log('🔧 Creating adaptive workflow for:', profile.complexity, 'vault');
    
    const selectedNodes = await this.selectOptimalNodes(profile);
    const executionOrder = this.determineExecutionOrder(profile.specializedNodes);
    const adaptationReasons = this.generateAdaptationReasons(profile);
    
    return {
      profile,
      selectedNodes,
      executionOrder,
      estimatedDuration: profile.estimatedAnalysisTime,
      adaptationReasons
    };
  }

  /**
   * Select optimal analysis nodes based on project profile
   */
  private async selectOptimalNodes(profile: ProjectProfile): Promise<AnalysisNode[]> {
    const nodes: AnalysisNode[] = [];
    
    for (const nodeType of profile.specializedNodes) {
      const node = await this.createNode(nodeType);
      if (node) {
        // Set phase number dynamically
        this.setPhaseNumber(node, nodes.length + 1);
        nodes.push(node);
      }
    }
    
    return nodes;
  }

  /**
   * Create specific analysis node by type
   */
  private async createNode(nodeType: AnalysisNodeType): Promise<AnalysisNode | null> {
    switch (nodeType) {
      case 'discovery':
        return new DiscoveryNode(this.app, this.toolRegistry, this.progressCallback);
      case 'deep_content_discovery':
        return new DeepContentDiscoveryNode(this.app, this.toolRegistry, this.progressCallback);
      case 'content_analysis':
        return new ContentAnalysisNode(this.app, this.toolRegistry, this.progressCallback);
      case 'pattern_recognition':
        return new PatternRecognitionNode(this.app, this.toolRegistry, this.progressCallback);
      case 'relationship_mapping':
        return new RelationshipMappingNode(this.app, this.toolRegistry, this.progressCallback);
      case 'insight_generation':
        return new InsightGenerationNode(this.app, this.toolRegistry, this.progressCallback);
      case 'instruction_synthesis':
        // DEPRECATED: Use dynamic instruction generation instead
        console.warn('⚠️ Static instruction_synthesis node deprecated. Using dynamic instruction generation.');
        return null;
      case 'dynamic_instruction_generation':
        return new DynamicInstructionGeneratorNode(this.app, this.toolRegistry, this.progressCallback);
      case 'dynamic_instruction_formatting':
        return new DynamicInstructionFormatterNode(this.app, this.toolRegistry, this.progressCallback);
      case 'final_instruction_synthesis':
        return new FinalInstructionSynthesisNode(this.app, this.toolRegistry, this.progressCallback);
      case 'domain_analysis':
        return new DomainAnalysisNode(this.app, this.toolRegistry, this.progressCallback);
      case 'optimization_analysis':
        return new OptimizationAnalysisNode(this.app, this.toolRegistry, this.progressCallback);
      case 'legacy_migration':
        return new LegacyMigrationNode(this.app, this.toolRegistry, this.progressCallback);
      default:
        console.warn(`Unknown node type: ${nodeType}`);
        return null;
    }
  }

  /**
   * Set phase number for dynamic progress reporting
   */
  private setPhaseNumber(node: AnalysisNode, phaseNumber: number): void {
    // Add phase number to node for dynamic reporting
    (node as any)._phaseNumber = phaseNumber;
    
    // Override getPhaseNumber method if it exists
    if (typeof (node as any).getPhaseNumber === 'function') {
      (node as any).getPhaseNumber = () => phaseNumber;
    }
  }

  /**
   * Determine optimal execution order for nodes
   */
  private determineExecutionOrder(nodeTypes: AnalysisNodeType[]): AnalysisNodeType[] {
    // Define dependency order - dynamic instruction generation replaces static synthesis
    const dependencyOrder: AnalysisNodeType[] = [
      'discovery',
      'deep_content_discovery', // Execute after basic discovery for comprehensive content analysis
      'content_analysis',
      'pattern_recognition',
      'domain_analysis',
      'relationship_mapping',
      'legacy_migration',
      'optimization_analysis',
      'insight_generation',
      // Dynamic instruction generation - replaces static instruction_synthesis
      'dynamic_instruction_generation', // Generate AI insights based on content analysis
      'dynamic_instruction_formatting', // Format insights into structured markdown
      'final_instruction_synthesis'     // Generate concise, localized OBSIUS.md
    ];

    // Filter nodes and replace deprecated instruction_synthesis with dynamic alternatives
    let filteredNodes = nodeTypes.filter(nodeType => nodeType !== 'instruction_synthesis');
    
    // If instruction_synthesis was requested, add dynamic alternatives
    if (nodeTypes.includes('instruction_synthesis')) {
      console.log('🔄 Replacing static instruction_synthesis with dynamic instruction generation');
      filteredNodes.push('dynamic_instruction_generation', 'dynamic_instruction_formatting', 'final_instruction_synthesis');
    }

    // Sort based on dependency order and remove duplicates
    const orderedNodes = dependencyOrder.filter(nodeType => filteredNodes.includes(nodeType));
    return [...new Set(orderedNodes)]; // Remove duplicates while preserving order
  }

  /**
   * Generate reasons for workflow adaptation
   */
  private generateAdaptationReasons(profile: ProjectProfile): string[] {
    const reasons: string[] = [];
    
    if (profile.complexity === 'simple') {
      reasons.push(`Streamlined ${profile.recommendedPhases}-phase analysis for focused vaults`);
    } else if (profile.complexity === 'complex') {
      reasons.push(`Comprehensive ${profile.recommendedPhases}-phase analysis for sophisticated vaults`);
    }
    
    if (profile.specializedNodes.includes('domain_analysis')) {
      reasons.push("Multi-domain analysis added for diverse knowledge areas");
    }
    
    if (profile.specializedNodes.includes('optimization_analysis')) {
      reasons.push("Performance optimization analysis for large-scale vault");
    }
    
    if (profile.specializedNodes.includes('legacy_migration')) {
      reasons.push("Migration analysis for organizational pattern improvements");
    }
    
    return reasons;
  }

  /**
   * Validate that critical tools are available before workflow execution
   */
  private async validateCriticalTools(): Promise<void> {
    console.log('🔧 Validating critical tools for workflow execution...');
    
    const criticalTools = [
      'project_explorer',
      'glob', 
      'read_many_files',
      'staged_file_analysis' // Optional but preferred
    ];
    
    const toolStatus = new Map<string, boolean>();
    const issues: string[] = [];
    
    for (const toolName of criticalTools) {
      try {
        const metadata = this.toolRegistry.getToolMetadata(toolName);
        const isAvailable = metadata && metadata.enabled;
        toolStatus.set(toolName, !!isAvailable);
        
        if (isAvailable) {
          console.log(`   ✅ ${toolName}: Available and enabled`);
        } else {
          const issue = `   ⚠️ ${toolName}: ${metadata ? 'Disabled' : 'Not registered'}`;
          console.warn(issue);
          
          // Only consider staged_file_analysis as optional
          if (toolName !== 'staged_file_analysis') {
            issues.push(issue);
          }
        }
      } catch (error) {
        const issue = `   ❌ ${toolName}: Validation failed - ${error}`;
        console.error(issue);
        
        if (toolName !== 'staged_file_analysis') {
          issues.push(issue);
        }
      }
    }
    
    // Report tool status summary
    const availableTools = Array.from(toolStatus.entries())
      .filter(([_, available]) => available)
      .map(([name]) => name);
      
    const unavailableTools = Array.from(toolStatus.entries())
      .filter(([_, available]) => !available)
      .map(([name]) => name);
    
    console.log(`🔧 Tool validation summary:`);
    console.log(`   - Available: ${availableTools.join(', ')}`);
    console.log(`   - Unavailable: ${unavailableTools.join(', ')}`);
    
    // Check if we have minimum required tools
    const hasBasicTools = toolStatus.get('project_explorer') && 
                         (toolStatus.get('glob') || toolStatus.get('read_many_files'));
    
    if (!hasBasicTools) {
      throw new Error(`Critical tools missing for workflow execution: ${issues.join(', ')}`);
    }
    
    // Log fallback strategy if staged_file_analysis is unavailable
    if (!toolStatus.get('staged_file_analysis')) {
      console.log('🔄 staged_file_analysis unavailable - dynamic instruction generation will use fallback strategies');
    }
    
    console.log('✅ Tool validation completed - workflow can proceed');
  }

  /**
   * Execute adaptive workflow
   */
  async executeWorkflow(strategy: WorkflowStrategy): Promise<AnalysisData> {
    const startTime = Date.now();
    
    // 🔧 VALIDATION: Check critical tools before executing workflow
    await this.validateCriticalTools();
    
    // Initialize analysis data
    let analysisData: AnalysisData = {
      vaultStructure: {
        totalFiles: 0,
        totalFolders: 0,
        fileTypes: new Map(),
        folderHierarchy: {}
      },
      contentPatterns: {
        frontmatterFields: new Map(),
        tagCategories: new Map(),
        linkPatterns: [],
        namingConventions: []
      },
      relationships: {
        centralNodes: [],
        clusters: [],
        linkDensity: 0
      },
      insights: {
        primaryDomains: [],
        workflowPatterns: [],
        organizationPrinciples: []
      }
    };

    // Execute nodes in optimal order
    for (const node of strategy.selectedNodes) {
      try {
        analysisData = await node.execute(analysisData);
      } catch (error) {
        console.error(`Node execution failed: ${node.name}`, error);
        this.progressCallback({
          phase: node.name,
          phaseNumber: strategy.selectedNodes.indexOf(node) + 1,
          totalPhases: strategy.selectedNodes.length,
          action: "Error occurred",
          thinking: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          discoveries: [],
          timeElapsed: Date.now() - startTime,
          completed: false
        });
        throw error;
      }
    }

    return analysisData;
  }
}