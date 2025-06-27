/**
 * Obsius AI Agent - Main Plugin File
 * 
 * An AI agent for Obsidian that provides ClaudeCode-like functionality
 * for efficient note management and vault operations.
 */

import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { 
  ToolRegistry, 
  CreateNoteTool, 
  ReadNoteTool, 
  SearchNotesTool, 
  UpdateNoteTool 
} from './src/tools';
import { ExecutionContext, ObsiusSettings, SecureProviderConfig } from './src/utils/types';
import { ProviderManager } from './src/core/providers/ProviderManager';
import { ApiKeyInput } from './src/ui/components/ApiKeyInput';

/**
 * Default plugin settings
 */
const DEFAULT_SETTINGS: ObsiusSettings = {
  providers: {
    openai: {
      name: 'OpenAI',
      model: 'gpt-4',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    },
    anthropic: {
      name: 'Anthropic Claude',
      model: 'claude-3-sonnet-20240229',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    },
    google: {
      name: 'Google AI (Gemini)',
      model: 'gemini-pro',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    }
  },
  defaultProvider: 'openai',
  tools: {
    enabled: ['create_note', 'read_note', 'search_notes', 'update_note'],
    confirmationRequired: ['update_note'],
    riskLevels: {
      low: ['create_note', 'read_note', 'search_notes'],
      medium: ['update_note'],
      high: []
    }
  },
  ui: {
    theme: 'auto',
    showTimestamps: true,
    enableStreaming: false,
    autoScroll: true
  },
  sessions: {
    maxHistorySize: 100,
    autoSave: true,
    persistAcrossReloads: true
  }
};

/**
 * Main Obsius Plugin Class
 */
export default class ObsiusPlugin extends Plugin {
  settings: ObsiusSettings;
  toolRegistry: ToolRegistry;
  providerManager: ProviderManager;

  async onload() {
    console.log('Loading Obsius AI Agent plugin...');

    // Load settings
    await this.loadSettings();

    // Initialize provider manager
    await this.initializeProviderManager();

    // Initialize tool registry
    this.initializeToolRegistry();

    // Register commands
    this.registerCommands();

    // Add ribbon icon
    this.addRibbonIcon('bot', 'Obsius AI Agent', () => {
      new Notice('Obsius AI Agent is ready! Use Command Palette to access tools.');
    });

    // Add status bar
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText('Obsius Ready');

    // Add settings tab
    this.addSettingTab(new ObsiusSettingTab(this.app, this));

    console.log('Obsius AI Agent plugin loaded successfully!');
  }

  onunload() {
    console.log('Unloading Obsius AI Agent plugin...');
    
    // Cleanup provider manager
    if (this.providerManager) {
      this.providerManager.destroy();
    }
  }

  /**
   * Initialize provider manager with secure API key handling
   */
  private async initializeProviderManager(): Promise<void> {
    this.providerManager = new ProviderManager(this);
    
    // Pass existing provider configurations to preserve authentication states
    console.log('🔑 Initializing ProviderManager with existing auth states:', 
      Object.entries(this.settings.providers).map(([id, config]) => 
        `${id}: ${config.authenticated ? 'authenticated' : 'not authenticated'}`
      ).join(', ')
    );
    await this.providerManager.initialize(this.settings.providers);

    // Check for old plaintext API keys and migrate them
    const oldData = await this.loadData();
    if (oldData?.providers) {
      const hasOldKeys = Object.values(oldData.providers).some((p: any) => p.apiKey);
      if (hasOldKeys) {
        console.log('Migrating old API keys to secure storage...');
        await this.providerManager.migrateFromPlaintext(oldData.providers);
        
        // Clear old plaintext keys from settings
        for (const provider of Object.values(oldData.providers) as any[]) {
          delete provider.apiKey;
        }
        await this.saveData(oldData);
      }
    }

    // Only sync new providers that might have been added
    const providerConfigs = this.providerManager.getAllProviderConfigs();
    for (const [providerId, config] of Object.entries(providerConfigs)) {
      // Only update if the provider doesn't exist in settings yet
      if (!this.settings.providers[providerId]) {
        this.settings.providers[providerId] = config;
      }
    }
    
    // Save settings to persist any new providers
    await this.saveSettings();
    
    // Log final authentication states
    console.log('🔑 Final provider auth states after initialization:', 
      Object.entries(this.settings.providers).map(([id, config]) => 
        `${id}: ${config.authenticated ? 'authenticated' : 'not authenticated'}`
      ).join(', ')
    );
  }

