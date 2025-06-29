/**
 * Final Instruction Synthesis Node - Vault Knowledge Structure Mapping
 * 
 * This node creates a concise knowledge map that focuses on vault-specific
 * characteristics and content structure, NOT on tool usage instructions.
 * 
 * Key features:
 * - Extracts vault-specific knowledge structure and patterns
 * - Generates concise vault knowledge map (30-50 lines)
 * - Focuses on WHAT the vault contains, not HOW to use Obsius
 * - Identifies actual usage patterns and content relationships
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { AnalysisNode, AnalysisData, AnalysisProgress } from './VaultAnalysisWorkflow';
import { getEffectiveChatLanguage } from '../../utils/i18n';

/**
 * Vault knowledge structure components
 */
export interface VaultKnowledgeMap {
  vaultProfile: string;
  knowledgeDomains: { name: string; description: string; folderPath: string; }[];
  folderStructure: { name: string; purpose: string; contentType: string; }[];
  usagePatterns: { pattern: string; evidence: string[]; }[];
  contentRelationships: { domain1: string; domain2: string; relationship: string; }[];
  knowledgeClusters: { 
    clusterName: string; 
    clusterType: 'topic' | 'importance' | 'contentType' | 'usage';
    members: string[]; 
    centralConcept: string;
    strength: number;
  }[];
  languageUsed: string;
  generatedAt: string;
}

/**
 * Final Instruction Synthesis Node - Creates concise, localized OBSIUS.md
 */
export class FinalInstructionSynthesisNode extends AnalysisNode {
  get name(): string { return "🗺️ Vault Knowledge Mapping"; }
  get description(): string { return "Creating concise vault knowledge map focused on content structure and patterns"; }

