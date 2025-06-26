# Configuration and Settings Specification

This document defines the configuration system, settings management, and customization options for the Obsius AI assistant plugin.

## Configuration Architecture

### Hierarchical Configuration System

```
Global Settings (Plugin)
├─ Provider Configuration (OpenAI, Claude, Gemini)
├─ LangChain Configuration (Memory, Tools, Graphs)
├─ UI Preferences (Theme, Layout, Behavior)
├─ Tool Settings (Enabled tools, Confirmations)
└─ Security Settings (API keys, Permissions)

Vault Settings (.obsius/)
├─ Vault-specific Provider Settings
├─ Custom Tool Configurations
├─ Project Templates
└─ Local Preferences

Session Settings (Runtime)
├─ Active Provider
├─ Current Context
├─ Tool State
└─ UI State
```

### Configuration Storage

**Global Settings**: Stored in Obsidian's plugin data system
- Path: `.obsidian/plugins/obsius/data.json`
- Encrypted sensitive data (API keys)
- Synced across devices with vault

**Vault Settings**: Stored in vault-specific directory
- Path: `.obsius/config.json`
- Version controlled with vault
- Shareable across team members

**Session Settings**: Runtime memory only
- Not persisted
- Reset on plugin reload
- Managed by session manager

## Configuration Schema

### Global Plugin Settings

```typescript
interface ObsiusGlobalSettings {
  // Provider Configuration
  providers: {
    openai: OpenAIProviderConfig;
    claude: ClaudeProviderConfig;
    gemini: GeminiProviderConfig;
  };
  
  // Default Provider
  defaultProvider: 'openai' | 'claude' | 'gemini';
  
  // LangChain Configuration
  langchain: LangChainConfiguration;
  
  // UI Configuration
  ui: UIConfiguration;
  
  // Tool Configuration
  tools: ToolConfiguration;
  
  // Security Configuration
  security: SecurityConfiguration;
  
  // Advanced Configuration
  advanced: AdvancedConfiguration;
  
  // Version and Migration
  version: string;
  migrationVersion: number;
}
```

### Provider Configurations

#### OpenAI Provider Configuration

```typescript
interface OpenAIProviderConfig {
  enabled: boolean;
  apiKey?: string; // Encrypted when stored
  organizationId?: string; // Optional organization ID
  apiUrl?: string; // For custom endpoints (Azure OpenAI, etc.)
  
  models: {
    default: string;
    available: string[];
    custom?: ModelConfiguration[];
  };
  
  parameters: {
    temperature: number; // 0.0 - 2.0
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };
  
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    tokensPerDay?: number;
  };
  
  azure?: {
    endpoint: string;
    apiVersion: string;
    deploymentName: string;
  };
  
  advanced: {
    streamingEnabled: boolean;
    functionCalling: boolean;
    jsonMode: boolean;
    logitBias?: Record<string, number>;
  };
}
```

#### Claude Provider Configuration

```typescript
interface ClaudeProviderConfig {
  enabled: boolean;
  apiKey?: string; // Encrypted when stored
  apiUrl?: string; // For custom endpoints
  
  models: {
    default: string;
    available: string[];
    custom?: ModelConfiguration[];
  };
  
  parameters: {
    temperature: number; // 0.0 - 1.0
    maxTokens: number;
    topP: number;
    stopSequences: string[];
  };
  
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  
  advanced: {
    streamingEnabled: boolean;
    contextWindow: number;
    systemPrompt?: string;
  };
}
```

#### Gemini Provider Configuration

```typescript
interface GeminiProviderConfig {
  enabled: boolean;
  apiKey?: string; // Encrypted when stored
  projectId?: string; // For Google Cloud
  
  models: {
    default: string;
    available: string[];
  };
  
  parameters: {
    temperature: number;
    maxTokens: number;
    topK: number;
    topP: number;
  };
  
  safety: {
    harmBlockThreshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
    categories: string[];
  };
  
  advanced: {
    streamingEnabled: boolean;
    functionCalling: boolean;
  };
}
```

### LangChain Configuration