  /**
   * Initialize the tool registry with basic Obsidian tools
   */
  private initializeToolRegistry(): void {
    const context = this.createExecutionContext();
    this.toolRegistry = new ToolRegistry(this.app, context);

    // Register basic Obsidian tools
    this.toolRegistry.registerTool('create_note', CreateNoteTool, {
      description: 'Create a new note in the vault',
      riskLevel: 'low',
      category: 'obsidian',
      enabled: this.settings.tools.enabled.includes('create_note')
    });

    this.toolRegistry.registerTool('read_note', ReadNoteTool, {
      description: 'Read content from an existing note',
      riskLevel: 'low',
      category: 'obsidian',
      enabled: this.settings.tools.enabled.includes('read_note')
    });

    this.toolRegistry.registerTool('search_notes', SearchNotesTool, {
      description: 'Search for notes in the vault',
      riskLevel: 'low',
      category: 'obsidian',
      enabled: this.settings.tools.enabled.includes('search_notes')
    });

    this.toolRegistry.registerTool('update_note', UpdateNoteTool, {
      description: 'Update content of an existing note',
      riskLevel: 'medium',
      category: 'obsidian',
      enabled: this.settings.tools.enabled.includes('update_note')
    });

    console.log('Tool registry initialized with', this.toolRegistry.getStats());
  }

  /**
   * Create execution context for tools
   */
  private createExecutionContext(): ExecutionContext {
    const activeFile = this.app.workspace.getActiveFile();
    
    return {
      app: this.app,
      currentFile: activeFile || undefined,
      vaultPath: (this.app.vault.adapter as any).path || '',
      workspaceState: {
        activeFile: activeFile?.path,
        openTabs: this.app.workspace.getLeavesOfType('markdown').map(leaf => {
          const view = leaf.view as { file?: { path: string } };
          return view.file?.path || '';
        }).filter(path => path)
      }
    };
  }