  async execute(data: AnalysisData): Promise<AnalysisData> {
    this.reportProgress(
      "Mapping vault knowledge structure...",
      "Analyzing vault content patterns and knowledge organization",
      [
        "🏗️ Identifying actual folder purposes and content types",
        "🧠 Discovering knowledge domains from real content", 
        "🔍 Detecting usage patterns and content relationships",
        "🗺️ Creating focused vault knowledge map"
      ],
      this.getPhaseNumber()
    );

    await this.think(800);

    try {
      // Get user's effective language
      const effectiveLanguage = getEffectiveChatLanguage();
      
      // Analyze vault knowledge structure from actual content
      const knowledgeMap = this.analyzeVaultKnowledgeStructure(data);
      
      this.reportProgress(
        "Analyzing vault content structure...",
        `Discovered ${knowledgeMap.knowledgeDomains.length} knowledge domains and ${knowledgeMap.folderStructure.length} content areas`,
        [
          `🎯 Language: ${effectiveLanguage === 'ja' ? '日本語' : 'English'}`,
          `📁 Content areas: ${knowledgeMap.folderStructure.slice(0, 3).map(f => f.name).join(', ')}`,
          `🧠 Knowledge domains: ${knowledgeMap.knowledgeDomains.slice(0, 3).map(d => d.name).join(', ')}`,
          `📋 Usage patterns: ${knowledgeMap.usagePatterns.length} identified`
        ],
        this.getPhaseNumber()
      );

      await this.think(1000);

      // Generate vault knowledge map document
      const knowledgeDocument = await this.generateKnowledgeMapDocument(knowledgeMap, effectiveLanguage);
      
      this.reportProgress(
        "Vault knowledge mapping complete",
        "Generated concise vault knowledge map focused on content structure",
        [
          `✅ Language: ${effectiveLanguage === 'ja' ? '日本語' : 'English'}`,
          `📄 Document length: ${knowledgeDocument.length} characters (focused)`,
          `🗺️ Knowledge structure focus - no tool instructions`,
          `📊 Content-driven insights and relationships`
        ],
        this.getPhaseNumber(),
        true
      );

      // Store the knowledge map document
      data.finalInstructions = {
        document: knowledgeDocument,
        language: effectiveLanguage,
        generatedAt: new Date().toISOString(),
        characterCount: knowledgeDocument.length
      };

      return data;

    } catch (error) {
      console.error('Vault knowledge mapping failed:', error);
      throw new Error(`Vault knowledge mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze vault knowledge structure from actual content and patterns
   * Enhanced to leverage sophisticated analysis from EnhancedDeepContentDiscoveryNode
   */
  private analyzeVaultKnowledgeStructure(data: AnalysisData): VaultKnowledgeMap {
    const knowledgeDomains: { name: string; description: string; folderPath: string; }[] = [];
    const folderStructure: { name: string; purpose: string; contentType: string; }[] = [];
    const usagePatterns: { pattern: string; evidence: string[]; }[] = [];
    const contentRelationships: { domain1: string; domain2: string; relationship: string; }[] = [];

    // Prioritize enhanced content analysis if available
    if (data.enhancedContent) {
      return this.analyzeFromEnhancedContent(data);
    }
    
    // Fallback to deep content analysis
    if (data.deepContent?.folderSummaries) {
      for (const folder of data.deepContent.folderSummaries) {
        const actualPurpose = this.analyzeFolderContentPurpose(folder);
        const contentType = this.determineContentType(folder);
        
        folderStructure.push({
          name: folder.folderPath || 'Unknown',
          purpose: actualPurpose,
          contentType: contentType
        });

        // Extract knowledge domains from actual content
        if (this.isKnowledgeDomain(folder)) {
          knowledgeDomains.push({
            name: this.extractDomainName(folder),
            description: this.generateDomainDescription(folder),
            folderPath: folder.folderPath || ''
          });
        }
      }
    }

    // Detect usage patterns from content patterns
    usagePatterns.push(...this.detectActualUsagePatterns(data));

    // Identify content relationships
    contentRelationships.push(...this.analyzeContentRelationships(data));

    // Generate basic knowledge clusters for fallback analysis
    const knowledgeClusters = this.generateBasicKnowledgeClusters(data, getEffectiveChatLanguage());

    return {
      vaultProfile: this.generateVaultProfile(data),
      knowledgeDomains,
      folderStructure,
      usagePatterns,
      contentRelationships,
      knowledgeClusters,
      languageUsed: getEffectiveChatLanguage(),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate a comprehensive vault profile from analysis data
   */
  private generateVaultProfile(data: AnalysisData): string {
    const totalFiles = data.vaultStructure?.totalFiles || 0;
    const totalFolders = data.vaultStructure?.totalFolders || 0;
    const primaryDomains = data.insights?.primaryDomains?.length || 0;
    const language = getEffectiveChatLanguage();

    if (language === 'ja') {
      return `${totalFiles}個のファイル、${totalFolders}個のフォルダを持つ${primaryDomains}分野の知識管理システム`;
    } else {
      return `Knowledge management system with ${totalFiles} files across ${totalFolders} folders, covering ${primaryDomains} primary domains`;
    }
  }

  /**
   * Analyze folder content purpose from its actual characteristics
   */
  private analyzeFolderContentPurpose(folder: any): string {
    const name = (folder.folderPath || '').toLowerCase();
    const language = getEffectiveChatLanguage();
    
    if (language === 'ja') {
      if (name.includes('journal') || name.includes('日記')) return '日記・ライフログ';
      if (name.includes('permanent')) return '恒久的知識・参考資料';
      if (name.includes('index')) return '体系的分類・索引';
      if (name.includes('temp') || name.includes('templates')) return 'テンプレート・一時保存';
      if (name.includes('audio')) return 'オーディオ機器・音響';
      if (name.includes('fragrance')) return '香水・フレグランス';
      if (name.includes('technology') || name.includes('tech')) return '技術・開発';
      if (name.includes('apps')) return 'アプリ設定・ツール';
      return 'その他コンテンツ';
    } else {
      if (name.includes('journal') || name.includes('diary')) return 'Journal & Life Logging';
      if (name.includes('permanent') || name.includes('evergreen')) return 'Permanent Knowledge & Reference';
      if (name.includes('index') || name.includes('hub')) return 'Systematic Classification & Index';
      if (name.includes('temp') || name.includes('templates')) return 'Templates & Temporary Storage';
      if (name.includes('audio')) return 'Audio Equipment & Sound';
      if (name.includes('fragrance')) return 'Fragrance & Perfume';
      if (name.includes('technology') || name.includes('tech')) return 'Technology & Development';
      if (name.includes('apps')) return 'App Settings & Tools';
      return 'Other Content';
    }
  }

  /**
   * Determine content type from folder characteristics
   */
  private determineContentType(folder: any): string {
    const name = (folder.folderPath || '').toLowerCase();
    const fileCount = folder.fileCount || 0;
    const language = getEffectiveChatLanguage();
    
    if (language === 'ja') {
      if (name.includes('image') || name.includes('photo')) return '画像・写真';
      if (name.includes('document') || name.includes('docs')) return '文書・ドキュメント';
      if (name.includes('note') || name.includes('memo')) return 'ノート・メモ';
      if (name.includes('config') || name.includes('setting')) return '設定・構成';
      if (fileCount > 50) return '大量コンテンツ';
      if (fileCount > 10) return '中程度コンテンツ';
      return '少量コンテンツ';
    } else {
      if (name.includes('image') || name.includes('photo')) return 'Images & Photos';
      if (name.includes('document') || name.includes('docs')) return 'Documents & Files';
      if (name.includes('note') || name.includes('memo')) return 'Notes & Memos';
      if (name.includes('config') || name.includes('setting')) return 'Configuration & Settings';
      if (fileCount > 50) return 'High-volume Content';
      if (fileCount > 10) return 'Medium-volume Content';
      return 'Low-volume Content';
    }
  }

  /**
   * Detect actual usage patterns from vault content
   */
  private detectActualUsagePatterns(data: AnalysisData): { pattern: string; evidence: string[]; }[] {
    const patterns: { pattern: string; evidence: string[]; }[] = [];
    const language = getEffectiveChatLanguage();
    
    // Analyze frontmatter usage patterns
    if (data.contentPatterns?.frontmatterFields) {
      const fieldCount = data.contentPatterns.frontmatterFields.size;
      if (fieldCount > 0) {
        const evidence = Array.from(data.contentPatterns.frontmatterFields.keys()).slice(0, 3);
        if (language === 'ja') {
          patterns.push({
            pattern: 'フロントマターを使った構造化メタデータ',
            evidence: evidence
          });
        } else {
          patterns.push({
            pattern: 'Structured metadata using frontmatter',
            evidence: evidence
          });
        }
      }
    }
    
    // Analyze tagging patterns
    if (data.contentPatterns?.tagCategories) {
      const tagCount = data.contentPatterns.tagCategories.size;
      if (tagCount > 0) {
        const evidence = Array.from(data.contentPatterns.tagCategories.keys()).slice(0, 3);
        if (language === 'ja') {
          patterns.push({
            pattern: 'カテゴリー別タグ分類システム',
            evidence: evidence
          });
        } else {
          patterns.push({
            pattern: 'Categorical tagging classification system',
            evidence: evidence
          });
        }
      }
    }
    
    // Analyze naming conventions
    if (data.contentPatterns?.namingConventions) {
      const conventions = data.contentPatterns.namingConventions;
      if (conventions.length > 0) {
        if (language === 'ja') {
          patterns.push({
            pattern: '一貫した命名規則の使用',
            evidence: conventions.slice(0, 3)
          });
        } else {
          patterns.push({
            pattern: 'Consistent naming convention usage',
            evidence: conventions.slice(0, 3)
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Analyze content relationships between knowledge domains
   */
  private analyzeContentRelationships(data: AnalysisData): { domain1: string; domain2: string; relationship: string; }[] {
    const relationships: { domain1: string; domain2: string; relationship: string; }[] = [];
    const language = getEffectiveChatLanguage();
    
    // Analyze relationships between primary domains
    const domains = data.insights?.primaryDomains || [];
    
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1 = domains[i];
        const domain2 = domains[j];
        
        // Determine relationship type based on domain characteristics
        let relationshipType = '';
        if (language === 'ja') {
          if (domain1.includes('技術') && domain2.includes('開発')) {
            relationshipType = '技術的関連性';
          } else if (domain1.includes('日記') && domain2.includes('個人')) {
            relationshipType = '個人的関連性';
          } else {
            relationshipType = '知識領域の関連性';
          }
        } else {
          if (domain1.includes('tech') && domain2.includes('development')) {
            relationshipType = 'Technical relationship';
          } else if (domain1.includes('journal') && domain2.includes('personal')) {
            relationshipType = 'Personal relationship';
          } else {
            relationshipType = 'Knowledge domain relationship';
          }
        }
        
        relationships.push({
          domain1,
          domain2,
          relationship: relationshipType
        });
      }
    }
    
    return relationships.slice(0, 5); // Limit to top 5 relationships
  }

  /**
   * Analyze vault structure using enhanced content analysis
   * This provides much more sophisticated and accurate vault understanding
   */
  private analyzeFromEnhancedContent(data: AnalysisData): VaultKnowledgeMap {
    const enhanced = data.enhancedContent!;
    const language = getEffectiveChatLanguage();
    
    // Extract knowledge domains from enhanced analysis
    const knowledgeDomains = enhanced.knowledgePatterns.primaryDomains.map((domain: string, index: number) => {
      const representativeFile = enhanced.representativeFiles[index];
      return {
        name: domain,
        description: this.generateEnhancedDomainDescription(domain, representativeFile, language),
        folderPath: representativeFile?.path.split('/').slice(0, -1).join('/') || domain
      };
    });
    
    // Extract folder structure from representative files and content distribution
    const folderStructure = this.extractFolderStructureFromEnhanced(enhanced, language);
    
    // Extract sophisticated usage patterns
    const usagePatterns = this.extractEnhancedUsagePatterns(enhanced, language);
    
    // Extract content relationships from knowledge connections
    const contentRelationships = this.extractEnhancedContentRelationships(enhanced, language);
    
    // Generate knowledge clusters for deeper understanding
    const knowledgeClusters = this.generateKnowledgeClusters(enhanced, language);
    
    return {
      vaultProfile: this.generateEnhancedVaultProfile(data, language),
      knowledgeDomains,
      folderStructure,
      usagePatterns,
      contentRelationships,
      knowledgeClusters,
      languageUsed: language,
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Generate enhanced domain description from sophisticated analysis
   */
  private generateEnhancedDomainDescription(domain: string, representativeFile: any, language: string): string {
    if (!representativeFile) {
      return language === 'ja' ? `${domain}に関する知識領域` : `Knowledge domain related to ${domain}`;
    }
    
    const keyTopics = representativeFile.keyTopics?.slice(0, 3) || [];
    const importance = Math.round(representativeFile.importance || 0);
    
    if (language === 'ja') {
      const topicsText = keyTopics.length > 0 ? `（${keyTopics.join('、')}）` : '';
      return `重要度${importance}/10の知識領域${topicsText}`;
    } else {
      const topicsText = keyTopics.length > 0 ? ` (${keyTopics.join(', ')})` : '';
      return `Knowledge domain with importance ${importance}/10${topicsText}`;
    }
  }
  
  /**
   * Extract folder structure from enhanced content analysis
   */
  private extractFolderStructureFromEnhanced(enhanced: any, language: string): { name: string; purpose: string; contentType: string; }[] {
    const folderMap = new Map<string, { files: any[]; types: string[]; }>();
    
    // Group representative files by folder
    for (const file of enhanced.representativeFiles) {
      const folderPath = file.path.split('/').slice(0, -1).join('/') || '.';
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, { files: [], types: [] });
      }
      folderMap.get(folderPath)!.files.push(file);
      if (file.category && !folderMap.get(folderPath)!.types.includes(file.category)) {
        folderMap.get(folderPath)!.types.push(file.category);
      }
    }
    
    const folderStructure: { name: string; purpose: string; contentType: string; }[] = [];
    
    for (const [folderPath, info] of folderMap.entries()) {
      const folderName = folderPath.split('/').pop() || folderPath;
      const avgImportance = info.files.reduce((sum, f) => sum + (f.importance || 0), 0) / info.files.length;
      
      folderStructure.push({
        name: folderName,
        purpose: this.generateFolderPurposeFromFiles(info.files, language),
        contentType: this.generateContentTypeFromFiles(info.files, avgImportance, language)
      });
    }
    
    return folderStructure;
  }
  
  /**
   * Generate folder purpose from actual file analysis
   */
  private generateFolderPurposeFromFiles(files: any[], language: string): string {
    const categories = files.map(f => f.category).filter(Boolean);
    const avgImportance = files.reduce((sum, f) => sum + (f.importance || 0), 0) / files.length;
    
    if (language === 'ja') {
      if (avgImportance > 8) return '中核的な知識管理';
      if (avgImportance > 5) return '重要な参考資料';
      if (categories.includes('hub')) return 'ナビゲーション・ハブ';
      if (categories.includes('technical')) return '技術文書・仕様';
      return '一般的なコンテンツ';
    } else {
      if (avgImportance > 8) return 'Core knowledge management';
      if (avgImportance > 5) return 'Important reference material';
      if (categories.includes('hub')) return 'Navigation hub';
      if (categories.includes('technical')) return 'Technical documentation';
      return 'General content';
    }
  }
  
  /**
   * Generate content type from file analysis
   */
  private generateContentTypeFromFiles(files: any[], avgImportance: number, language: string): string {
    const topicCount = files.reduce((sum, f) => sum + (f.keyTopics?.length || 0), 0);
    
    if (language === 'ja') {
      if (topicCount > 15) return '多様な専門知識';
      if (avgImportance > 7) return '高品質コンテンツ';
      if (files.length > 3) return '豊富なコンテンツ';
      return '標準的なコンテンツ';
    } else {
      if (topicCount > 15) return 'Diverse specialized knowledge';
      if (avgImportance > 7) return 'High-quality content';
      if (files.length > 3) return 'Rich content collection';
      return 'Standard content';
    }
  }
  
  /**
   * Extract sophisticated usage patterns from enhanced analysis
   */
  private extractEnhancedUsagePatterns(enhanced: any, language: string): { pattern: string; evidence: string[]; }[] {
    const patterns: { pattern: string; evidence: string[]; }[] = [];
    
    // Organization sophistication pattern
    const orgLevel = enhanced.vaultCharacteristics.organizationLevel;
    if (orgLevel === 'sophisticated') {
      patterns.push({
        pattern: language === 'ja' ? '高度な知識管理システム' : 'Sophisticated knowledge management system',
        evidence: enhanced.knowledgePatterns.organizationPrinciples.slice(0, 3)
      });
    }
    
    // Technical complexity pattern
    const complexity = enhanced.vaultCharacteristics.overallComplexity;
    if (complexity === 'complex') {
      patterns.push({
        pattern: language === 'ja' ? '複雑な技術文書管理' : 'Complex technical documentation management',
        evidence: enhanced.knowledgePatterns.technicalPatterns.slice(0, 3)
      });
    }
    
    // Knowledge connectivity pattern
    const connections = enhanced.knowledgePatterns.knowledgeConnections;
    if (connections.length > 10) {
      patterns.push({
        pattern: language === 'ja' ? '豊富な知識間連携' : 'Rich knowledge interconnection',
        evidence: connections.slice(0, 4)
      });
    }
    
    // Content focus pattern
    const contentFocus = enhanced.vaultCharacteristics.contentFocus;
    if (contentFocus.length > 0) {
      patterns.push({
        pattern: language === 'ja' ? '専門分野への集中' : 'Specialized domain focus',
        evidence: contentFocus.slice(0, 3)
      });
    }
    
    return patterns;
  }
  
  /**
   * Extract enhanced content relationships
   */
  private extractEnhancedContentRelationships(enhanced: any, language: string): { domain1: string; domain2: string; relationship: string; }[] {
    const relationships: { domain1: string; domain2: string; relationship: string; }[] = [];
    const domains = enhanced.knowledgePatterns.primaryDomains;
    
    // Create relationships between domains based on knowledge connections
    for (let i = 0; i < domains.length && i < 3; i++) {
      for (let j = i + 1; j < domains.length && j < 4; j++) {
        const domain1 = domains[i];
        const domain2 = domains[j];
        
        // Find connecting patterns between domains
        const connectionType = this.inferConnectionType(domain1, domain2, enhanced, language);
        
        relationships.push({
          domain1,
          domain2,
          relationship: connectionType
        });
      }
    }
    
    return relationships.slice(0, 5);
  }
  
  /**
   * Infer connection type between domains
   */
  private inferConnectionType(domain1: string, domain2: string, enhanced: any, language: string): string {
    const connections = enhanced.knowledgePatterns.knowledgeConnections;
    const sharedConnections = connections.filter((conn: string) => 
      conn.toLowerCase().includes(domain1.toLowerCase()) && 
      conn.toLowerCase().includes(domain2.toLowerCase())
    );
    
    if (language === 'ja') {
      if (sharedConnections.length > 0) return '共通概念による関連';
      if (domain1.includes('技術') || domain2.includes('技術')) return '技術的関連性';
      return '知識領域の相互補完';
    } else {
      if (sharedConnections.length > 0) return 'Shared conceptual relationship';
      if (domain1.includes('tech') || domain2.includes('tech')) return 'Technical relationship';
      return 'Complementary knowledge domains';
    }
  }
  
  /**
   * Generate enhanced vault profile
   */
  private generateEnhancedVaultProfile(data: AnalysisData, language: string): string {
    const enhanced = data.enhancedContent!;
    const staging = enhanced.stagingResults;
    const characteristics = enhanced.vaultCharacteristics;
    
    if (language === 'ja') {
      return `${staging.totalFilesAnalyzed}ファイル（詳細分析${staging.deepFilesRead}ファイル）の${characteristics.overallComplexity}レベル知識管理システム。${characteristics.organizationLevel}な組織化と${characteristics.knowledgeDepth}な知識構造を持つ。`;
    } else {
      return `${characteristics.overallComplexity.charAt(0).toUpperCase() + characteristics.overallComplexity.slice(1)}-level knowledge management system with ${staging.totalFilesAnalyzed} files (${staging.deepFilesRead} deeply analyzed). Features ${characteristics.organizationLevel} organization and ${characteristics.knowledgeDepth} knowledge structure.`;
    }
  }
  
  /**
   * Check if folder represents a knowledge domain
   */
  private isKnowledgeDomain(folder: any): boolean {
    const name = (folder.folderPath || '').toLowerCase();
    const fileCount = folder.fileCount || 0;
    
    // Consider it a knowledge domain if it has substantial content
    return fileCount > 3 && !name.includes('temp') && !name.includes('trash') && !name.includes('archive');
  }
  
  /**
   * Extract domain name from folder
   */
  private extractDomainName(folder: any): string {
    const path = folder.folderPath || 'Unknown';
    return path.split('/').pop() || path;
  }
  
  /**
   * Generate domain description from folder characteristics
   */
  private generateDomainDescription(folder: any): string {
    const name = (folder.folderPath || '').toLowerCase();
    const fileCount = folder.fileCount || 0;
    const language = getEffectiveChatLanguage();
    
    if (language === 'ja') {
      return `${fileCount}個のファイルを含む${this.analyzeFolderContentPurpose(folder)}`;
    } else {
      return `${this.analyzeFolderContentPurpose(folder)} containing ${fileCount} files`;
    }
  }
  
  /**
   * Generate vault knowledge map document
   */
  private async generateKnowledgeMapDocument(knowledgeMap: VaultKnowledgeMap, language: string): Promise<string> {
    const isJapanese = language === 'ja';
    const timestamp = new Date().toLocaleString(isJapanese ? 'ja-JP' : 'en-US');
    
    if (isJapanese) {
      return this.generateJapaneseKnowledgeMap(knowledgeMap, timestamp);
    } else {
      return this.generateEnglishKnowledgeMap(knowledgeMap, timestamp);
    }
  }
  
  /**
   * Generate Japanese vault knowledge map
   */
  private generateJapaneseKnowledgeMap(knowledgeMap: VaultKnowledgeMap, timestamp: string): string {
    return `---
created: ${knowledgeMap.generatedAt}
tags:
  - obsius
  - vault-knowledge
  - knowledge-structure
language: ja
---

# ヴォルト知識構造マップ

*${timestamp} 自動生成*

## ヴォルト概要

${knowledgeMap.vaultProfile}

## フォルダ構造と用途

${knowledgeMap.folderStructure.map(folder => 
  `- **${folder.name}**: ${folder.purpose} (${folder.contentType})`
).join('\n')}

## 知識領域

${knowledgeMap.knowledgeDomains.map(domain => 
  `- **${domain.name}**: ${domain.description}\n  - パス: \`${domain.folderPath}\``
).join('\n')}

## 運用パターン

${knowledgeMap.usagePatterns.map(pattern => 
  `- **${pattern.pattern}**\n  - 根拠: ${pattern.evidence.join(', ')}`
).join('\n')}

## コンテンツ関連性

${knowledgeMap.contentRelationships.map(rel => 
  `- ${rel.domain1} ↔ ${rel.domain2}: ${rel.relationship}`
).join('\n')}

## 知識クラスター

${knowledgeMap.knowledgeClusters.map(cluster => 
  `- **${cluster.clusterName}** (${cluster.clusterType})\n  - 中核概念: ${cluster.centralConcept}\n  - 強度: ${cluster.strength}/10\n  - メンバー: ${cluster.members.join('、')}`
).join('\n\n')}

---

*このマップは実際のヴォルト内容から生成されました。構造変更時は \`/init\` で更新してください。*
`;
  }
  
  /**
   * Generate English vault knowledge map
   */
  private generateEnglishKnowledgeMap(knowledgeMap: VaultKnowledgeMap, timestamp: string): string {
    return `---
created: ${knowledgeMap.generatedAt}
tags:
  - obsius
  - vault-knowledge
  - knowledge-structure
language: en
---

# Vault Knowledge Structure Map

*Generated ${timestamp}*

## Vault Overview

${knowledgeMap.vaultProfile}

## Folder Structure & Purpose

${knowledgeMap.folderStructure.map(folder => 
  `- **${folder.name}**: ${folder.purpose} (${folder.contentType})`
).join('\n')}

## Knowledge Domains

${knowledgeMap.knowledgeDomains.map(domain => 
  `- **${domain.name}**: ${domain.description}\n  - Path: \`${domain.folderPath}\``
).join('\n')}

## Usage Patterns

${knowledgeMap.usagePatterns.map(pattern => 
  `- **${pattern.pattern}**\n  - Evidence: ${pattern.evidence.join(', ')}`
).join('\n')}

## Content Relationships

${knowledgeMap.contentRelationships.map(rel => 
  `- ${rel.domain1} ↔ ${rel.domain2}: ${rel.relationship}`
).join('\n')}

## Knowledge Clusters

${knowledgeMap.knowledgeClusters.map(cluster => 
  `- **${cluster.clusterName}** (${cluster.clusterType})\n  - Central concept: ${cluster.centralConcept}\n  - Strength: ${cluster.strength}/10\n  - Members: ${cluster.members.join(', ')}`
).join('\n\n')}

---

*This map was generated from actual vault content. Update with \`/init\` when structure changes.*
`;
  }
  