```typescript
interface LangChainConfiguration {
  // Memory Configuration
  memory: {
    conversationBuffer: {
      enabled: boolean;
      maxTokens: number;
      returnMessages: boolean;
    };
    
    vectorStore: {
      enabled: boolean;
      provider: 'memory' | 'chroma' | 'pinecone';
      dimensions: number;
      similarity_threshold: number;
    };
    
    entityMemory: {
      enabled: boolean;
      llm_provider: string;
      entity_extraction_prompt?: string;
    };
    
    obsidianContext: {
      enabled: boolean;
      include_current_note: boolean;
      include_vault_stats: boolean;
      include_recent_files: number;
      context_window_size: number;
    };
  };
  
  // Tool Configuration
  tools: {
    enabled_tools: string[];
    tool_timeout: number;
    max_tool_calls_per_request: number;
    
    obsidian_tools: {
      note_operations: boolean;
      link_management: boolean;
      vault_operations: boolean;
      search_tools: boolean;
    };
    
    web_tools: {
      search_enabled: boolean;
      fetch_enabled: boolean;
      max_requests_per_session: number;
      allowed_domains?: string[];
      blocked_domains?: string[];
    };
  };
  
  // Agent Configuration
  agents: {
    default_agent_type: 'conversational' | 'react' | 'openai_functions';
    
    graph_config: {
      max_iterations: number;
      early_stopping_method: 'force' | 'generate';
      return_intermediate_steps: boolean;
    };
    
    planning: {
      enabled: boolean;
      max_planning_depth: number;
      planning_llm_provider?: string;
    };
    
    reflection: {
      enabled: boolean;
      reflection_threshold: number;
      max_reflections: number;
    };
  };
  
  // Prompt Configuration
  prompts: {
    system_prompt?: string;
    planning_prompt?: string;
    reflection_prompt?: string;
    tool_description_template?: string;
    
    obsidian_context_template: string;
    error_handling_template: string;
  };
  
  // Performance Configuration
  performance: {
    streaming_enabled: boolean;
    batch_size: number;
    concurrent_requests: number;
    cache_enabled: boolean;
    cache_ttl: number;
  };
}
```

### UI Configuration

```typescript
interface UIConfiguration {
  // Layout Settings
  layout: {
    sidebarWidth: number; // 300-600px
    sidebarPosition: 'right' | 'left';
    collapsible: boolean;
    startCollapsed: boolean;
  };
  
  // Theme Settings
  theme: {
    mode: 'auto' | 'light' | 'dark';
    customTheme?: string;
    accentColor?: string;
    fontFamily?: string;
    fontSize: number; // 10-18px
  };
  
  // Display Settings
  display: {
    showTypingIndicator: boolean;
    showToolDetails: boolean;
    showTimestamps: boolean;
    showWordCount: boolean;
    animationsEnabled: boolean;
    reduceMotion: boolean;
  };
  
  // Chat Settings
  chat: {
    maxHistoryItems: number; // 50-500
    autoScroll: boolean;
    showContextInfo: boolean;
    showQuickActions: boolean;
    commandSuggestions: boolean;
  };
  
  // Accessibility
  accessibility: {
    highContrast: boolean;
    announceMessages: boolean;
    keyboardShortcuts: boolean;
    screenReaderSupport: boolean;
  };
}
```

### Tool Configuration

```typescript
interface ToolConfiguration {
  // Global Tool Settings
  global: {
    enabledTools: string[];
    disabledTools: string[];
    toolTimeout: number; // seconds
    batchOperationLimit: number;
  };
  
  // Confirmation Settings
  confirmations: {
    alwaysConfirm: string[]; // Tool names requiring confirmation
    neverConfirm: string[]; // Auto-approved tools
    batchConfirmation: boolean;
    destructiveOperations: boolean;
  };
  
  // Tool-Specific Settings
  noteTools: {
    defaultTemplate?: string;
    autoLinking: boolean;
    backupBeforeEdit: boolean;
    preserveHistory: boolean;
  };
  
  webTools: {
    maxSearchResults: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
    contentFiltering: boolean;
    citationStyle: 'apa' | 'mla' | 'chicago' | 'ieee';
  };
  
  fileTools: {
    maxFileSize: number; // MB
    allowedExtensions: string[];
    sandboxed: boolean;
  };
}
```

### Security Configuration

```typescript
interface SecurityConfiguration {
  // API Security
  api: {
    encryptApiKeys: boolean;
    validateCertificates: boolean;
    requestTimeout: number;
    retryLimit: number;
  };
  
  // Tool Security
  tools: {
    sandboxMode: boolean;
    restrictToVault: boolean;
    allowSystemCommands: boolean;
    fileAccessRestrictions: string[];
  };
  
  // Network Security
  network: {
    allowExternalRequests: boolean;
    proxySettings?: ProxyConfiguration;
    userAgent: string;
    headers?: Record<string, string>;
  };
  
  // Privacy Settings
  privacy: {
    telemetryEnabled: boolean;
    errorReporting: boolean;
    anonymizeData: boolean;
    retainHistory: boolean;
  };
}
```

