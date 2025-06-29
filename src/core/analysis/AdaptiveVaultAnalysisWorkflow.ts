/**
 * Adaptive Vault Analysis Workflow - Dynamic multi-stage analysis with localization
 * Provides intelligent, adaptive vault analysis with multi-language support
 */

import { App } from 'obsidian';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { AnalysisData, AnalysisProgress } from './VaultAnalysisWorkflow';
import { ProjectCharacteristicDetector, ProjectProfile } from './ProjectCharacteristicDetector';
import { AdaptiveWorkflowEngine, WorkflowStrategy } from './AdaptiveWorkflowEngine';
import { LocalizedAnalysisReporter, SupportedLanguage } from './LocalizedAnalysisReporter';

/**
 * Enhanced adaptive workflow configuration
 */
export interface AdaptiveWorkflowConfig {
  language: SupportedLanguage;
  userSettings?: {
    chatLanguage?: string;
    interfaceLanguage?: string;
  };
  forceComplexity?: 'simple' | 'moderate' | 'complex';
  customNodes?: string[];
  enableOptimization?: boolean;
}

/**
 * Adaptive Vault Analysis Workflow Manager
 */
export class AdaptiveVaultAnalysisWorkflow {
  private app: App;
  private toolRegistry: ToolRegistry;
  private progressCallback: (progress: AnalysisProgress) => void;
  private localizedReporter: LocalizedAnalysisReporter;
  private characteristicDetector: ProjectCharacteristicDetector;
  private workflowEngine: AdaptiveWorkflowEngine;

  constructor(
    app: App,
    toolRegistry: ToolRegistry,
    progressCallback: (progress: AnalysisProgress) => void,
    config: AdaptiveWorkflowConfig
  ) {
    this.app = app;
    this.toolRegistry = toolRegistry;
    this.progressCallback = progressCallback;
    
    // Initialize language detection and localization
    this.localizedReporter = new LocalizedAnalysisReporter(config.language);
    
    // Initialize adaptive components
    this.characteristicDetector = new ProjectCharacteristicDetector(app, toolRegistry);
    this.workflowEngine = new AdaptiveWorkflowEngine(
      app, 
      toolRegistry, 
      (progress) => this.handleLocalizedProgress(progress)
    );
  }

  /**
   * Execute complete adaptive analysis workflow
   */
  async execute(): Promise<AnalysisData> {
    const startTime = Date.now();
    
    try {
      // Phase 0: Project Characteristic Detection
      this.displayPreAnalysisInfo();
      
      const projectProfile = await this.characteristicDetector.analyzeVault();
      
      this.displayProfileSummary(projectProfile);
      
      // Create adaptive workflow strategy
      const workflowStrategy = await this.workflowEngine.createOptimalWorkflow(projectProfile);
      
      this.displayWorkflowStrategy(workflowStrategy);
      
      // Execute adaptive workflow
      const analysisData = await this.workflowEngine.executeWorkflow(workflowStrategy);
      
      // Final completion report
      this.displayFinalSummary(analysisData, Date.now() - startTime);
      
      return analysisData;
      
    } catch (error) {
      this.displayError(error as Error);
      throw error;
    }
  }

  /**
   * Handle localized progress reporting
   */
  private handleLocalizedProgress(progress: AnalysisProgress): void {
    // Create localized version of progress
    const localizedProgress: AnalysisProgress = {
      ...progress,
      action: this.localizedReporter.getLocalizedAction(progress.phase, 0),
      thinking: this.localizedReporter.getLocalizedThinking(progress.phase, 0)
    };
    
    this.progressCallback(localizedProgress);
  }

  /**
   * Display pre-analysis information
   */
  private displayPreAnalysisInfo(): void {
    const lang = this.localizedReporter.getLanguage();
    
    const messages = {
      ja: {
        starting: '🧠 アダプティブ・ヴォルト分析を開始しています...',
        detecting: '🔍 プロジェクト特性を検出中...',
        optimizing: '⚡ 最適な分析ワークフローを決定します'
      },
      en: {
        starting: '🧠 Starting adaptive vault analysis...',
        detecting: '🔍 Detecting project characteristics...',
        optimizing: '⚡ Determining optimal analysis workflow'
      }
    };

    this.progressCallback({
      phase: messages[lang].starting,
      phaseNumber: 0,
      totalPhases: 0,
      action: messages[lang].detecting,
      thinking: messages[lang].optimizing,
      discoveries: [],
      timeElapsed: Date.now(),
      completed: false
    });
  }

  /**
   * Display project profile summary
   */
  private displayProfileSummary(profile: ProjectProfile): void {
    const lang = this.localizedReporter.getLanguage();
    
    const complexityLabels = {
      ja: { simple: 'シンプル', moderate: '中程度', complex: '複雑' },
      en: { simple: 'Simple', moderate: 'Moderate', complex: 'Complex' }
    };
    
    const orgLabels = {
      ja: { basic: '基本的', structured: '構造化', sophisticated: '洗練' },
      en: { basic: 'Basic', structured: 'Structured', sophisticated: 'Sophisticated' }
    };

    const messages = {
      ja: {
        profile: '📊 プロジェクト特性分析完了',
        analyzing: 'ヴォルト特性を分析しています',
        understanding: `複雑度: ${complexityLabels.ja[profile.complexity]}, 組織レベル: ${orgLabels.ja[profile.organizationLevel]}`
      },
      en: {
        profile: '📊 Project Profile Analysis Complete',
        analyzing: 'Analyzing vault characteristics',
        understanding: `Complexity: ${complexityLabels.en[profile.complexity]}, Organization: ${orgLabels.en[profile.organizationLevel]}`
      }
    };

    const discoveries = [
      `📁 ${profile.complexity === 'simple' ? 
        (lang === 'ja' ? `${profile.recommendedPhases}段階の効率的分析` : `${profile.recommendedPhases}-phase efficient analysis`) :
        (lang === 'ja' ? `${profile.recommendedPhases}段階の包括的分析` : `${profile.recommendedPhases}-phase comprehensive analysis`)
      }`,
      `⏱️ ${lang === 'ja' ? `推定時間: ${profile.estimatedAnalysisTime}分` : `Estimated time: ${profile.estimatedAnalysisTime}min`}`,
      `🎯 ${lang === 'ja' ? `主要ドメイン: ${profile.domains.slice(0, 2).join(', ')}` : `Primary domains: ${profile.domains.slice(0, 2).join(', ')}`}`,
      `🔧 ${lang === 'ja' ? `特殊分析: ${profile.specializedNodes.length}ノード` : `Specialized analysis: ${profile.specializedNodes.length} nodes`}`
    ];

    this.progressCallback({
      phase: messages[lang].profile,
      phaseNumber: 0,
      totalPhases: profile.recommendedPhases,
      action: messages[lang].analyzing,
      thinking: messages[lang].understanding,
      discoveries,
      timeElapsed: Date.now(),
      completed: true
    });
  }

