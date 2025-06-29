/**
 * Localized Analysis Reporter - Multi-language thinking chain display
 * Provides natural thinking processes in user's preferred language
 */

import { AnalysisProgress, ThinkingChain } from './VaultAnalysisWorkflow';

/**
 * Supported languages for thinking chain localization
 */
export type SupportedLanguage = 'ja' | 'en';

/**
 * Localized string with language variants
 */
export interface LocalizedString {
  ja: string;
  en: string;
}

/**
 * Thinking pattern templates for different languages
 */
export interface ThinkingPatterns {
  observation: LocalizedString;
  analysis: LocalizedString;
  hypothesis: LocalizedString;
  implication: LocalizedString;
  action: LocalizedString;
  discovery: LocalizedString;
  completion: LocalizedString;
}

/**
 * Language-specific thinking patterns and expressions
 */
export const THINKING_PATTERNS: ThinkingPatterns = {
  observation: {
    ja: "🔍 {data}を発見しました",
    en: "🔍 Discovered {data}"
  },
  analysis: {
    ja: "📊 これは{insight}を示しています",
    en: "📊 This indicates {insight}"
  },
  hypothesis: {
    ja: "💭 {conclusion}と推測されます",
    en: "💭 This suggests {conclusion}"
  },
  implication: {
    ja: "⚡ AI支援では{strategy}が重要です",
    en: "⚡ For AI assistance, {strategy} is key"
  },
  action: {
    ja: "🔄 {action}を実行中...",
    en: "🔄 {action}..."
  },
  discovery: {
    ja: "{discovery}",
    en: "{discovery}"
  },
  completion: {
    ja: "✅ {phase}が完了しました",
    en: "✅ {phase} complete"
  }
};

/**
 * Phase-specific localized expressions
 */
