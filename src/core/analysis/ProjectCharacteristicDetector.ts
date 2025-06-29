/**
 * Project Characteristic Detector - Adaptive workflow planning based on vault characteristics
 * Analyzes vault structure and content to determine optimal analysis workflow
 */

import { App, TFolder } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';

/**
 * Vault complexity levels for adaptive workflow planning
 */
export type VaultComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Organization sophistication levels
 */
export type OrganizationLevel = 'basic' | 'structured' | 'sophisticated';

/**
 * Analysis node types for specialized analysis
 */
export type AnalysisNodeType = 
  | 'discovery' 
  | 'deep_content_discovery' // NEW: Comprehensive folder+content analysis via Glob+ReadManyFiles
  | 'content_analysis' 
  | 'pattern_recognition'
  | 'relationship_mapping' 
  | 'insight_generation'
  | 'instruction_synthesis' // DEPRECATED: Static template-based instruction generation
  | 'final_instruction_synthesis' // NEW: Concise, localized OBSIUS.md generation
  | 'dynamic_instruction_generation' // NEW: AI-driven semantic analysis and insight generation
  | 'dynamic_instruction_formatting' // NEW: Convert insights to structured markdown
  | 'domain_analysis'      // For multi-domain vaults
  | 'optimization_analysis' // For large, complex vaults
  | 'legacy_migration'      // For vaults with mixed organizational patterns
  | 'collaboration_analysis'; // For shared/collaborative vaults

/**
 * Comprehensive project profile for adaptive workflow planning
 */
export interface ProjectProfile {
  complexity: VaultComplexity;
  organizationLevel: OrganizationLevel;
  estimatedAnalysisTime: number; // in minutes
  recommendedPhases: number;
  specializedNodes: AnalysisNodeType[];
  
  // Detailed characteristics
  domains: string[];
  primaryPatterns: string[];
  scaleChallenges: string[];
  optimizationOpportunities: string[];
  
  // Resource requirements
  maxItems: number;
  maxDepth: number;
  recommendedSampling: number;
}

/**
 * Initial vault scan data for characteristic analysis
 */
export interface VaultScan {
  totalFiles: number;
  totalFolders: number;
  fileTypes: Map<string, number>;
  folderDepth: number;
  largestFolderSize: number;
  averageFileSize: number;
  
  // Organizational indicators
  hasIndexFolder: boolean;
  hasPermanentFolder: boolean;
  hasJournalFolder: boolean;
  hasTemplatesFolder: boolean;
  hasProjectsFolder: boolean;
  
  // Content sophistication indicators
  frontmatterUsage: number; // percentage of files with frontmatter
  tagDiversity: number;     // number of unique tags
  linkDensity: number;      // estimated links per file
  
  // Technical indicators
  hasConfigFiles: boolean;
  hasGitRepo: boolean;
  hasAIInstructionFiles: boolean;
}

/**
 * Project Characteristic Detector for adaptive workflow planning
 */
export class ProjectCharacteristicDetector {
  private app: App;
  private toolRegistry: ToolRegistry;

