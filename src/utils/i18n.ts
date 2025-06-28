/**
 * Internationalization system for Obsius plugin
 * Supports English (default) and Japanese
 */

import { SupportedLanguage, TranslationKeys } from './types';

// English translations (default)
const en: TranslationKeys = {
  cli: {
    welcome: '✻ Welcome to Obsius v0.1.0!',
    welcomeVault: 'Vault: {vaultName}',
    welcomeHelp: 'Type /help for commands or start chatting.',
    prompt: '$ ',
    thinking: '🤔 Thinking...',
    placeholder: 'obsius ({providerName})'
  },
  
  commands: {
    help: {
      name: 'help',
      description: 'Show commands',
      usage: 'Commands:',
      availableCommands: 'Available commands: {commands}',
      chatInstructions: 'Type any message to chat with AI.'
    },
    clear: {
      name: 'clear',
      description: 'Clear terminal'
    },
    provider: {
      name: 'provider',
      description: 'Show providers',
      available: 'Available providers:',
      status: 'Status: {status}',
      model: 'Model: {model}',
      lastVerified: 'Last verified: {date}',
      notFound: "Provider '{providerId}' not found"
    },
    settings: {
      name: 'settings',
      description: 'Open settings',
      opened: 'Settings opened'
    },
    status: {
      name: 'status',
      description: 'Show status',
      systemStatus: 'System Status:',
      currentProvider: 'Current provider: {provider}',
      authentication: 'Authentication: {status}',
      commandHistory: 'Command history: {count} entries',
      toolsAvailable: 'Tools available: {count}'
    },
    unknown: {
      error: 'Unknown command: {command}',
      suggestion: 'Type /help for available commands'
    }
  },
  
  provider: {
    connected: '✅ Connected',
    notConnected: '❌ Not connected',
    none: 'None',
    noAuthenticated: 'Error: No authenticated AI provider available',
    checkStatus: 'Use /provider to check provider status or /settings to configure',
    configure: 'Configure API key in settings'
  },

  errors: {
    authentication: {
      invalid: 'Authentication failed. Please check your API key in settings.'
    },
    rateLimit: {
      exceeded: 'Rate limit exceeded. Please wait a moment and try again.'
    },
    network: {
      connection: 'Network connection error. Please check your internet connection.'
    },
    model: {
      unavailable: 'The selected AI model is currently unavailable. Try a different model.'
    },
    provider: {
      notConfigured: 'AI provider not configured. Please set up authentication in settings.'
    },
    unknown: {
      general: 'An unexpected error occurred. Please try again.'
    },
    tool: {
      permission: 'Permission denied for tool: {tool}',
      fileAccess: 'File access error in tool: {tool}',
      validation: 'Invalid parameters for tool: {tool}',
      execution: 'Tool {tool} failed: {error}',
      unknown: 'Unknown error in tool: {tool}'
    }
  },
  
  tools: {
    aiIntegration: 'AI integration is active and ready.',
    placeholder: 'AI agent is ready to help with your Obsidian vault!',
    comingSoon: '🔄 AI integration is now available'
  },
  
  settings: {
    language: 'Language',
    languageDescription: 'Select interface language',
    english: 'English',
    japanese: '日本語'
  },
  
  general: {
    error: 'Error',
    success: 'Success',
    info: 'Info',
    loading: 'Loading...',
    cancel: 'Cancel',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No'
  },

  // System Prompts
  systemPrompt: {
    intro: 'I am Obsius, your AI knowledge management agent for Obsidian. I specialize in building organized, interconnected knowledge graphs while maintaining clarity and efficiency.',
    coreValues: '## Core Values',
    contextFirst: '**🔍 Context First**: Always search existing knowledge before creating new content',
    smartConnections: '**🔗 Smart Connections**: Create meaningful links and prevent knowledge silos',
    noDuplication: '**🚫 No Duplication**: Enhance existing notes rather than create redundant ones',
    respectStructure: '**🏗️ Respect Structure**: Follow your established organizational patterns',
    enhanceDiscovery: '**🎯 Enhance Discovery**: Ensure knowledge remains findable over time',
    workflow: '## Workflow: Explore → Connect → Structure → Create → Integrate',
    workflowSteps: {
      explore: '**🔍 Explore**: Search vault for related content and patterns',
      connect: '**🔗 Connect**: Map relationships to existing notes and concepts',
      structure: '**🏗️ Structure**: Plan optimal organization within your system',
      create: '**✏️ Create**: Execute with clear structure and strategic linking',
      integrate: '**🌐 Integrate**: Verify links and ensure vault coherence'
    },
    environment: '## Environment',
    responseRules: '## Response Rules (CRITICAL)',
    responseGuidelines: '**≤3 lines per response** - CLI interface requires brevity\n- **Action-oriented**: Lead with what you\'re doing\n- **Visual status**: Use 🔍🔗✅ emojis for progress\n- **Results summary**: Show connections made and files affected\n- **No verbose explanations** - let actions speak',
    examples: '## Examples',
    exampleProductivity: {
      user: 'Create a note about productivity',
      assistant: '🔍 Searching existing productivity content...\n→ Found: Time Management.md, Focus Techniques.md\n✅ Created "Productivity Systems.md" with 3 connections | Tags: #productivity #systems'
    },
    exampleOrganize: {
      user: 'Organize my scattered ML notes',
      assistant: '🔍 Found 8 ML notes across vault\n✅ Created ML MOC + reorganized into /AI/MachineLearning/ | 12 new connections'
    },
    remember: 'Remember: Be concise, visual, and action-focused. Quality connections over quantity explanations.',
    languageInstruction: 'CRITICAL: Always respond in {language}. All responses, explanations, and content must be in {language}.'
  }
};

