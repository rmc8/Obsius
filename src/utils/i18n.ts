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
    japanese: '日本語',
    
    // Settings sections
    interfaceSettings: 'Interface Settings',
    providerSettings: 'AI Provider Settings',
    toolSettings: 'Tool Settings',
    workflowSettings: 'Workflow Settings',
    
    // Language settings
    interfaceLanguage: 'Interface Language',
    interfaceLanguageDesc: 'Select language for UI elements (menus, settings, etc.)',
    chatLanguage: 'Chat Language',
    chatLanguageDesc: 'Language for AI responses (auto = detect from user input)',
    autoDetect: 'Auto-detect',
    
    // UI settings
    showTimestamps: 'Show Timestamps',
    showTimestampsDesc: 'Show timestamps in chat messages',
    enableStreaming: 'Enable Streaming',
    enableStreamingDesc: 'Stream AI responses in real-time',
    autoScroll: 'Auto Scroll',
    autoScrollDesc: 'Automatically scroll to latest messages',
    
    // Tool settings
    enabledTools: 'Enabled Tools',
    enabledToolsDesc: 'Select which tools the AI can use',
    confirmationRequired: 'Confirmation Required',
    confirmationRequiredDesc: 'Tools that require user confirmation before execution',
    
    // Workflow settings
    maxIterations: 'Max Iterations',
    maxIterationsDesc: 'Maximum workflow iterations (1-100)',
    enableReACT: 'Enable ReACT',
    enableReACTDesc: 'Enable ReACT reasoning methodology',
    enableStateGraph: 'Enable State Graph',
    enableStateGraphDesc: 'Enable LangGraph-style workflow',
    iterationTimeout: 'Iteration Timeout',
    iterationTimeoutDesc: 'Timeout per iteration in seconds (10-300)',
    
    // Provider settings
    defaultProvider: 'Default Provider',
    defaultProviderDesc: 'Select the default AI provider for chat interactions',
    
    // Page titles
    settingsTitle: 'Obsius AI Agent Settings',
    
    // Provider configuration
    providerStatus: 'Provider Status',
    apiKeyConfiguration: 'API Key Configuration',
    connected: 'Connected',
    notConfigured: 'Not configured',
    verificationFailed: 'Verification failed',
    apiKeyStored: 'API key stored but not verified',
    noApiKey: 'No API key configured',
    unknown: 'Unknown',
    
    // Workflow settings
    enableStateGraphWorkflow: 'Enable StateGraph Workflow',
    enableStateGraphWorkflowDesc: 'Enable LangGraph-style state management',
    workflowTip: 'Tip: For simple tasks like creating notes or searching, use 5-10 iterations. For complex analysis or multi-step operations, use 20-50 iterations.',
    resetToDefault: 'Reset to default (24)',
    
    // Provider API key descriptions
    openaiApiKeyDesc: 'Get your API key from https://platform.openai.com/api-keys',
    anthropicApiKeyDesc: 'Get your API key from https://console.anthropic.com/',
    googleApiKeyDesc: 'Get your API key from https://ai.google.dev/',
    defaultApiKeyDesc: 'Enter your API key for this provider',
    
    // Provider placeholders
    enterApiKey: 'Enter API key...',
    
    // Model selection and connection
    model: 'Model',
    modelDesc: 'Select the model to use for this provider',
    connection: 'Connection',
    connectionDesc: 'Disconnect and remove API key from secure storage',
    disconnect: 'Disconnect',
    connect: 'Connect',
    
    // Tool status
    toolsStatus: '{enabled} tools enabled, {disabled} disabled',
    
    // Error messages
    disconnectFailed: 'Failed to disconnect {provider}',
    unknownError: 'Unknown error'
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
    intro: 'I am Obsius, your AI knowledge management agent for Obsidian. I specialize in building organized, interconnected knowledge graphs while maintaining clarity and efficiency. I use ReACT (Reasoning + Acting) methodology for complex tasks.',
    
    // ReACT Methodology section
    reactMethodology: '## ReACT Methodology (Reasoning + Acting)',
    reactExplanation: 'I follow a structured thinking process: **Thought** → **Action** → **Observation** → repeat until task completion.',
    reactSteps: {
      thought: '**Thought**: I analyze the situation and plan my next step',
      action: '**Action**: I execute specific tools to gather information or make changes',
      observation: '**Observation**: I examine the results and determine if more work is needed'
    },
    reactInstructions: 'I will explicitly show my reasoning process. For complex tasks, I break them into smaller steps and execute them iteratively.',
    reactExample: '**Example ReACT Process:**\nThought: I need to create a note about AI, but first let me check what AI-related content already exists.\nAction: search_notes with query "artificial intelligence"\nObservation: Found 3 AI notes - need to review them before creating new content.\nThought: Let me read the existing content to understand the current knowledge structure.\nAction: read_note for each relevant file...',
    
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
    responseGuidelines: '**≤3 lines per response** - CLI interface requires brevity\n- **Action-oriented**: Lead with what you\'re doing\n- **Visual status**: Use 🔍🔗✅ emojis for progress\n- **Results summary**: Show connections made and files affected\n- **No verbose explanations** - let actions speak\n- **Show reasoning**: For complex tasks, briefly explain your thought process',
    examples: '## Examples',
    exampleProductivity: {
      user: 'Create a note about productivity',
      assistant: '🔍 Searching existing productivity content...\n→ Found: Time Management.md, Focus Techniques.md\n✅ Created "Productivity Systems.md" with 3 connections | Tags: #productivity #systems'
    },
    exampleOrganize: {
      user: 'Organize my scattered ML notes',
      assistant: '🔍 Found 8 ML notes across vault\n✅ Created ML MOC + reorganized into /AI/MachineLearning/ | 12 new connections'
    },
    exampleReact: {
      user: 'Help me research and create a comprehensive note about quantum computing',
      assistant: 'Thought: Complex topic - need to check existing quantum content first\n🔍 Searching quantum-related notes...\n→ Found: Physics Basics.md, Computing History.md\nNext: Reading existing content to plan comprehensive structure'
    },
    remember: 'Remember: Be concise, visual, and action-focused. Quality connections over quantity explanations. Show your reasoning for complex tasks.',
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
    japanese: '日本語',
    
    // Settings sections
    interfaceSettings: 'インターフェース設定',
    providerSettings: 'AIプロバイダ設定',
    toolSettings: 'ツール設定',
    workflowSettings: 'ワークフロー設定',
    
    // Language settings
    interfaceLanguage: 'インターフェース言語',
    interfaceLanguageDesc: 'UI要素（メニュー、設定など）の言語を選択',
    chatLanguage: 'チャット言語',
    chatLanguageDesc: 'AI応答の言語（自動=ユーザー入力から検出）',
    autoDetect: '自動検出',
    
    // UI settings
    showTimestamps: 'タイムスタンプ表示',
    showTimestampsDesc: 'チャットメッセージにタイムスタンプを表示',
    enableStreaming: 'ストリーミング有効',
    enableStreamingDesc: 'AI応答をリアルタイムでストリーミング',
    autoScroll: '自動スクロール',
    autoScrollDesc: '最新メッセージまで自動的にスクロール',
    
    // Tool settings
    enabledTools: '有効なツール',
    enabledToolsDesc: 'AIが使用できるツールを選択',
    confirmationRequired: '確認が必要',
    confirmationRequiredDesc: '実行前にユーザー確認が必要なツール',
    
    // Workflow settings
    maxIterations: '最大反復回数',
    maxIterationsDesc: 'ワークフローの最大反復回数（1-100）',
    enableReACT: 'ReACT有効',
    enableReACTDesc: 'ReACT推論手法を有効にする',
    enableStateGraph: 'ステートグラフ有効',
    enableStateGraphDesc: 'LangGraph形式のワークフローを有効にする',
    iterationTimeout: '反復タイムアウト',
    iterationTimeoutDesc: '反復あたりのタイムアウト（秒）（10-300）',
    
    // Provider settings
    defaultProvider: 'デフォルトプロバイダ',
    defaultProviderDesc: 'チャット用のデフォルトAIプロバイダを選択',
    
    // Page titles
    settingsTitle: 'Obsius AIエージェント設定',
    
    // Provider configuration
    providerStatus: 'プロバイダステータス',
    apiKeyConfiguration: 'APIキー設定',
    connected: '接続済み',
    notConfigured: '未設定',
    verificationFailed: '認証失敗',
    apiKeyStored: 'APIキーは保存されていますが未認証',
    noApiKey: 'APIキーが設定されていません',
    unknown: '不明',
    
    // Workflow settings
    enableStateGraphWorkflow: 'ステートグラフワークフロー有効',
    enableStateGraphWorkflowDesc: 'LangGraph形式の状態管理を有効にする',
    workflowTip: 'ヒント: ノート作成や検索等の簡単なタスクには5-10回の反復を使用。複雑な分析や複数ステップの操作には20-50回の反復を使用してください。',
    resetToDefault: 'デフォルトにリセット (24)',
    
    // Provider API key descriptions
    openaiApiKeyDesc: 'APIキーは https://platform.openai.com/api-keys から取得してください',
    anthropicApiKeyDesc: 'APIキーは https://console.anthropic.com/ から取得してください',
    googleApiKeyDesc: 'APIキーは https://ai.google.dev/ から取得してください',
    defaultApiKeyDesc: 'このプロバイダーのAPIキーを入力してください',
    
    // Provider placeholders
    enterApiKey: 'APIキーを入力...',
    
    // Model selection and connection
    model: 'モデル',
    modelDesc: 'このプロバイダーで使用するモデルを選択',
    connection: '接続',
    connectionDesc: '接続を切断してAPIキーを安全なストレージから削除',
    disconnect: '切断',
    connect: '接続',
    
    // Tool status
    toolsStatus: '{enabled}個のツールが有効、{disabled}個が無効',
    
    // Error messages
    disconnectFailed: '{provider}の切断に失敗しました',
    unknownError: '不明なエラー'
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
    intro: '私はObsius、あなたのObsidian AI ナレッジマネジメントエージェントです。明確性と効率性を保ちながら、整理された相互接続されたナレッジグラフの構築を専門としています。複雑なタスクにはReACT（推論+行動）手法を使用します。',
    
    // ReACT Methodology section
    reactMethodology: '## ReACT手法（推論+行動）',
    reactExplanation: '私は構造化された思考プロセスに従います: **思考** → **行動** → **観察** → タスク完了まで繰り返し。',
    reactSteps: {
      thought: '**思考**: 状況を分析し、次のステップを計画します',
      action: '**行動**: 情報収集や変更を行うために特定のツールを実行します',
      observation: '**観察**: 結果を調べ、さらに作業が必要かどうかを判断します'
    },
    reactInstructions: '私は推論プロセスを明示的に示します。複雑なタスクについては、より小さなステップに分解し、反復的に実行します。',
    reactExample: '**ReACTプロセスの例:**\n思考: AIについてのノートを作成する必要がありますが、まず既存のAI関連コンテンツを確認しましょう。\n行動: "人工知能"というクエリでsearch_notesを実行\n観察: 3つのAIノートが見つかりました - 新しいコンテンツを作成する前にそれらを確認する必要があります。\n思考: 現在の知識構造を理解するために既存のコンテンツを読みましょう。\n行動: 関連する各ファイルでread_noteを実行...',
    
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
    responseGuidelines: '**1回の応答は3行以内** - CLIインターフェースには簡潔性が必要\n- **アクション指向**: 何をしているかを先頭に\n- **視覚的ステータス**: 進捗に🔍🔗✅絵文字を使用\n- **結果要約**: 作成された接続と影響を受けたファイルを表示\n- **冗長な説明なし** - アクションに語らせる\n- **推論を表示**: 複雑なタスクでは、思考プロセスを簡潔に説明',
    examples: '## 例',
    exampleProductivity: {
      user: '生産性についてのノートを作成して',
      assistant: '🔍 既存の生産性コンテンツを検索中...\n→ 見つかりました: Time Management.md, Focus Techniques.md\n✅ "Productivity Systems.md"を3つの接続で作成 | タグ: #productivity #systems'
    },
    exampleOrganize: {
      user: '散らばった機械学習ノートを整理して',
      assistant: '🔍 保管庫全体で8つのMLノートを発見\n✅ ML MOCを作成し/AI/MachineLearning/に再編成 | 12の新しい接続'
    },
    exampleReact: {
      user: '量子コンピューティングについて包括的なノートを研究して作成してください',
      assistant: '思考: 複雑なトピック - まず既存の量子関連コンテンツを確認する必要があります\n🔍 量子関連ノートを検索中...\n→ 見つかりました: Physics Basics.md, Computing History.md\n次: 包括的な構造を計画するために既存のコンテンツを読みます'
    },
    remember: '覚えておいてください: 簡潔で、視覚的で、アクション重視であること。説明の量よりも接続の質を重視します。複雑なタスクでは推論を示してください。',
    languageInstruction: '重要: 常に{language}で応答してください。すべての応答、説明、コンテンツは{language}でなければなりません。'
  }
};