  constructor(app: App, toolRegistry: ToolRegistry) {
    this.app = app;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Perform initial vault scan to gather basic characteristics
   */
  async performInitialScan(): Promise<VaultScan> {
    const vaultRoot = this.app.vault.getRoot();
    
    // Basic structure analysis
    const structureAnalysis = await this.analyzeVaultStructure(vaultRoot);
    
    // Organization pattern detection
    const organizationPatterns = await this.detectOrganizationPatterns(vaultRoot);
    
    // Content sophistication analysis
    const contentSophistication = await this.analyzeContentSophistication();
    
    // Merge with default values to ensure all required properties are present
    return {
      totalFiles: 0,
      totalFolders: 0,
      fileTypes: new Map<string, number>(),
      folderDepth: 0,
      largestFolderSize: 0,
      averageFileSize: 0,
      hasIndexFolder: false,
      hasPermanentFolder: false,
      hasJournalFolder: false,
      hasTemplatesFolder: false,
      hasProjectsFolder: false,
      frontmatterUsage: 0,
      tagDiversity: 0,
      linkDensity: 0,
      hasConfigFiles: false,
      hasGitRepo: false,
      hasAIInstructionFiles: false,
      ...structureAnalysis,
      ...organizationPatterns,
      ...contentSophistication
    };
  }

  /**
   * Analyze basic vault structure
   */
  private async analyzeVaultStructure(vaultRoot: TFolder): Promise<Partial<VaultScan>> {
    let totalFiles = 0;
    let totalFolders = 0;
    let maxDepth = 0;
    let largestFolderSize = 0;
    let totalFileSize = 0;
    const fileTypes = new Map<string, number>();

    const traverseFolder = (folder: TFolder, depth: number = 0) => {
      totalFolders++;
      maxDepth = Math.max(maxDepth, depth);
      
      let folderFileCount = 0;
      for (const child of folder.children) {
        if (child.hasOwnProperty('children')) { // TFolder
          traverseFolder(child as TFolder, depth + 1);
        } else { // TFile
          totalFiles++;
          folderFileCount++;
          
          const file = child as any;
          const extension = file.extension || 'unknown';
          fileTypes.set(extension, (fileTypes.get(extension) || 0) + 1);
          
          if (file.stat?.size) {
            totalFileSize += file.stat.size;
          }
        }
      }
      
      largestFolderSize = Math.max(largestFolderSize, folderFileCount);
    };

    traverseFolder(vaultRoot);

    return {
      totalFiles,
      totalFolders,
      fileTypes,
      folderDepth: maxDepth,
      largestFolderSize,
      averageFileSize: totalFiles > 0 ? totalFileSize / totalFiles : 0
    };
  }

  /**
   * Detect organizational patterns in the vault
   */
  private async detectOrganizationPatterns(vaultRoot: TFolder): Promise<Partial<VaultScan>> {
    const folderNames = vaultRoot.children
      .filter(child => child.hasOwnProperty('children'))
      .map(folder => folder.name.toLowerCase());

    return {
      hasIndexFolder: folderNames.some(name => name.includes('index')),
      hasPermanentFolder: folderNames.some(name => name.includes('permanent') || name.includes('evergreen')),
      hasJournalFolder: folderNames.some(name => name.includes('journal') || name.includes('daily')),
      hasTemplatesFolder: folderNames.some(name => name.includes('template')),
      hasProjectsFolder: folderNames.some(name => name.includes('project')),
      hasConfigFiles: await this.hasConfigurationFiles(),
      hasGitRepo: await this.hasGitRepository(),
      hasAIInstructionFiles: await this.hasAIInstructions()
    };
  }

  /**
   * Analyze content sophistication through sampling
   */
  private async analyzeContentSophistication(): Promise<Partial<VaultScan>> {
    try {
      // Use ProjectExplorerTool for quick content analysis
      const sampleResult = await this.toolRegistry.executeTool('project_explorer', {
        directory: '.',
        maxItems: 50, // Quick sample
        includeFileContent: true,
        includeKeyFiles: true,
        maxDepth: 3
      });

      if (!sampleResult.success || !sampleResult.data?.structure) {
        return this.getDefaultContentSophistication();
      }

      const structure = sampleResult.data.structure;
      
      // Analyze frontmatter usage
      const frontmatterMatches = (structure.match(/FRONTMATTER:/g) || []).length;
      const totalSamples = (structure.match(/###[^:]+:/g) || []).length;
      const frontmatterUsage = totalSamples > 0 ? frontmatterMatches / totalSamples : 0;

      // Analyze tag diversity
      const tagMatches = structure.match(/tags:\s*\n\s*-\s*[^\n]+/g) || [];
      const uniqueTags = new Set();
      for (const match of tagMatches) {
        const tag = match.replace(/tags:\s*\n\s*-\s*/, '').trim();
        uniqueTags.add(tag);
      }

      // Estimate link density (basic approximation)
      const linkMatches = (structure.match(/\[\[[^\]]+\]\]/g) || []).length;
      const linkDensity = totalSamples > 0 ? linkMatches / totalSamples : 0;

      return {
        frontmatterUsage: frontmatterUsage * 100,
        tagDiversity: uniqueTags.size,
        linkDensity
      };

    } catch (error) {
      console.warn('Content sophistication analysis failed:', error);
      return this.getDefaultContentSophistication();
    }
  }

  /**
   * Default content sophistication values
   */
  private getDefaultContentSophistication(): Partial<VaultScan> {
    return {
      frontmatterUsage: 0,
      tagDiversity: 0,
      linkDensity: 0
    };
  }

  /**
   * Check for configuration files
   */
  private async hasConfigurationFiles(): Promise<boolean> {
    const configFiles = ['package.json', 'tsconfig.json', 'manifest.json', '.gitignore'];
    for (const fileName of configFiles) {
      const file = this.app.vault.getAbstractFileByPath(fileName);
      if (file) return true;
    }
    return false;
  }

  /**
   * Check for git repository
   */
  private async hasGitRepository(): Promise<boolean> {
    const gitFolder = this.app.vault.getAbstractFileByPath('.git');
    return !!gitFolder;
  }

  /**
   * Check for AI instruction files
   */
  private async hasAIInstructions(): Promise<boolean> {
    const aiFiles = ['CLAUDE.md', 'GEMINI.md', 'OBSIUS.md'];
    for (const fileName of aiFiles) {
      const file = this.app.vault.getAbstractFileByPath(fileName);
      if (file) return true;
    }
    return false;
  }

  /**
   * Generate comprehensive project profile from vault scan
   */
  async generateProjectProfile(scan: VaultScan): Promise<ProjectProfile> {
    // Determine complexity level
    const complexity = this.determineComplexity(scan);
    
    // Determine organization level
    const organizationLevel = this.determineOrganizationLevel(scan);
    
    // Calculate recommended phases and specialized nodes
    const { recommendedPhases, specializedNodes } = this.calculateOptimalWorkflow(complexity, organizationLevel, scan);
    
    // Identify primary domains and patterns
    const domains = this.identifyDomains(scan);
    const primaryPatterns = this.identifyPrimaryPatterns(scan);
    
    // Identify challenges and opportunities
    const scaleChallenges = this.identifyScaleChallenges(scan);
    const optimizationOpportunities = this.identifyOptimizationOpportunities(scan);
    
    // Calculate resource requirements
    const resourceRequirements = this.calculateResourceRequirements(complexity, scan);

    return {
      complexity,
      organizationLevel,
      estimatedAnalysisTime: this.estimateAnalysisTime(recommendedPhases, scan.totalFiles),
      recommendedPhases,
      specializedNodes,
      domains,
      primaryPatterns,
      scaleChallenges,
      optimizationOpportunities,
      ...resourceRequirements
    };
  }

  /**
   * Determine vault complexity level
   */
  private determineComplexity(scan: VaultScan): VaultComplexity {
    let complexityScore = 0;

    // File count factor
    if (scan.totalFiles > 500) complexityScore += 3;
    else if (scan.totalFiles > 100) complexityScore += 2;
    else if (scan.totalFiles > 30) complexityScore += 1;

    // Folder structure factor
    if (scan.folderDepth > 5) complexityScore += 2;
    else if (scan.folderDepth > 3) complexityScore += 1;

    // Organization sophistication factor
    const organizationIndicators = [
      scan.hasIndexFolder,
      scan.hasPermanentFolder,
      scan.hasJournalFolder,
      scan.hasTemplatesFolder,
      scan.hasProjectsFolder
    ].filter(Boolean).length;
    
    if (organizationIndicators >= 4) complexityScore += 2;
    else if (organizationIndicators >= 2) complexityScore += 1;

    // Content sophistication factor
    if (scan.frontmatterUsage > 70) complexityScore += 2;
    else if (scan.frontmatterUsage > 30) complexityScore += 1;

    if (scan.tagDiversity > 20) complexityScore += 2;
    else if (scan.tagDiversity > 10) complexityScore += 1;

    // Technical sophistication factor
    if (scan.hasConfigFiles && scan.hasGitRepo && scan.hasAIInstructionFiles) complexityScore += 2;
    else if (scan.hasConfigFiles || scan.hasAIInstructionFiles) complexityScore += 1;

    // Determine final complexity
    if (complexityScore >= 8) return 'complex';
    if (complexityScore >= 4) return 'moderate';
    return 'simple';
  }

  /**
   * Determine organization level
   */
  private determineOrganizationLevel(scan: VaultScan): OrganizationLevel {
    let organizationScore = 0;

    // Structured folder system
    const structuredFolders = [
      scan.hasIndexFolder,
      scan.hasPermanentFolder,
      scan.hasJournalFolder,
      scan.hasTemplatesFolder
    ].filter(Boolean).length;

    organizationScore += structuredFolders;

    // Metadata usage
    if (scan.frontmatterUsage > 60) organizationScore += 2;
    else if (scan.frontmatterUsage > 20) organizationScore += 1;

    // Tagging system
    if (scan.tagDiversity > 15) organizationScore += 2;
    else if (scan.tagDiversity > 5) organizationScore += 1;

    // Link usage
    if (scan.linkDensity > 3) organizationScore += 2;
    else if (scan.linkDensity > 1) organizationScore += 1;

    if (organizationScore >= 6) return 'sophisticated';
    if (organizationScore >= 3) return 'structured';
    return 'basic';
  }

  /**
   * Calculate optimal workflow configuration
   */
  private calculateOptimalWorkflow(
    complexity: VaultComplexity,
    organizationLevel: OrganizationLevel,
    scan: VaultScan
  ): { recommendedPhases: number; specializedNodes: AnalysisNodeType[] } {
    // Base nodes: use dynamic instruction generation instead of static synthesis
    const baseNodes: AnalysisNodeType[] = [
      'discovery', 
      'deep_content_discovery', 
      'content_analysis', 
      'dynamic_instruction_generation',  // NEW: AI-driven semantic analysis
      'dynamic_instruction_formatting', // NEW: Format insights to markdown
      'final_instruction_synthesis'      // NEW: Concise, localized final output
    ];
    let specializedNodes: AnalysisNodeType[] = [...baseNodes];
    
    // Add nodes based on complexity
    if (complexity === 'moderate' || complexity === 'complex') {
      specializedNodes.push('pattern_recognition', 'insight_generation');
    }
    
    if (complexity === 'complex') {
      specializedNodes.push('relationship_mapping');
      
      // Large vaults need optimization analysis
      if (scan.totalFiles > 300) {
        specializedNodes.push('optimization_analysis');
      }
      
      // Multi-domain vaults need domain analysis
      if (scan.tagDiversity > 20 || scan.folderDepth > 4) {
        specializedNodes.push('domain_analysis');
      }
    }

    // Add nodes based on organization level
    if (organizationLevel === 'sophisticated') {
      if (!specializedNodes.includes('relationship_mapping')) {
        specializedNodes.push('relationship_mapping');
      }
    }

    // Detect legacy/migration needs
    if (scan.largestFolderSize > 50 && organizationLevel === 'basic') {
      specializedNodes.push('legacy_migration');
    }

    return {
      recommendedPhases: specializedNodes.length,
      specializedNodes
    };
  }

  /**
   * Identify primary domains from vault characteristics
   */
  private identifyDomains(scan: VaultScan): string[] {
    const domains: string[] = [];
    
    // Domain detection based on folder patterns
    if (scan.hasJournalFolder) domains.push('Personal Knowledge Management');
    if (scan.hasPermanentFolder) domains.push('Zettelkasten');
    if (scan.hasProjectsFolder) domains.push('Project Management');
    if (scan.hasConfigFiles) domains.push('Technical Development');
    if (scan.hasAIInstructionFiles) domains.push('AI-Assisted Workflows');
    
    return domains.length > 0 ? domains : ['General Knowledge Management'];
  }

  /**
   * Identify primary organizational patterns
   */
  private identifyPrimaryPatterns(scan: VaultScan): string[] {
    const patterns: string[] = [];
    
    if (scan.hasIndexFolder) patterns.push('Hub-based navigation');
    if (scan.hasPermanentFolder) patterns.push('Atomic note system');
    if (scan.hasJournalFolder) patterns.push('Temporal organization');
    if (scan.frontmatterUsage > 50) patterns.push('Structured metadata');
    if (scan.tagDiversity > 10) patterns.push('Taxonomic categorization');
    if (scan.linkDensity > 2) patterns.push('Dense linking network');
    
    return patterns;
  }

  /**
   * Identify scale challenges
   */
  private identifyScaleChallenges(scan: VaultScan): string[] {
    const challenges: string[] = [];
    
    if (scan.totalFiles > 500) challenges.push('Large file volume management');
    if (scan.largestFolderSize > 100) challenges.push('Oversized folder organization');
    if (scan.folderDepth > 6) challenges.push('Deep hierarchy navigation');
    if (scan.tagDiversity > 50) challenges.push('Tag proliferation control');
    
    return challenges;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(scan: VaultScan): string[] {
    const opportunities: string[] = [];
    
    if (scan.frontmatterUsage < 30) opportunities.push('Metadata standardization');
    if (scan.linkDensity < 1) opportunities.push('Knowledge connection enhancement');
    if (!scan.hasIndexFolder) opportunities.push('Navigation hub creation');
    if (!scan.hasTemplatesFolder) opportunities.push('Template system implementation');
    
    return opportunities;
  }

  /**
   * Calculate resource requirements
   */
  private calculateResourceRequirements(complexity: VaultComplexity, scan: VaultScan): { maxItems: number; maxDepth: number; recommendedSampling: number } {
    const baseRequirements = {
      simple: { maxItems: 200, maxDepth: 3, recommendedSampling: 8 },
      moderate: { maxItems: 500, maxDepth: 4, recommendedSampling: 12 },
      complex: { maxItems: 1000, maxDepth: 6, recommendedSampling: 20 }
    };

    return baseRequirements[complexity];
  }

  /**
   * Estimate analysis time based on phases and vault size
   */
  private estimateAnalysisTime(phases: number, fileCount: number): number {
    const baseTimePerPhase = 0.5; // 30 seconds per phase minimum
    const fileFactor = Math.min(fileCount / 100, 3); // Max 3x multiplier for file count
    
    return Math.round(phases * baseTimePerPhase * (1 + fileFactor * 0.5));
  }

  /**
   * Main method to analyze vault and generate project profile
   */
  async analyzeVault(): Promise<ProjectProfile> {
    console.log('🔍 Starting project characteristic detection...');
    
    const scan = await this.performInitialScan();
    console.log('📊 Initial scan complete:', {
      files: scan.totalFiles,
      folders: scan.totalFolders,
      complexity: 'calculating...'
    });
    
    const profile = await this.generateProjectProfile(scan);
    console.log('🎯 Project profile generated:', {
      complexity: profile.complexity,
      phases: profile.recommendedPhases,
      estimatedTime: `${profile.estimatedAnalysisTime}min`
    });
    
    return profile;
  }
}