## Settings Management

### Settings Manager Implementation

```typescript
export class SettingsManager {
  private globalSettings: ObsiusGlobalSettings;
  private vaultSettings: ObsiusVaultSettings;
  private settingsSubject = new BehaviorSubject<ObsiusGlobalSettings>(null);
  
  constructor(private plugin: ObsiusPlugin) {}
  
  async loadSettings(): Promise<void> {
    // Load global settings
    this.globalSettings = Object.assign(
      {},
      DEFAULT_GLOBAL_SETTINGS,
      await this.plugin.loadData()
    );
    
    // Load vault-specific settings
    this.vaultSettings = await this.loadVaultSettings();
    
    // Merge and validate
    await this.validateAndMigrate();
    
    // Notify subscribers
    this.settingsSubject.next(this.globalSettings);
  }
  
  async saveSettings(): Promise<void> {
    await this.plugin.saveData(this.globalSettings);
    await this.saveVaultSettings();
  }
  
  // Provider Settings
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const encrypted = await this.encryptApiKey(apiKey);
    this.globalSettings.providers[provider].apiKey = encrypted;
    await this.saveSettings();
  }
  
  async getApiKey(provider: string): Promise<string | null> {
    const encrypted = this.globalSettings.providers[provider].apiKey;
    return encrypted ? await this.decryptApiKey(encrypted) : null;
  }
  
  // UI Settings
  updateUISettings(updates: Partial<UIConfiguration>): void {
    this.globalSettings.ui = { ...this.globalSettings.ui, ...updates };
    this.settingsSubject.next(this.globalSettings);
  }
  
  // Tool Settings
  isToolEnabled(toolName: string): boolean {
    const config = this.globalSettings.tools;
    if (config.global.disabledTools.includes(toolName)) return false;
    if (config.global.enabledTools.length === 0) return true;
    return config.global.enabledTools.includes(toolName);
  }
  
  requiresConfirmation(toolName: string): boolean {
    const config = this.globalSettings.tools.confirmations;
    if (config.neverConfirm.includes(toolName)) return false;
    return config.alwaysConfirm.includes(toolName);
  }
}
```

### Settings Migration

```typescript
interface MigrationHandler {
  version: number;
  migrate(settings: any): any;
}

const MIGRATION_HANDLERS: MigrationHandler[] = [
  {
    version: 1,
    migrate: (settings) => {
      // Migrate from v0 to v1
      if (settings.apiKey) {
        settings.providers = {
          claude: { apiKey: settings.apiKey }
        };
        delete settings.apiKey;
      }
      return settings;
    }
  },
  {
    version: 2, 
    migrate: (settings) => {
      // Migrate from v1 to v2
      if (!settings.ui) {
        settings.ui = DEFAULT_UI_SETTINGS;
      }
      return settings;
    }
  }
];

export async function migrateSettings(
  settings: any, 
  currentVersion: number
): Promise<any> {
  let migratedSettings = { ...settings };
  
  for (const handler of MIGRATION_HANDLERS) {
    if (handler.version > currentVersion) {
      migratedSettings = handler.migrate(migratedSettings);
    }
  }
  
  migratedSettings.migrationVersion = CURRENT_MIGRATION_VERSION;
  return migratedSettings;
}
```

## Settings UI

### Settings Tab Implementation