// Japanese translations
const ja: TranslationKeys = {
  cli: {
    welcome: '✻ Obsius v0.1.0 へようこそ！',
    welcomeVault: '保管庫: {vaultName}',
    welcomeHelp: 'コマンドは /help で確認できます。お気軽にチャットを開始してください。',
    prompt: '$ ',
    thinking: '🤔 思考中...',
    placeholder: 'obsius ({providerName})'
  },
  
  commands: {
    help: {
      name: 'help',
      description: 'コマンド表示',
      usage: 'コマンド:',
      availableCommands: '利用可能なコマンド: {commands}',
      chatInstructions: 'AIとチャットするには何でもメッセージを入力してください。'
    },
    clear: {
      name: 'clear',
      description: '画面クリア'
    },
    provider: {
      name: 'provider',
      description: 'プロバイダ表示',
      available: '利用可能なプロバイダ:',
      status: 'ステータス: {status}',
      model: 'モデル: {model}',
      lastVerified: '最終確認: {date}',
      notFound: "プロバイダ '{providerId}' が見つかりません"
    },
    settings: {
      name: 'settings',
      description: '設定を開く',
      opened: '設定を開きました'
    },
    status: {
      name: 'status',
      description: 'ステータス表示',
      systemStatus: 'システムステータス:',
      currentProvider: '現在のプロバイダ: {provider}',
      authentication: '認証: {status}',
      commandHistory: 'コマンド履歴: {count} 件',
      toolsAvailable: '利用可能な機能: {count} 個'
    },
    unknown: {
      error: '不明なコマンド: {command}',
      suggestion: '利用可能なコマンドは /help で確認してください'
    }
  },
  
  provider: {
    connected: '✅ 接続済み',
    notConnected: '❌ 未接続',
    none: 'なし',
    noAuthenticated: 'エラー: 認証済みのAIプロバイダがありません',
    checkStatus: '/provider でプロバイダステータスを確認するか、/settings で設定してください',
    configure: '設定でAPIキーを設定してください'
  },

  errors: {
    authentication: {
      invalid: '認証に失敗しました。設定でAPIキーを確認してください。'
    },
    rateLimit: {
      exceeded: 'レート制限に達しました。しばらく待ってから再試行してください。'
    },
    network: {
      connection: 'ネットワーク接続エラーです。インターネット接続を確認してください。'
    },
    model: {
      unavailable: '選択されたAIモデルは現在利用できません。別のモデルをお試しください。'
    },
    provider: {
      notConfigured: 'AIプロバイダが設定されていません。設定で認証を行ってください。'
    },
    unknown: {
      general: '予期しないエラーが発生しました。再試行してください。'
    },
    tool: {
      permission: 'ツール {tool} の実行権限がありません',
      fileAccess: 'ツール {tool} でファイルアクセスエラーが発生しました',
      validation: 'ツール {tool} のパラメータが無効です',
      execution: 'ツール {tool} の実行に失敗しました: {error}',
      unknown: 'ツール {tool} で不明なエラーが発生しました'
    }
  },
  
  tools: {
    aiIntegration: 'AI統合機能がアクティブで準備完了です。',
    placeholder: 'AIエージェントがObsidian保管庫のサポート準備完了です！',
    comingSoon: '🔄 AI統合機能が利用可能になりました'
  },
  
  settings: {
    language: '言語',
    languageDescription: 'インターフェース言語を選択',
    english: 'English',
    japanese: '日本語'
  },
  
  general: {
    error: 'エラー',
    success: '成功',
    info: '情報',
    loading: '読み込み中...',
    cancel: 'キャンセル',
    confirm: '確認',
    yes: 'はい',
    no: 'いいえ'
  },

  // System Prompts
  systemPrompt: {
    intro: '私はObsius、あなたのObsidian AI ナレッジマネジメントエージェントです。明確性と効率性を保ちながら、整理された相互接続されたナレッジグラフの構築を専門としています。',
    coreValues: '## 核となる価値観',
    contextFirst: '**🔍 コンテキスト優先**: 新しいコンテンツを作成する前に、常に既存の知識を検索する',
    smartConnections: '**🔗 スマートな接続**: 意味のあるリンクを作成し、知識のサイロ化を防ぐ',
    noDuplication: '**🚫 重複なし**: 冗長なノートを作成するよりも既存のノートを拡張する',
    respectStructure: '**🏗️ 構造の尊重**: 確立された組織パターンに従う',
    enhanceDiscovery: '**🎯 発見の向上**: 知識が時間をかけて見つけやすい状態を確保する',
    workflow: '## ワークフロー: 探索 → 接続 → 構造化 → 作成 → 統合',
    workflowSteps: {
      explore: '**🔍 探索**: 関連コンテンツとパターンを保管庫で検索',
      connect: '**🔗 接続**: 既存のノートや概念との関係をマッピング',
      structure: '**🏗️ 構造化**: システム内での最適な組織を計画',
      create: '**✏️ 作成**: 明確な構造と戦略的リンクで実行',
      integrate: '**🌐 統合**: リンクを検証し、保管庫の一貫性を確保'
    },
    environment: '## 環境',
    responseRules: '## 応答ルール（重要）',
    responseGuidelines: '**1回の応答は3行以内** - CLIインターフェースには簡潔性が必要\n- **アクション指向**: 何をしているかを先頭に\n- **視覚的ステータス**: 進捗に🔍🔗✅絵文字を使用\n- **結果要約**: 作成された接続と影響を受けたファイルを表示\n- **冗長な説明なし** - アクションに語らせる',
    examples: '## 例',
    exampleProductivity: {
      user: '生産性についてのノートを作成して',
      assistant: '🔍 既存の生産性コンテンツを検索中...\n→ 見つかりました: Time Management.md, Focus Techniques.md\n✅ "Productivity Systems.md"を3つの接続で作成 | タグ: #productivity #systems'
    },
    exampleOrganize: {
      user: '散らばった機械学習ノートを整理して',
      assistant: '🔍 保管庫全体で8つのMLノートを発見\n✅ ML MOCを作成し/AI/MachineLearning/に再編成 | 12の新しい接続'
    },
    remember: '覚えておいてください: 簡潔で、視覚的で、アクション重視であること。説明の量よりも接続の質を重視します。',
    languageInstruction: '重要: 常に{language}で応答してください。すべての応答、説明、コンテンツは{language}でなければなりません。'
  }
};