  /**
   * Display workflow strategy
   */
  private displayWorkflowStrategy(strategy: WorkflowStrategy): void {
    const lang = this.localizedReporter.getLanguage();
    
    const messages = {
      ja: {
        strategy: '🔧 アダプティブ・ワークフロー設計完了',
        planning: '最適化されたワークフローを計画中',
        customizing: `プロジェクト特性に基づいて${strategy.selectedNodes.length}段階の分析を構成しました`
      },
      en: {
        strategy: '🔧 Adaptive Workflow Design Complete',
        planning: 'Planning optimized workflow',
        customizing: `Configured ${strategy.selectedNodes.length}-phase analysis based on project characteristics`
      }
    };

    const adaptationReasons = strategy.adaptationReasons.map(reason => 
      `📋 ${reason}`
    );

    this.progressCallback({
      phase: messages[lang].strategy,
      phaseNumber: 0,
      totalPhases: strategy.selectedNodes.length,
      action: messages[lang].planning,
      thinking: messages[lang].customizing,
      discoveries: adaptationReasons,
      timeElapsed: Date.now(),
      completed: true
    });

    // Add spacing before main analysis
    this.progressCallback({
      phase: '',
      phaseNumber: 0,
      totalPhases: strategy.selectedNodes.length,
      action: '',
      thinking: '',
      discoveries: [],
      timeElapsed: Date.now(),
      completed: false
    });
  }

  /**
   * Display final summary
   */
  private displayFinalSummary(analysisData: AnalysisData, totalTime: number): void {
    const lang = this.localizedReporter.getLanguage();
    
    const messages = {
      ja: {
        complete: '✅ アダプティブ分析完了！',
        finalizing: '分析結果を統合中',
        summary: '包括的なヴォルト分析が正常に完了しました'
      },
      en: {
        complete: '✅ Adaptive Analysis Complete!',
        finalizing: 'Consolidating analysis results',
        summary: 'Comprehensive vault analysis completed successfully'
      }
    };

    const discoveries = [
      `📊 ${analysisData.vaultStructure.totalFiles} ${lang === 'ja' ? 'ファイル分析完了' : 'files analyzed'}`,
      `🏷️ ${analysisData.contentPatterns.tagCategories.size} ${lang === 'ja' ? 'タグカテゴリ発見' : 'tag categories discovered'}`,
      `🧠 ${analysisData.insights.primaryDomains.length} ${lang === 'ja' ? '主要ドメイン特定' : 'primary domains identified'}`,
      `⏱️ ${Math.round(totalTime / 1000)} ${lang === 'ja' ? '秒で完了' : 'seconds total'}`
    ];

    this.progressCallback({
      phase: messages[lang].complete,
      phaseNumber: 999, // Special completion phase
      totalPhases: 999,
      action: messages[lang].finalizing,
      thinking: messages[lang].summary,
      discoveries,
      timeElapsed: totalTime,
      completed: true
    });
  }

  /**
   * Display error information
   */
  private displayError(error: Error): void {
    const lang = this.localizedReporter.getLanguage();
    
    const messages = {
      ja: {
        error: '❌ 分析エラー',
        processing: 'エラーを処理中',
        description: `分析中にエラーが発生しました: ${error.message}`
      },
      en: {
        error: '❌ Analysis Error',
        processing: 'Processing error',
        description: `Error occurred during analysis: ${error.message}`
      }
    };

    this.progressCallback({
      phase: messages[lang].error,
      phaseNumber: 0,
      totalPhases: 0,
      action: messages[lang].processing,
      thinking: messages[lang].description,
      discoveries: [],
      timeElapsed: Date.now(),
      completed: false
    });
  }

  /**
   * Get project profile for external use
   */
  async getProjectProfile(): Promise<ProjectProfile> {
    return await this.characteristicDetector.analyzeVault();
  }

  /**
   * Update language settings
   */
  updateLanguage(language: SupportedLanguage): void {
    this.localizedReporter.setLanguage(language);
  }

  /**
   * Create workflow configuration from user settings
   */
  static createConfigFromSettings(
    chatLanguage?: string,
    interfaceLanguage?: string,
    customOptions?: Partial<AdaptiveWorkflowConfig>
  ): AdaptiveWorkflowConfig {
    const detectedLanguage = LocalizedAnalysisReporter.detectLanguage(
      chatLanguage,
      interfaceLanguage,
      navigator.language
    );

    return {
      language: detectedLanguage,
      userSettings: {
        chatLanguage,
        interfaceLanguage
      },
      enableOptimization: true,
      ...customOptions
    };
  }
}