```typescript
export class ObsiusSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ObsiusPlugin) {
    super(app, plugin);
  }
  
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    // Create tabbed interface
    this.createTabs(containerEl);
  }
  
  private createTabs(container: HTMLElement): void {
    const tabContainer = container.createDiv('obsius-settings-tabs');
    const contentContainer = container.createDiv('obsius-settings-content');
    
    const tabs = [
      { id: 'providers', name: 'AI Providers', content: this.createProvidersTab },
      { id: 'ui', name: 'Interface', content: this.createUITab },
      { id: 'tools', name: 'Tools', content: this.createToolsTab },
      { id: 'security', name: 'Security', content: this.createSecurityTab },
      { id: 'advanced', name: 'Advanced', content: this.createAdvancedTab }
    ];
    
    // Create tab buttons
    tabs.forEach(tab => {
      const button = tabContainer.createEl('button', {
        text: tab.name,
        cls: 'obsius-settings-tab'
      });
      
      button.addEventListener('click', () => {
        this.showTab(tab.id, tabs, contentContainer);
      });
    });
    
    // Show first tab by default
    this.showTab(tabs[0].id, tabs, contentContainer);
  }
  
  private createProvidersTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'AI Providers' });
    
    // Claude Configuration
    this.createProviderSection(container, 'claude', 'Claude (Anthropic)');
    
    // Gemini Configuration  
    this.createProviderSection(container, 'gemini', 'Gemini (Google)');
    
    // Default Provider Selection
    new Setting(container)
      .setName('Default Provider')
      .setDesc('The AI provider to use by default')
      .addDropdown(dropdown => {
        dropdown
          .addOption('claude', 'Claude')
          .addOption('gemini', 'Gemini')
          .setValue(this.plugin.settings.defaultProvider)
          .onChange(async (value) => {
            this.plugin.settings.defaultProvider = value as any;
            await this.plugin.saveSettings();
          });
      });
  }
  
  private createProviderSection(
    container: HTMLElement,
    providerId: string,
    displayName: string
  ): void {
    const section = container.createDiv('obsius-provider-section');
    section.createEl('h4', { text: displayName });
    
    const config = this.plugin.settings.providers[providerId];
    
    // Enable/Disable Provider
    new Setting(section)
      .setName('Enable Provider')
      .setDesc(`Enable ${displayName} for AI operations`)
      .addToggle(toggle => {
        toggle
          .setValue(config.enabled)
          .onChange(async (value) => {
            config.enabled = value;
            await this.plugin.saveSettings();
          });
      });
    
    // API Key Setting
    new Setting(section)
      .setName('API Key')
      .setDesc(`Your ${displayName} API key`)
      .addText(text => {
        text
          .setPlaceholder('Enter API key...')
          .setValue(config.apiKey ? '••••••••••••••••' : '')
          .onChange(async (value) => {
            if (value && value !== '••••••••••••••••') {
              await this.plugin.settingsManager.setApiKey(providerId, value);
            }
          });
      });
    
    // Model Selection
    new Setting(section)
      .setName('Default Model')
      .setDesc('Model to use for this provider')
      .addDropdown(dropdown => {
        config.models.available.forEach(model => {
          dropdown.addOption(model, model);
        });
        
        dropdown
          .setValue(config.models.default)
          .onChange(async (value) => {
            config.models.default = value;
            await this.plugin.saveSettings();
          });
      });
  }
  
  private createUITab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Interface Settings' });
    
    const ui = this.plugin.settings.ui;
    
    // Theme Settings
    const themeSection = container.createDiv('obsius-ui-section');
    themeSection.createEl('h4', { text: 'Theme' });
    
    new Setting(themeSection)
      .setName('Theme Mode')
      .setDesc('Choose light, dark, or auto theme')
      .addDropdown(dropdown => {
        dropdown
          .addOption('auto', 'Auto (follow Obsidian)')
          .addOption('light', 'Light')
          .addOption('dark', 'Dark')
          .setValue(ui.theme.mode)
          .onChange(async (value) => {
            ui.theme.mode = value as any;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(themeSection)
      .setName('Font Size')
      .setDesc('Font size for chat interface')
      .addSlider(slider => {
        slider
          .setLimits(10, 18, 1)
          .setValue(ui.theme.fontSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            ui.theme.fontSize = value;
            await this.plugin.saveSettings();
          });
      });
    
    // Layout Settings
    const layoutSection = container.createDiv('obsius-ui-section');
    layoutSection.createEl('h4', { text: 'Layout' });
    
    new Setting(layoutSection)
      .setName('Sidebar Width')
      .setDesc('Width of the Obsius sidebar panel')
      .addSlider(slider => {
        slider
          .setLimits(300, 600, 10)
          .setValue(ui.layout.sidebarWidth)
          .setDynamicTooltip()
          .onChange(async (value) => {
            ui.layout.sidebarWidth = value;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(layoutSection)
      .setName('Start Collapsed')
      .setDesc('Start with sidebar collapsed')
      .addToggle(toggle => {
        toggle
          .setValue(ui.layout.startCollapsed)
          .onChange(async (value) => {
            ui.layout.startCollapsed = value;
            await this.plugin.saveSettings();
          });
      });
    
    // Display Settings
    const displaySection = container.createDiv('obsius-ui-section');
    displaySection.createEl('h4', { text: 'Display' });
    
    new Setting(displaySection)
      .setName('Show Tool Details')
      .setDesc('Show detailed information about tool execution')
      .addToggle(toggle => {
        toggle
          .setValue(ui.display.showToolDetails)
          .onChange(async (value) => {
            ui.display.showToolDetails = value;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(displaySection)
      .setName('Show Timestamps')
      .setDesc('Show timestamps for messages')
      .addToggle(toggle => {
        toggle
          .setValue(ui.display.showTimestamps)
          .onChange(async (value) => {
            ui.display.showTimestamps = value;
            await this.plugin.saveSettings();
          });
      });
  }
  
  private createToolsTab(container: HTMLElement): void {
    container.createEl('h3', { text: 'Tool Configuration' });
    
    const tools = this.plugin.settings.tools;
    
    // Global Tool Settings
    const globalSection = container.createDiv('obsius-tools-section');
    globalSection.createEl('h4', { text: 'General' });
    
    new Setting(globalSection)
      .setName('Tool Timeout')
      .setDesc('Maximum time for tool execution (seconds)')
      .addText(text => {
        text
          .setValue(tools.global.toolTimeout.toString())
          .onChange(async (value) => {
            const timeout = parseInt(value);
            if (!isNaN(timeout) && timeout > 0) {
              tools.global.toolTimeout = timeout;
              await this.plugin.saveSettings();
            }
          });
      });
    
    // Confirmation Settings
    const confirmSection = container.createDiv('obsius-tools-section');
    confirmSection.createEl('h4', { text: 'Confirmations' });
    
    new Setting(confirmSection)
      .setName('Batch Confirmation')
      .setDesc('Require confirmation for batch operations')
      .addToggle(toggle => {
        toggle
          .setValue(tools.confirmations.batchConfirmation)
          .onChange(async (value) => {
            tools.confirmations.batchConfirmation = value;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(confirmSection)
      .setName('Destructive Operations')
      .setDesc('Always confirm destructive operations')
      .addToggle(toggle => {
        toggle
          .setValue(tools.confirmations.destructiveOperations)
          .onChange(async (value) => {
            tools.confirmations.destructiveOperations = value;
            await this.plugin.saveSettings();
          });
      });
    
    // Tool-Specific Settings
    const noteSection = container.createDiv('obsius-tools-section');
    noteSection.createEl('h4', { text: 'Note Tools' });
    
    new Setting(noteSection)
      .setName('Auto Linking')
      .setDesc('Automatically create links when creating notes')
      .addToggle(toggle => {
        toggle
          .setValue(tools.noteTools.autoLinking)
          .onChange(async (value) => {
            tools.noteTools.autoLinking = value;
            await this.plugin.saveSettings();
          });
      });
    
    new Setting(noteSection)
      .setName('Backup Before Edit')
      .setDesc('Create backup before modifying notes')
      .addToggle(toggle => {
        toggle
          .setValue(tools.noteTools.backupBeforeEdit)
          .onChange(async (value) => {
            tools.noteTools.backupBeforeEdit = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
```