export const PHASE_EXPRESSIONS = {
  discovery: {
    actions: {
      ja: [
        "ヴォルト構造をスキャン中",
        "ファイル階層を分析中",
        "基本統計を収集中",
        "組織パターンを検出中"
      ],
      en: [
        "Scanning vault structure",
        "Analyzing file hierarchy", 
        "Collecting basic statistics",
        "Detecting organizational patterns"
      ]
    },
    thinking: {
      ja: [
        "包括的なヴォルト探索を開始しています",
        "ファイル分布とフォルダ構造を理解しています",
        "組織化原則を特定しています"
      ],
      en: [
        "Beginning comprehensive vault exploration",
        "Understanding file distribution and folder structure",
        "Identifying organizational principles"
      ]
    }
  },
  content_analysis: {
    actions: {
      ja: [
        "コンテンツパターンを解析中",
        "メタデータ構造を調査中",
        "タグ体系を分析中",
        "命名規則を特定中"
      ],
      en: [
        "Analyzing content patterns",
        "Investigating metadata structures",
        "Analyzing tag systems",
        "Identifying naming conventions"
      ]
    },
    thinking: {
      ja: [
        "代表的なファイルを調べて組織パターンを特定しています",
        "メタデータの一貫性と使用パターンを分析しています",
        "コンテンツの構造化原則を理解しています"
      ],
      en: [
        "Examining representative files to identify organizational patterns",
        "Analyzing metadata consistency and usage patterns", 
        "Understanding content structuring principles"
      ]
    }
  },
  pattern_recognition: {
    actions: {
      ja: [
        "組織パターンを分析中",
        "ワークフロー特性を検出中",
        "知識管理手法を特定中",
        "構造原則を理解中"
      ],
      en: [
        "Analyzing organizational patterns",
        "Detecting workflow characteristics",
        "Identifying knowledge management approaches",
        "Understanding structural principles"
      ]
    },
    thinking: {
      ja: [
        "コンテンツ構造を調べて基礎的な組織原則を特定しています",
        "複数の知識管理手法の組み合わせを発見しています",
        "既存のパターンを尊重するAI戦略を検討しています"
      ],
      en: [
        "Examining content structures to identify underlying organizational principles",
        "Discovering combinations of multiple knowledge management approaches",
        "Considering AI strategies that respect existing patterns"
      ]
    }
  },
  relationship_mapping: {
    actions: {
      ja: [
        "ノート間の関係性をマッピング中",
        "知識ネットワークを分析中",
        "中心的ノードを特定中",
        "コンテンツクラスターを検出中"
      ],
      en: [
        "Mapping note relationships",
        "Analyzing knowledge networks",
        "Identifying central nodes",
        "Detecting content clusters"
      ]
    },
    thinking: {
      ja: [
        "接続性と知識クラスターを分析しています",
        "構造化された接続性と特定可能な知識センターを発見しています",
        "効率的な知識横断のため接続パターンを活用すべきです"
      ],
      en: [
        "Analyzing connections, links, and knowledge clusters",
        "Discovering structured connectivity with identifiable knowledge centers",
        "AI navigation should leverage these connection patterns for efficient knowledge traversal"
      ]
    }
  },
  insight_generation: {
    actions: {
      ja: [
        "戦略的インサイトを生成中",
        "発見事項を統合中",
        "知識ドメインを特定中",
        "最適化機会を分析中"
      ],
      en: [
        "Generating strategic insights",
        "Synthesizing findings",
        "Identifying knowledge domains",
        "Analyzing optimization opportunities"
      ]
    },
    thinking: {
      ja: [
        "すべての発見事項をAIエージェント向けの実行可能なインテリジェンスに統合しています",
        "成熟した知識管理と明確な戦略的意図を実証しています",
        "AIエージェントは知識強化ツールとして動作する必要があります"
      ],
      en: [
        "Synthesizing all findings into actionable intelligence for AI agents",
        "Demonstrating mature knowledge management with clear strategic intent",
        "AI agents must operate as knowledge enhancement tools, not disruptive reorganizers"
      ]
    }
  },
  instruction_synthesis: {
    // DEPRECATED: Static template-based instruction generation
    actions: {
      ja: [
        "⚠️ 静的指示合成（非推奨）",
        "動的指示生成に移行中",
        "AI駆動分析に更新中"
      ],
      en: [
        "⚠️ Static instruction synthesis (deprecated)",
        "Migrating to dynamic instruction generation",
        "Updating to AI-driven analysis"
      ]
    },
    thinking: {
      ja: [
        "静的テンプレートシステムは動的AIコンテンツ分析に置き換えられています"
      ],
      en: [
        "Static template system is being replaced by dynamic AI content analysis"
      ]
    }
  },
  dynamic_instruction_generation: {
    actions: {
      ja: [
        "動的AI指示を生成中",
        "セマンティック分析を実行中", 
        "知識ネットワークを発見中",
        "ヴォルト特化洞察を生成中"
      ],
      en: [
        "Generating dynamic AI instructions",
        "Performing semantic analysis",
        "Discovering knowledge networks", 
        "Creating vault-specific insights"
      ]
    },
    thinking: {
      ja: [
        "実際のコンテンツを読み取り、セマンティック分析を通じて深い理解を構築しています",
        "知識ネットワークと使用パターンを発見し、ヴォルト固有の洞察を生成しています",
        "この分析は各ヴォルトに完全に適応したAI指示を作成します"
      ],
      en: [
        "Reading actual content and building deep understanding through semantic analysis",
        "Discovering knowledge networks and usage patterns to generate vault-specific insights",
        "This analysis creates AI instructions completely adapted to each vault"
      ]
    }
  },
  dynamic_instruction_formatting: {
    actions: {
      ja: [
        "動的指示をフォーマット中",
        "マークダウン文書を生成中",
        "構造化指示を作成中",
        "ユニーク指示文書を最終化中"
      ],
      en: [
        "Formatting dynamic instructions",
        "Generating markdown document",
        "Creating structured instructions",
        "Finalizing unique instruction document"
      ]
    },
    thinking: {
      ja: [
        "AI洞察を包括的で読みやすい指示文書に変換しています",
        "各ヴォルトの特性に基づいた独自の指示セットを生成しています",
        "この文書は真にヴォルト特化されたAI支援を提供します"
      ],
      en: [
        "Converting AI insights into comprehensive, readable instruction document",
        "Generating unique instruction set based on each vault's characteristics",
        "This document provides truly vault-specific AI assistance"
      ]
    }
  },
  domain_analysis: {
    actions: {
      ja: [
        "知識ドメインを分析中",
        "ドメイン特性を調査中",
        "専門分野を特定中",
        "ドメイン間関係を分析中"
      ],
      en: [
        "Analyzing knowledge domains",
        "Investigating domain characteristics",
        "Identifying specialized areas",
        "Analyzing inter-domain relationships"
      ]
    },
    thinking: {
      ja: [
        "異なる知識領域とその組織パターンを特定しています",
        "複数ドメインの専門知識と明確なドメイン分離を実証しています",
        "ドメイン固有のワークフローと用語をAI相互作用で保持すべきです"
      ],
      en: [
        "Identifying distinct knowledge areas and their organizational patterns",
        "Demonstrating multi-domain expertise with clear domain separation",
        "Domain-specific workflows and terminology should be preserved in AI interactions"
      ]
    }
  },
  optimization_analysis: {
    actions: {
      ja: [
        "最適化機会を分析中",
        "ボトルネックを特定中",
        "効率化可能性を評価中",
        "パフォーマンス改善を調査中"
      ],
      en: [
        "Analyzing optimization opportunities",
        "Identifying bottlenecks",
        "Evaluating efficiency possibilities",
        "Investigating performance improvements"
      ]
    },
    thinking: {
      ja: [
        "効率性向上のためのボトルネックと強化可能性を特定しています",
        "大規模ヴォルトは使いやすさを維持するため体系的最適化から恩恵を受けます",
        "最適化は既存ワークフローを保持しながら効率性を改善すべきです"
      ],
      en: [
        "Identifying bottlenecks and enhancement possibilities for enhanced efficiency",
        "Large-scale vaults benefit from systematic optimization to maintain usability",
        "Optimization should preserve existing workflows while improving efficiency"
      ]
    }
  },
  deep_content_discovery: {
    actions: {
      ja: [
        "深層コンテンツ探索を実行中",
        "Glob+ReadManyFilesで包括的分析中",
        "フォルダ構造とMarkdownコンテンツを解析中",
        "戦略的ファイル選択とバッチ読み取り中"
      ],
      en: [
        "Performing deep content discovery",
        "Comprehensive analysis using Glob+ReadManyFiles",
        "Analyzing folder structure and Markdown content",
        "Strategic file selection and batch reading"
      ]
    },
    thinking: {
      ja: [
        "Globツールで全Markdownファイルを発見し、フォルダ構造を完全理解しています",
        "各フォルダから代表ファイルを戦略的に選択し、バッチ読み取りで深い理解を実現します",
        "表面的なサンプリングを超えて、プロジェクト全体の構造と内容を包括的に把握します"
      ],
      en: [
        "Discovering all Markdown files via Glob and achieving complete folder structure understanding",
        "Strategically selecting representative files from each folder and achieving deep understanding through batch reading",
        "Going beyond surface sampling to comprehensively understand project structure and content"
      ]
    }
  },
  legacy_migration: {
    actions: {
      ja: [
        "レガシーパターンを分析中",
        "移行機会を特定中",
        "組織的改善を評価中",
        "移行パスを計画中"
      ],
      en: [
        "Analyzing legacy patterns",
        "Identifying migration opportunities",
        "Evaluating organizational improvements",
        "Planning migration paths"
      ]
    },
    thinking: {
      ja: [
        "既存の組織パターンからの移行機会を特定しています",
        "レガシーパターンは、より効率的なシステムに段階的に移行できます",
        "AIは、コンテンツの整合性を維持しながら体系的移行を支援できます"
      ],
      en: [
        "Identifying migration opportunities from existing organizational patterns",
        "Legacy patterns can be gradually migrated to more efficient systems",
        "AI can assist in systematic migration while maintaining content integrity"
      ]
    }
  }
};