// Translation storage
const translations: Record<SupportedLanguage, TranslationKeys> = {
  en,
  ja
};

/**
 * Current interface language setting
 */
let currentInterfaceLanguage: SupportedLanguage = 'en';

/**
 * Current chat language setting (for AI responses)
 */
let currentChatLanguage: 'auto' | SupportedLanguage = 'auto';

/**
 * Last detected language from user input
 */
let lastDetectedLanguage: SupportedLanguage = 'en';

/**
 * Set the current interface language
 */
export function setInterfaceLanguage(language: SupportedLanguage): void {
  currentInterfaceLanguage = language;
}

/**
 * Set the current chat language setting
 */
export function setChatLanguage(language: 'auto' | SupportedLanguage): void {
  currentChatLanguage = language;
}

/**
 * Get the current interface language
 */
export function getCurrentInterfaceLanguage(): SupportedLanguage {
  return currentInterfaceLanguage;
}

/**
 * Get the current chat language setting
 */
export function getCurrentChatLanguage(): 'auto' | SupportedLanguage {
  return currentChatLanguage;
}

/**
 * Get the effective chat language (resolves 'auto' to detected language)
 */
export function getEffectiveChatLanguage(): SupportedLanguage {
  return currentChatLanguage === 'auto' ? lastDetectedLanguage : currentChatLanguage;
}