  /**
   * Register plugin commands
   */
  private registerCommands(): void {
    // Test command for create note tool
    this.addCommand({
      id: 'test-create-note',
      name: 'Test: Create Note',
      callback: async () => {
        const result = await this.toolRegistry.executeTool('create_note', {
          title: 'Test Note',
          content: 'This is a test note created by Obsius AI Agent.\n\nTimestamp: ' + new Date().toISOString(),
          tags: ['test', 'obsius']
        });

        if (result.success) {
          new Notice('✅ ' + result.message);
        } else {
          new Notice('❌ ' + result.message);
        }
      }
    });

    // Test command for search notes tool
    this.addCommand({
      id: 'test-search-notes',
      name: 'Test: Search Notes',
      callback: async () => {
        const result = await this.toolRegistry.executeTool('search_notes', {
          query: 'test',
          limit: 5
        });

        if (result.success && result.data?.results) {
          const count = result.data.results.length;
          new Notice(`🔍 Found ${count} notes matching "test"`);
          console.log('Search results:', result.data.results);
        } else {
          new Notice('❌ Search failed: ' + result.message);
        }
      }
    });

    // Test command for read current note
    this.addCommand({
      id: 'test-read-current-note',
      name: 'Test: Read Current Note',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('❌ No active note to read');
          return;
        }

        const result = await this.toolRegistry.executeTool('read_note', {
          path: activeFile.path,
          includeMetadata: true
        });

        if (result.success) {
          new Notice('✅ Read note: ' + result.data?.title);
          console.log('Note content:', result.data);
        } else {
          new Notice('❌ ' + result.message);
        }
      }
    });

    // Debug command to show tool registry status
    this.addCommand({
      id: 'debug-tool-registry',
      name: 'Debug: Show Tool Registry Status',
      callback: () => {
        const debugInfo = this.toolRegistry.getDebugInfo();
        console.log('🔧 Obsius Tool Registry Debug Info:', debugInfo);
        new Notice(`🔧 Registry: ${debugInfo.enabledTools.length} tools enabled`);
      }
    });
  }

  /**
   * Load plugin settings with proper provider configuration merging
   */
  async loadSettings() {
    const savedData = await this.loadData();
    
    // Start with default settings
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    
    if (savedData) {
      // Merge non-provider settings normally
      Object.assign(this.settings, savedData);
      
      // Specially handle provider configurations to preserve authentication state
      if (savedData.providers) {
        for (const [providerId, savedProvider] of Object.entries(savedData.providers)) {
          if (this.settings.providers[providerId]) {
            // Merge saved provider config with default, preserving authentication state
            this.settings.providers[providerId] = {
              ...this.settings.providers[providerId],
              ...(savedProvider as SecureProviderConfig)
            };
            
            // Log authentication state loading
            const authState = (savedProvider as any).authenticated ? 'authenticated' : 'not authenticated';
            console.log(`🔑 Loaded ${providerId}: ${authState}${(savedProvider as any).lastVerified ? ` (verified: ${new Date((savedProvider as any).lastVerified).toLocaleString()})` : ''}`);
          } else {
            // Add new provider that wasn't in defaults
            this.settings.providers[providerId] = savedProvider as any;
            console.log(`🔑 Added new provider ${providerId}`);
          }
        }
      }
    }
  }

  /**
   * Save plugin settings
   */
  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update tool registry with new settings
    if (this.toolRegistry) {
      this.updateToolRegistry();
    }
  }

  /**
   * Update tool registry based on current settings
   */
  private updateToolRegistry(): void {
    const context = this.createExecutionContext();
    this.toolRegistry.updateDefaultContext(context);

    // Update tool enabled status
    for (const toolName of this.toolRegistry.getToolNames()) {
      const enabled = this.settings.tools.enabled.includes(toolName);
      this.toolRegistry.setToolEnabled(toolName, enabled);
    }
  }
}

/**
 * Settings tab for Obsius plugin with secure API key management
 */
class ObsiusSettingTab extends PluginSettingTab {
  plugin: ObsiusPlugin;
  private apiKeyInputs: Map<string, ApiKeyInput> = new Map();
  private providerStatusElements: Map<string, HTMLElement> = new Map();

  constructor(app: App, plugin: ObsiusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsius AI Agent Settings' });

    // AI Provider Settings
    this.createProviderSettings(containerEl);

    // Tool Settings
    this.createToolSettings(containerEl);

    // UI Settings
    this.createUISettings(containerEl);
  }