  /**
   * Generate sophisticated knowledge clusters from enhanced analysis
   */
  private generateKnowledgeClusters(enhanced: any, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    
    // Topic-based clustering
    clusters.push(...this.generateTopicClusters(enhanced, language));
    
    // Importance-based clustering  
    clusters.push(...this.generateImportanceClusters(enhanced, language));
    
    // Content type clustering
    clusters.push(...this.generateContentTypeClusters(enhanced, language));
    
    // Usage pattern clustering
    clusters.push(...this.generateUsagePatternClusters(enhanced, language));
    
    return clusters.slice(0, 8); // Limit to top 8 most meaningful clusters
  }
  
  /**
   * Generate topic-based clusters
   */
  private generateTopicClusters(enhanced: any, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    const topicGroups = new Map<string, string[]>();
    
    // Group files by shared key topics
    for (const file of enhanced.representativeFiles) {
      const keyTopics = file.keyTopics || [];
      for (const topic of keyTopics.slice(0, 3)) { // Top 3 topics per file
        if (!topicGroups.has(topic)) {
          topicGroups.set(topic, []);
        }
        topicGroups.get(topic)!.push(file.path.split('/').pop() || file.path);
      }
    }
    
    // Create clusters for topics with multiple files
    for (const [topic, files] of topicGroups.entries()) {
      if (files.length >= 2) {
        const strength = Math.min(10, files.length * 2); // Strength based on file count
        clusters.push({
          clusterName: language === 'ja' ? `${topic}トピック群` : `${topic} Topic Cluster`,
          clusterType: 'topic',
          members: files.slice(0, 5), // Limit to 5 members
          centralConcept: topic,
          strength
        });
      }
    }
    
    return clusters.slice(0, 3); // Top 3 topic clusters
  }
  