/**
 * Set the current language (legacy compatibility)
 */
export function setLanguage(language: SupportedLanguage): void {
  setInterfaceLanguage(language);
}

/**
 * Get the current language (legacy compatibility)
 */
export function getCurrentLanguage(): SupportedLanguage {
  return getCurrentInterfaceLanguage();
}

/**
 * Get translation for a specific key path
 * @param keyPath - Dot-separated path to translation key (e.g., 'cli.welcome')
 * @param params - Parameters to substitute in the translation
 * @returns Translated string with parameters substituted
 */
export function t(keyPath: string, params?: Record<string, string | number>): string {
  const keys = keyPath.split('.');
  let value: any = translations[currentInterfaceLanguage];
  
  // Navigate through the translation object
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English if key not found
      console.warn(`Translation key not found: ${keyPath} for language ${currentInterfaceLanguage}`);
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
 * Detect language from user input text
 */
export function detectLanguageFromText(text: string): SupportedLanguage {
  // Japanese character detection: Hiragana, Katakana, Kanji
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  const japaneseChars = (text.match(japaneseRegex) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  
  // If more than 30% of characters are Japanese, consider it Japanese
  const isJapanese = totalChars > 0 && (japaneseChars / totalChars > 0.3);
  
  const detectedLanguage = isJapanese ? 'ja' : 'en';
  lastDetectedLanguage = detectedLanguage;
  
  return detectedLanguage;
}

/**
 * Initialize i18n system with language preferences
 */
export function initializeI18n(interfaceLanguage?: SupportedLanguage, chatLanguage?: 'auto' | SupportedLanguage): void {
  // Handle legacy single-parameter case
  if (arguments.length === 1 && typeof interfaceLanguage === 'string') {
    // Legacy mode: set interface language and default chat to auto
    if (interfaceLanguage && interfaceLanguage in translations) {
      setInterfaceLanguage(interfaceLanguage);
    } else {
      const systemLanguage = getSystemLanguage();
      if (systemLanguage && systemLanguage in translations) {
        setInterfaceLanguage(systemLanguage);
      } else {
        setInterfaceLanguage('en');
      }
    }
    setChatLanguage('auto');
    return;
  }
  
  // Set interface language
  if (interfaceLanguage && interfaceLanguage in translations) {
    setInterfaceLanguage(interfaceLanguage);
  } else {
    // Auto-detect language from browser/system if available
    const systemLanguage = getSystemLanguage();
    if (systemLanguage && systemLanguage in translations) {
      setInterfaceLanguage(systemLanguage);
    } else {
      setInterfaceLanguage('en'); // Default to English
    }
  }
  
  // Set chat language
  if (chatLanguage) {
    setChatLanguage(chatLanguage);
  } else {
    setChatLanguage('auto'); // Default to auto-detection
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
  
  const locale = currentInterfaceLanguage === 'ja' ? 'ja-JP' : 'en-US';
  return date.toLocaleString(locale, options);
}

/**
 * Get system prompt translations for specific language
 */
export function getSystemPromptTranslations(language: SupportedLanguage) {
  return translations[language].systemPrompt;
}

/**
 * Read and parse OBSIUS.md file for vault-specific instructions
 */
async function readObsiusMdInstructions(app: any): Promise<string | null> {
  try {
    // Check if OBSIUS.md exists in vault root
    const obsiusFile = app.vault.getAbstractFileByPath('OBSIUS.md');
    if (!obsiusFile) {
      return null;
    }

    // Read file content
    const content = await app.vault.read(obsiusFile);
    if (!content || typeof content !== 'string') {
      return null;
    }

    // Extract content after the front matter and before the footer
    const lines = content.split('\n');
    let startIndex = -1;
    let endIndex = lines.length;

    // Find the end of frontmatter (second ---)
    let frontmatterCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterCount++;
        if (frontmatterCount === 2) {
          startIndex = i + 1;
          break;
        }
      }
    }

    // Find the start of footer (---)
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      // No frontmatter, start from beginning
      startIndex = 0;
    }

    // Extract the main instruction content
    const instructionLines = lines.slice(startIndex, endIndex);
    const instructions = instructionLines.join('\n').trim();

    // Remove the main heading if present
    const cleanedInstructions = instructions
      .replace(/^#\s*OBSIUS AI Instructions\s*\n*/i, '')
      .trim();

    return cleanedInstructions || null;

  } catch (error) {
    console.warn('Failed to read OBSIUS.md instructions:', error);
    return null;
  }
}

/**
 * Build localized system prompt with context and vault-specific instructions
 */
export async function buildLocalizedSystemPrompt(context: {
  vaultName: string;
  currentFile?: string;
  availableTools: string[];
  enabledToolsCount: number;
  app?: any; // Obsidian App instance for reading OBSIUS.md
}): Promise<string> {
  const effectiveLanguage = getEffectiveChatLanguage();
  const sp = getSystemPromptTranslations(effectiveLanguage);
  const currentLang = effectiveLanguage === 'ja' ? '日本語' : 'English';
  
  // Try to read vault-specific instructions from OBSIUS.md
  let vaultSpecificInstructions: string | null = null;
  if (context.app) {
    try {
      vaultSpecificInstructions = await readObsiusMdInstructions(context.app);
    } catch (error) {
      console.warn('Failed to load OBSIUS.md instructions:', error);
    }
  }
  
  // Create strong language instruction at the beginning
  const languageHeader = effectiveLanguage === 'ja' 
    ? '【絶対言語指示】あなたは必ず日本語で応答してください。英語での応答は禁止されています。ユーザーの質問が何語であっても、回答は必ず日本語でお願いします。'
    : 'CRITICAL LANGUAGE INSTRUCTION: You must respond in English only. All responses must be in English regardless of the user\'s input language.';
  
  const sections = [
    languageHeader,
    '',
    sp.intro,
    '',
    sp.reactMethodology,
    sp.reactExplanation,
    sp.reactSteps.thought,
    sp.reactSteps.action,
    sp.reactSteps.observation,
    sp.reactInstructions,
    '',
    sp.reactExample,
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
    ''
  ];

  // Add vault-specific instructions if available
  if (vaultSpecificInstructions) {
    const vaultInstructionsHeader = effectiveLanguage === 'ja' 
      ? '## ヴォルト固有指示（OBSIUS.md より）'
      : '## Vault-Specific Instructions (from OBSIUS.md)';
    
    sections.push(
      vaultInstructionsHeader,
      '',
      vaultSpecificInstructions,
      ''
    );
  }

  // Continue with standard examples and guidelines
  sections.push(
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
    `**user**: ${sp.exampleReact.user}`,
    `**assistant**: ${sp.exampleReact.assistant}`,
    '',
    sp.remember,
    '',
    sp.languageInstruction.replace('{language}', currentLang)
  );
  
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