  /**
   * Create AI provider settings section
   */
  private createProviderSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'AI Provider Settings' });

    // Default provider selection
    new Setting(containerEl)
      .setName('Default Provider')
      .setDesc('Select the default AI provider for chat interactions')
      .addDropdown(dropdown => {
        for (const [providerId, config] of Object.entries(this.plugin.settings.providers)) {
          dropdown.addOption(providerId, config.name);
        }
        dropdown.setValue(this.plugin.settings.defaultProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultProvider = value;
          await this.plugin.saveSettings();
        });
      });

    // Provider status overview
    this.createProviderOverview(containerEl);

    // Individual provider settings
    this.createIndividualProviderSettings(containerEl);
  }

  /**
   * Create provider status overview
   */
  private createProviderOverview(containerEl: HTMLElement): void {
    const overviewEl = containerEl.createDiv('obsius-provider-overview');
    overviewEl.createEl('h4', { text: 'Provider Status' });

    const statusContainer = overviewEl.createDiv('obsius-status-grid');

    for (const [providerId, config] of Object.entries(this.plugin.settings.providers)) {
      const statusEl = statusContainer.createDiv('obsius-provider-status');
      
      statusEl.createEl('span', { 
        text: config.name,
        cls: 'obsius-provider-name'
      });

      const statusIcon = statusEl.createEl('span', { cls: 'obsius-status-icon' });
      
      // Store reference for real-time updates
      this.providerStatusElements.set(providerId, statusIcon);
      
      this.updateProviderStatusIcon(providerId, config, statusIcon);
    }
  }

  /**
   * Update provider status icon
   */
  private updateProviderStatusIcon(providerId: string, config: any, statusIcon: HTMLElement): void {
    if (config.authenticated) {
      statusIcon.textContent = '✅';
      statusIcon.title = `Connected (${config.lastVerified ? new Date(config.lastVerified).toLocaleString() : 'Unknown'})`;
    } else if (config.hasApiKey) {
      statusIcon.textContent = '⚠️';
      statusIcon.title = 'API key stored but not verified';
    } else {
      statusIcon.textContent = '❌';
      statusIcon.title = 'No API key configured';
    }
  }

  /**
   * Create individual provider settings
   */
  private createIndividualProviderSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h4', { text: 'API Key Configuration' });

    for (const [providerId, config] of Object.entries(this.plugin.settings.providers)) {
      const provider = this.plugin.providerManager.getProvider(providerId);
      if (!provider) continue;

      const providerContainer = containerEl.createDiv('obsius-provider-config');
      
      // Create API key input
      const apiKeyInput = new ApiKeyInput(providerContainer, {
        provider,
        placeholder: this.getPlaceholderForProvider(providerId),
        description: this.getDescriptionForProvider(providerId),
        initialValue: config.hasApiKey ? 'stored-api-key' : '', // Placeholder for stored key
        initialAuthenticated: config.authenticated,
        initialLastVerified: config.lastVerified,
        onKeyChange: async (apiKey: string) => {
          if (apiKey) {
            const result = await this.plugin.providerManager.setProviderApiKey(providerId, apiKey);
            if (result.success) {
              // Update settings with new configuration
              const updatedConfig = this.plugin.providerManager.getProviderConfig(providerId);
              if (updatedConfig) {
                this.plugin.settings.providers[providerId] = updatedConfig;
                await this.plugin.saveSettings();
              }
            }
          } else {
            await this.plugin.providerManager.removeProviderApiKey(providerId);
            const updatedConfig = this.plugin.providerManager.getProviderConfig(providerId);
            if (updatedConfig) {
              this.plugin.settings.providers[providerId] = updatedConfig;
              await this.plugin.saveSettings();
            }
          }
        },
        onAuthResult: async (result) => {
          console.log(`Auth result for ${providerId}:`, result);
          
          if (result.success) {
            // Directly update authentication state in settings
            this.plugin.settings.providers[providerId].authenticated = true;
            this.plugin.settings.providers[providerId].lastVerified = new Date().toISOString();
            this.plugin.settings.providers[providerId].models = result.models || [];
            
            // Save settings immediately to ensure persistence
            await this.plugin.saveSettings();
            console.log(`✅ Authentication state saved for ${providerId}`);
            
            // Also sync with ProviderManager for consistency
            const updatedConfig = this.plugin.providerManager.getProviderConfig(providerId);
            if (updatedConfig) {
              // Update status icon in real-time
              const statusIcon = this.providerStatusElements.get(providerId);
              if (statusIcon) {
                this.updateProviderStatusIcon(providerId, this.plugin.settings.providers[providerId], statusIcon);
              }
              
              // Show model selection immediately
              this.showModelSelection(providerId, providerContainer, this.plugin.settings.providers[providerId]);
            }
          } else {
            // Handle authentication failure
            this.plugin.settings.providers[providerId].authenticated = false;
            this.plugin.settings.providers[providerId].lastVerified = undefined;
            await this.plugin.saveSettings();
            console.log(`❌ Authentication failed for ${providerId}: ${result.error}`);
          }
        },
        showTestButton: true,
        autoValidate: true
      });

      this.apiKeyInputs.set(providerId, apiKeyInput);

      // Add model selection if authenticated
      this.showModelSelection(providerId, providerContainer, config);
    }
  }

  /**
   * Show model selection for authenticated provider
   */
  private showModelSelection(providerId: string, container: HTMLElement, config: any): void {
    // Remove existing authenticated controls if any
    const existingControls = container.querySelector('.obsius-authenticated-controls');
    if (existingControls) {
      existingControls.remove();
    }

    // Add authenticated controls if authenticated and models are available
    if (config.authenticated && config.models && config.models.length > 0) {
      const controlsContainer = container.createDiv('obsius-authenticated-controls');
      
      // Model selection
      new Setting(controlsContainer)
        .setName('Model')
        .setDesc('Select the model to use for this provider')
        .addDropdown(dropdown => {
          if (config.models) {
            for (const model of config.models) {
              dropdown.addOption(model, model);
            }
          }
          dropdown.setValue(config.model);
          dropdown.onChange(async (value) => {
            config.model = value;
            this.plugin.settings.providers[providerId] = config;
            await this.plugin.saveSettings();
          });
        });

      // Disconnect button
      new Setting(controlsContainer)
        .setName('Connection')
        .setDesc('Disconnect and remove API key from secure storage')
        .addButton(button => {
          button
            .setButtonText('Disconnect')
            .setClass('obsius-disconnect-button')
            .onClick(async () => {
              await this.disconnectProvider(providerId, container);
            });
        });
    }
  }

  /**
   * Disconnect provider and update UI
   */
  private async disconnectProvider(providerId: string, container: HTMLElement): Promise<void> {
    try {
      // Remove API key from secure storage
      await this.plugin.providerManager.removeProviderApiKey(providerId);
      
      // Update settings
      const updatedConfig = this.plugin.providerManager.getProviderConfig(providerId);
      if (updatedConfig) {
        this.plugin.settings.providers[providerId] = updatedConfig;
        await this.plugin.saveSettings();
      }

      // Update status icon immediately
      const statusIcon = this.providerStatusElements.get(providerId);
      if (statusIcon) {
        this.updateProviderStatusIcon(providerId, updatedConfig, statusIcon);
      }

      // Remove authenticated controls (model selection and disconnect button)
      const authenticatedControls = container.querySelector('.obsius-authenticated-controls');
      if (authenticatedControls) {
        authenticatedControls.remove();
      }

      // Clear API key input
      const apiKeyInput = this.apiKeyInputs.get(providerId);
      if (apiKeyInput) {
        apiKeyInput.setApiKey('');
      }

      // Show success message
      new Notice(`${this.plugin.settings.providers[providerId]?.name || providerId} disconnected successfully`);

    } catch (error) {
      console.error(`Failed to disconnect ${providerId}:`, error);
      new Notice(`Failed to disconnect ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create tool settings section
   */
  private createToolSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Tool Settings' });

    const toolStats = this.plugin.toolRegistry?.getStats();
    if (toolStats) {
      containerEl.createEl('p', {
        text: `${toolStats.enabled} tools enabled, ${toolStats.disabled} disabled`
      });
    }

    // Could add individual tool enable/disable controls here
  }

  /**
   * Create UI settings section
   */
  private createUISettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Interface Settings' });

    new Setting(containerEl)
      .setName('Show Timestamps')
      .setDesc('Show timestamps in chat messages')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.ui.showTimestamps);
        toggle.onChange(async (value) => {
          this.plugin.settings.ui.showTimestamps = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Auto Scroll')
      .setDesc('Automatically scroll to latest messages')
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.ui.autoScroll);
        toggle.onChange(async (value) => {
          this.plugin.settings.ui.autoScroll = value;
          await this.plugin.saveSettings();
        });
      });
  }

  /**
   * Get placeholder text for provider
   */
  private getPlaceholderForProvider(providerId: string): string {
    switch (providerId) {
      case 'openai':
        return 'sk-...';
      case 'anthropic':
        return 'sk-ant-...';
      case 'google':
        return 'AI...';
      default:
        return 'Enter API key...';
    }
  }

  /**
   * Get description for provider
   */
  private getDescriptionForProvider(providerId: string): string {
    switch (providerId) {
      case 'openai':
        return 'Get your API key from https://platform.openai.com/api-keys';
      case 'anthropic':
        return 'Get your API key from https://console.anthropic.com/';
      case 'google':
        return 'Get your API key from https://ai.google.dev/';
      default:
        return 'Enter your API key for this provider';
    }
  }

  /**
   * Cleanup when settings tab is closed
   */
  hide(): void {
    // Cleanup API key inputs
    for (const input of this.apiKeyInputs.values()) {
      input.destroy();
    }
    this.apiKeyInputs.clear();
    this.providerStatusElements.clear();
  }
}