// Translation storage
const translations: Record<SupportedLanguage, TranslationKeys> = {
  en,
  ja
};

/**
 * Current language setting
 */
let currentLanguage: SupportedLanguage = 'en';

/**
 * Set the current language
 */
export function setLanguage(language: SupportedLanguage): void {
  currentLanguage = language;
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Get translation for a specific key path
 * @param keyPath - Dot-separated path to translation key (e.g., 'cli.welcome')
 * @param params - Parameters to substitute in the translation
 * @returns Translated string with parameters substituted
 */
export function t(keyPath: string, params?: Record<string, string | number>): string {
  const keys = keyPath.split('.');
  let value: any = translations[currentLanguage];
  
  // Navigate through the translation object
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English if key not found
      console.warn(`Translation key not found: ${keyPath} for language ${currentLanguage}`);
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          console.error(`Translation key not found even in fallback: ${keyPath}`);
          return `[Missing: ${keyPath}]`;
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    console.error(`Translation value is not a string: ${keyPath}`);
    return `[Invalid: ${keyPath}]`;
  }
  
  // Substitute parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }
  
  return value;
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Array<{ code: SupportedLanguage; name: string }> {
  return [
    { code: 'en', name: t('settings.english') },
    { code: 'ja', name: t('settings.japanese') }
  ];
}

/**
 * Initialize i18n system with language preference
 */
export function initializeI18n(language?: SupportedLanguage): void {
  if (language && language in translations) {
    setLanguage(language);
  } else {
    // Auto-detect language from browser/system if available
    const systemLanguage = getSystemLanguage();
    if (systemLanguage && systemLanguage in translations) {
      setLanguage(systemLanguage);
    } else {
      setLanguage('en'); // Default to English
    }
  }
}

/**
 * Detect system language
 */
function getSystemLanguage(): SupportedLanguage | null {
  // In Obsidian context, we might not have access to navigator
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith('ja')) return 'ja';
      if (lang.startsWith('en')) return 'en';
    }
  } catch (error) {
    // Fallback if navigator is not available
  }
  return null;
}