/**
 * Localized Analysis Reporter for multi-language thinking display
 */
export class LocalizedAnalysisReporter {
  private language: SupportedLanguage;

  constructor(language: SupportedLanguage = 'en') {
    this.language = language;
  }

  /**
   * Set the display language
   */
  setLanguage(language: SupportedLanguage): void {
    this.language = language;
  }

  /**
   * Get current language
   */
  getLanguage(): SupportedLanguage {
    return this.language;
  }

  /**
   * Localize a thinking chain
   */
  localizeThinkingChain(
    observation: string,
    analysis: string,
    hypothesis: string,
    implication: string
  ): ThinkingChain {
    return {
      observation: this.formatThinking('observation', { data: observation }),
      analysis: this.formatThinking('analysis', { insight: analysis }),
      hypothesis: this.formatThinking('hypothesis', { conclusion: hypothesis }),
      implication: this.formatThinking('implication', { strategy: implication })
    };
  }

  /**
   * Get localized action text for a phase
   */
  getLocalizedAction(phase: string, actionIndex: number = 0): string {
    const phaseKey = this.normalizePhaseKey(phase);
    const actions = PHASE_EXPRESSIONS[phaseKey as keyof typeof PHASE_EXPRESSIONS]?.actions[this.language];
    
    if (actions && actions[actionIndex]) {
      return this.formatThinking('action', { action: actions[actionIndex] });
    }
    
    // Fallback to generic action
    return this.formatThinking('action', { action: phase });
  }