  /**
   * Generate importance-based clusters
   */
  private generateImportanceClusters(enhanced: any, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    const files = enhanced.representativeFiles;
    
    // Group by importance ranges
    const highImportance = files.filter((f: any) => (f.importance || 0) >= 8);
    const mediumImportance = files.filter((f: any) => (f.importance || 0) >= 5 && (f.importance || 0) < 8);
    const coreImportance = files.filter((f: any) => (f.importance || 0) >= 9);
    
    if (coreImportance.length >= 2) {
      clusters.push({
        clusterName: language === 'ja' ? '中核知識群' : 'Core Knowledge Cluster',
        clusterType: 'importance',
        members: coreImportance.slice(0, 4).map((f: any) => f.path.split('/').pop() || f.path),
        centralConcept: language === 'ja' ? '最重要コンテンツ' : 'Critical content',
        strength: 10
      });
    }
    
    if (highImportance.length >= 3) {
      clusters.push({
        clusterName: language === 'ja' ? '重要参考資料群' : 'High-Priority Reference Cluster',
        clusterType: 'importance', 
        members: highImportance.slice(0, 5).map((f: any) => f.path.split('/').pop() || f.path),
        centralConcept: language === 'ja' ? '重要な参考資料' : 'Important reference materials',
        strength: 8
      });
    }
    
    return clusters;
  }
  