## Default Configurations

### Default Global Settings

```typescript
export const DEFAULT_GLOBAL_SETTINGS: ObsiusGlobalSettings = {
  providers: {
    openai: {
      enabled: true,
      apiKey: undefined,
      models: {
        default: 'gpt-4-turbo-preview',
        available: [
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-3.5-turbo',
          'gpt-4o',
          'gpt-4o-mini'
        ]
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: []
      },
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
        tokensPerDay: 1000000
      },
      advanced: {
        streamingEnabled: true,
        functionCalling: true,
        jsonMode: true
      }
    },
    claude: {
      enabled: false,
      apiKey: undefined,
      models: {
        default: 'claude-3-sonnet-20240229',
        available: [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229', 
          'claude-3-haiku-20240307'
        ]
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
        stopSequences: []
      },
      rateLimit: {
        requestsPerMinute: 50,
        tokensPerMinute: 40000
      },
      advanced: {
        streamingEnabled: true,
        contextWindow: 200000
      }
    },
    gemini: {
      enabled: false,
      apiKey: undefined,
      models: {
        default: 'gemini-pro',
        available: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash']
      },
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topK: 40,
        topP: 0.8
      },
      safety: {
        harmBlockThreshold: 'BLOCK_MEDIUM_AND_ABOVE',
        categories: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH']
      },
      advanced: {
        streamingEnabled: true,
        functionCalling: true
      }
    }
  },
  
  defaultProvider: 'openai',
  
  langchain: {
    memory: {
      conversationBuffer: {
        enabled: true,
        maxTokens: 4000,
        returnMessages: true
      },
      vectorStore: {
        enabled: false,
        provider: 'memory',
        dimensions: 1536,
        similarity_threshold: 0.7
      },
      entityMemory: {
        enabled: false,
        llm_provider: 'openai'
      },
      obsidianContext: {
        enabled: true,
        include_current_note: true,
        include_vault_stats: true,
        include_recent_files: 5,
        context_window_size: 2000
      }
    },
    tools: {
      enabled_tools: [],
      tool_timeout: 60,
      max_tool_calls_per_request: 10,
      obsidian_tools: {
        note_operations: true,
        link_management: true,
        vault_operations: true,
        search_tools: true
      },
      web_tools: {
        search_enabled: true,
        fetch_enabled: true,
        max_requests_per_session: 20
      }
    },
    agents: {
      default_agent_type: 'openai_functions',
      graph_config: {
        max_iterations: 10,
        early_stopping_method: 'generate',
        return_intermediate_steps: true
      },
      planning: {
        enabled: true,
        max_planning_depth: 3
      },
      reflection: {
        enabled: false,
        reflection_threshold: 0.8,
        max_reflections: 2
      }
    },
    prompts: {
      obsidian_context_template: 'Current context: {context}',
      error_handling_template: 'Error occurred: {error}. Please try again.'
    },
    performance: {
      streaming_enabled: true,
      batch_size: 5,
      concurrent_requests: 3,
      cache_enabled: true,
      cache_ttl: 300
    }
  },
  
  ui: {
    layout: {
      sidebarWidth: 350,
      sidebarPosition: 'right',
      collapsible: true,
      startCollapsed: false
    },
    theme: {
      mode: 'auto',
      fontSize: 14
    },
    display: {
      showTypingIndicator: true,
      showToolDetails: true,
      showTimestamps: false,
      showWordCount: true,
      animationsEnabled: true,
      reduceMotion: false
    },
    chat: {
      maxHistoryItems: 100,
      autoScroll: true,
      showContextInfo: true,
      showQuickActions: true,
      commandSuggestions: true
    },
    accessibility: {
      highContrast: false,
      announceMessages: false,
      keyboardShortcuts: true,
      screenReaderSupport: true
    }
  },
  
  tools: {
    global: {
      enabledTools: [],
      disabledTools: [],
      toolTimeout: 60,
      batchOperationLimit: 10
    },
    confirmations: {
      alwaysConfirm: ['update_note', 'create_link'],
      neverConfirm: ['read_note', 'search_notes', 'list_files'],
      batchConfirmation: true,
      destructiveOperations: true
    },
    noteTools: {
      autoLinking: true,
      backupBeforeEdit: true,
      preserveHistory: true
    },
    webTools: {
      maxSearchResults: 10,
      contentFiltering: true,
      citationStyle: 'apa'
    },
    fileTools: {
      maxFileSize: 10,
      allowedExtensions: ['.md', '.txt', '.json'],
      sandboxed: true
    }
  },
  
  security: {
    api: {
      encryptApiKeys: true,
      validateCertificates: true,
      requestTimeout: 30,
      retryLimit: 3
    },
    tools: {
      sandboxMode: true,
      restrictToVault: true,
      allowSystemCommands: false,
      fileAccessRestrictions: []
    },
    network: {
      allowExternalRequests: true,
      userAgent: 'Obsius/1.0'
    },
    privacy: {
      telemetryEnabled: false,
      errorReporting: false,
      anonymizeData: true,
      retainHistory: true
    }
  },
  
  advanced: {
    debugMode: false,
    experimentalFeatures: false,
    customEndpoints: {},
    pluginIntegrations: []
  },
  
  version: '1.0.0',
  migrationVersion: 2
};
```

This configuration specification provides a comprehensive system for managing all aspects of the Obsius plugin, from AI provider settings to UI customization and security preferences. The hierarchical approach ensures flexibility while maintaining security and usability.