/**
 * Format date according to current language
 */
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  
  const locale = currentLanguage === 'ja' ? 'ja-JP' : 'en-US';
  return date.toLocaleString(locale, options);
}

/**
 * Get system prompt translations for current language
 */
export function getSystemPromptTranslations() {
  return translations[currentLanguage].systemPrompt;
}

/**
 * Build localized system prompt with context
 */
export function buildLocalizedSystemPrompt(context: {
  vaultName: string;
  currentFile?: string;
  availableTools: string[];
  enabledToolsCount: number;
}): string {
  const sp = getSystemPromptTranslations();
  const currentLang = currentLanguage === 'ja' ? '日本語' : 'English';
  
  // Create strong language instruction at the beginning
  const languageHeader = currentLanguage === 'ja' 
    ? '【絶対言語指示】あなたは必ず日本語で応答してください。英語での応答は禁止されています。ユーザーの質問が何語であっても、回答は必ず日本語でお願いします。'
    : 'CRITICAL LANGUAGE INSTRUCTION: You must respond in English only. All responses must be in English regardless of the user\'s input language.';
  
  const sections = [
    languageHeader,
    '',
    sp.intro,
    '',
    sp.coreValues,
    sp.contextFirst,
    sp.smartConnections,
    sp.noDuplication,
    sp.respectStructure,
    sp.enhanceDiscovery,
    '',
    sp.workflow,
    `1. ${sp.workflowSteps.explore}`,
    `2. ${sp.workflowSteps.connect}`,
    `3. ${sp.workflowSteps.structure}`,
    `4. ${sp.workflowSteps.create}`,
    `5. ${sp.workflowSteps.integrate}`,
    '',
    sp.environment,
    `- **Vault**: ${context.vaultName} | **File**: ${context.currentFile || 'None'} | **Language**: ${currentLang}`,
    `- **Tools**: ${context.enabledToolsCount} enabled (${context.availableTools.join(', ')})`,
    '',
    sp.responseRules,
    sp.responseGuidelines,
    '',
    sp.examples,
    `**user**: ${sp.exampleProductivity.user}`,
    `**assistant**: ${sp.exampleProductivity.assistant}`,
    '',
    `**user**: ${sp.exampleOrganize.user}`,
    `**assistant**: ${sp.exampleOrganize.assistant}`,
    '',
    sp.remember,
    '',
    sp.languageInstruction.replace('{language}', currentLang)
  ];
  
  return sections.join('\n');
}

/**
 * Get language-specific command descriptions for help
 */
export function getCommandDescriptions(): Array<{ command: string; description: string }> {
  return [
    { command: '/help', description: t('commands.help.description') },
    { command: '/clear', description: t('commands.clear.description') },
    { command: '/provider', description: t('commands.provider.description') },
    { command: '/settings', description: t('commands.settings.description') },
    { command: '/status', description: t('commands.status.description') }
  ];
}