  /**
   * Generate content type clusters
   */
  private generateContentTypeClusters(enhanced: any, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    const typeGroups = new Map<string, any[]>();
    
    // Group files by category
    for (const file of enhanced.representativeFiles) {
      const category = file.category || 'unknown';
      if (!typeGroups.has(category)) {
        typeGroups.set(category, []);
      }
      typeGroups.get(category)!.push(file);
    }
    
    // Create clusters for categories with multiple files
    for (const [category, files] of typeGroups.entries()) {
      if (files.length >= 2) {
        const avgImportance = files.reduce((sum, f) => sum + (f.importance || 0), 0) / files.length;
        const strength = Math.min(10, Math.round(avgImportance));
        
        clusters.push({
          clusterName: language === 'ja' ? `${category}コンテンツ群` : `${category} Content Cluster`,
          clusterType: 'contentType',
          members: files.slice(0, 5).map(f => f.path.split('/').pop() || f.path),
          centralConcept: category,
          strength
        });
      }
    }
    
    return clusters.slice(0, 2); // Top 2 content type clusters
  }
  
  /**
   * Generate usage pattern clusters
   */
  private generateUsagePatternClusters(enhanced: any, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    const characteristics = enhanced.vaultCharacteristics;
    
    // Cluster based on organization sophistication
    if (characteristics.organizationLevel === 'sophisticated') {
      const organizedFiles = enhanced.representativeFiles
        .filter((f: any) => (f.importance || 0) >= 6)
        .slice(0, 4);
        
      if (organizedFiles.length >= 2) {
        clusters.push({
          clusterName: language === 'ja' ? '高度組織化コンテンツ群' : 'Sophisticated Organization Cluster',
          clusterType: 'usage',
          members: organizedFiles.map((f: any) => f.path.split('/').pop() || f.path),
          centralConcept: language === 'ja' ? '体系的知識管理' : 'Systematic knowledge management',
          strength: 9
        });
      }
    }
    
    // Cluster based on knowledge depth
    if (characteristics.knowledgeDepth === 'deep') {
      const deepFiles = enhanced.representativeFiles
        .filter((f: any) => (f.keyTopics?.length || 0) >= 4)
        .slice(0, 3);
        
      if (deepFiles.length >= 2) {
        clusters.push({
          clusterName: language === 'ja' ? '深層知識群' : 'Deep Knowledge Cluster',
          clusterType: 'usage',
          members: deepFiles.map((f: any) => f.path.split('/').pop() || f.path),
          centralConcept: language === 'ja' ? '専門的深層知識' : 'Specialized deep knowledge',
          strength: 8
        });
      }
    }
    
    return clusters;
  }
  
