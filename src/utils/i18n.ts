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