  /**
   * Get localized thinking text for a phase
   */
  getLocalizedThinking(phase: string, thinkingIndex: number = 0): string {
    const phaseKey = this.normalizePhaseKey(phase);
    const thinkings = PHASE_EXPRESSIONS[phaseKey as keyof typeof PHASE_EXPRESSIONS]?.thinking[this.language];
    
    if (thinkings && thinkings[thinkingIndex]) {
      return thinkings[thinkingIndex];
    }
    
    // Fallback to generic thinking
    return this.language === 'ja' 
      ? `${phase}を実行しています`
      : `Processing ${phase}`;
  }

  /**
   * Get localized completion message
   */
  getLocalizedCompletion(phase: string): string {
    return this.formatThinking('completion', { phase });
  }

  /**
   * Format thinking pattern with parameters
   */
  private formatThinking(patternKey: keyof ThinkingPatterns, params: Record<string, string>): string {
    let template = THINKING_PATTERNS[patternKey][this.language];
    
    // Replace parameters in template
    for (const [key, value] of Object.entries(params)) {
      template = template.replace(`{${key}}`, value);
    }
    
    return template;
  }

  /**
   * Normalize phase key for lookup
   */
  private normalizePhaseKey(phase: string): string {
    // Remove emojis and special characters, convert to lowercase and replace spaces
    return phase
      .replace(/[🔍📄🧠🕸️💡📝🎯⚡🔄]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, '');
  }

  /**
   * Create localized progress report
   */
  createLocalizedProgress(
    phase: string,
    phaseNumber: number,
    totalPhases: number,
    actionIndex: number = 0,
    thinkingIndex: number = 0,
    discoveries: string[] = [],
    completed: boolean = false
  ): AnalysisProgress {
    const action = this.getLocalizedAction(phase, actionIndex);
    const thinking = this.getLocalizedThinking(phase, thinkingIndex);
    
    return {
      phase,
      phaseNumber,
      totalPhases,
      action,
      thinking,
      discoveries,
      timeElapsed: Date.now(),
      completed
    };
  }

  /**
   * Auto-detect language from user settings or browser
   */
  static detectLanguage(
    chatLanguage?: string,
    interfaceLanguage?: string,
    browserLanguage?: string
  ): SupportedLanguage {
    // Priority: chatLanguage > interfaceLanguage > browserLanguage > default
    const languages = [chatLanguage, interfaceLanguage, browserLanguage];
    
    for (const lang of languages) {
      if (lang) {
        const langCode = lang.toLowerCase().split('-')[0];
        if (langCode === 'ja' || langCode === 'japanese') return 'ja';
        if (langCode === 'en' || langCode === 'english') return 'en';
      }
    }
    
    return 'en'; // Default fallback
  }

  /**
   * Create smart localized thinking chain based on context
   */
  createSmartThinkingChain(
    phaseKey: string,
    contextData: Record<string, any>
  ): ThinkingChain {
    const normalizedPhase = this.normalizePhaseKey(phaseKey);
    const phaseExpressions = PHASE_EXPRESSIONS[normalizedPhase as keyof typeof PHASE_EXPRESSIONS];
    
    if (phaseExpressions) {
      const thinkings = phaseExpressions.thinking[this.language];
      
      // Create context-aware thinking chain
      return {
        observation: thinkings[0] || '',
        analysis: thinkings[1] || '',
        hypothesis: thinkings[2] || '',
        implication: thinkings[2] || '' // Use last thinking as implication
      };
    }
    
    // Fallback to generic thinking chain
    return this.localizeThinkingChain(
      'Analysis in progress',
      'Understanding vault characteristics',
      'Patterns are being identified',
      'AI assistance will be optimized'
    );
  }
}