  /**
   * Generate basic knowledge clusters for fallback analysis
   */
  private generateBasicKnowledgeClusters(data: AnalysisData, language: string): VaultKnowledgeMap['knowledgeClusters'] {
    const clusters: VaultKnowledgeMap['knowledgeClusters'] = [];
    
    // Create clusters based on primary domains
    const domains = data.insights?.primaryDomains || [];
    for (let i = 0; i < Math.min(domains.length, 3); i++) {
      const domain = domains[i];
      clusters.push({
        clusterName: language === 'ja' ? `${domain}知識群` : `${domain} Knowledge Group`,
        clusterType: 'topic',
        members: [domain], // Limited information in basic analysis
        centralConcept: domain,
        strength: 6 // Moderate strength for basic clustering
      });
    }
    
    // Create folder-based cluster if significant content
    const folderCount = data.vaultStructure?.totalFolders || 0;
    if (folderCount > 5) {
      clusters.push({
        clusterName: language === 'ja' ? '構造化組織群' : 'Structured Organization Group',
        clusterType: 'usage',
        members: language === 'ja' ? ['複数フォルダ構造'] : ['Multi-folder structure'],
        centralConcept: language === 'ja' ? 'フォルダベース組織' : 'Folder-based organization',
        strength: 5
      });
    }
    
    return clusters;
  }
  
  private getPhaseNumber(): number {
    return 11; // Final phase in the workflow
  }
}