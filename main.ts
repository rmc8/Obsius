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
  UpdateNoteTool,
  GlobTool,
  ListDirectoryTool,
  GrepTool
} from './src/tools';
import { ExecutionContext, ObsiusSettings, SecureProviderConfig } from './src/utils/types';
import { ProviderManager } from './src/core/providers/ProviderManager';
import { ApiKeyInput } from './src/ui/components/ApiKeyInput';
import { ChatView, VIEW_TYPE_OBSIUS_CHAT } from './src/ui/views/ChatView';
import { initializeI18n, t } from './src/utils/i18n';

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
    enabled: ['create_note', 'read_note', 'search_notes', 'update_note', 'glob', 'list_directory', 'grep'],
    confirmationRequired: ['update_note'],
    riskLevels: {
      low: ['create_note', 'read_note', 'search_notes', 'glob', 'list_directory', 'grep'],
      medium: ['update_note'],
      high: []
    }
  },
  ui: {
    interfaceLanguage: 'en',
    chatLanguage: 'auto',
    showTimestamps: true,
    enableStreaming: false,
    autoScroll: true
  },
  sessions: {
    maxHistorySize: 100,
    autoSave: true,
    persistAcrossReloads: true
  },
  workflow: {
    maxIterations: 24,
    enableReACT: true,
    enableStateGraph: true,
    iterationTimeout: 30
  }
};

/**
 * Main Obsius Plugin Class
 */
export default class ObsiusPlugin extends Plugin {
  settings: ObsiusSettings;
  toolRegistry: ToolRegistry;
  providerManager: ProviderManager;
  chatView: ChatView | null = null;

  async onload() {
    console.log('Loading Obsius AI Agent plugin...');

    // Load settings first
    await this.loadSettings();

    // Initialize i18n system with separated languages
    initializeI18n(this.settings.ui.interfaceLanguage, this.settings.ui.chatLanguage);

    // Wait for Obsidian to fully stabilize before initializing secure components
    await this.waitForObsidianStability();

    // Initialize provider manager with enhanced timing
    await this.initializeProviderManagerWithDelay();

    // Initialize tool registry
    this.initializeToolRegistry();

    // Register ChatView
    this.registerChatView();

    // Register commands
    this.registerCommands();

    // Add ribbon icon for chat
    this.addRibbonIcon('bot', 'Open Obsius Chat', () => {
      this.activateChatView();
    });

    // Add status bar
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText('Obsius Ready');

    // Add settings tab
    this.addSettingTab(new ObsiusSettingTab(this.app, this));

    console.log('Obsius AI Agent plugin loaded successfully!');
  }

  /**
   * Wait for Obsidian to fully stabilize before initializing secure components
   */
  private async waitForObsidianStability(): Promise<void> {
    const startTime = Date.now();
    console.log(`⏳ Waiting for Obsidian stability...`);

    try {
      // Simplified stability check - max 3 attempts
      const maxChecks = 3;
      
      for (let i = 0; i < maxChecks; i++) {
        const workspaceReady = this.app.workspace && this.app.workspace.layoutReady;
        const vaultReady = !!this.app.vault;
        
        // Quick data access test
        let dataReady = false;
        try {
          await this.loadData();
          dataReady = true;
        } catch (error) {
          console.log(`📊 Data access not ready on attempt ${i + 1}`);
        }
        
        if (workspaceReady && vaultReady && dataReady) {
          console.log(`✅ Obsidian ready after ${i + 1} checks`);
          break;
        }
        
        if (i < maxChecks - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const stabilityTime = Date.now() - startTime;
      console.log(`🏁 Stability check completed in ${stabilityTime}ms`);
      
    } catch (error) {
      console.error(`❌ Stability check error:`, error);
      // Continue anyway
    }
  }

  /**
   * Initialize provider manager with simplified retry
   */
  private async initializeProviderManagerWithDelay(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 Initializing provider manager...`);

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.initializeProviderManager();
        console.log(`✅ Provider manager initialized on attempt ${attempt}`);
        break;
      } catch (error) {
        console.error(`❌ Initialization attempt ${attempt} failed:`, error);
        
        if (attempt < maxAttempts) {
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.error(`❌ Provider manager initialization failed`);
          // Continue in degraded mode
        }
      }
    }

    const initTime = Date.now() - startTime;
    console.log(`🏁 Provider manager initialization completed in ${initTime}ms`);
  }

  async onunload() {
    console.log('Unloading Obsius AI Agent plugin...');
    
    try {
      // Force save settings before unload to prevent data loss
      console.log('💾 Force saving settings before unload...');
      await this.saveSettings();
      console.log('✅ Settings saved successfully');
      
      // Additional wait to ensure filesystem sync
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('✅ Filesystem sync wait completed');
      
    } catch (error) {
      console.error('❌ Failed to save settings during unload:', error);
    }
    
    // Cleanup provider manager
    if (this.providerManager) {
      this.providerManager.destroy();
    }
    
    // Cleanup chat view
    this.chatView = null;
    
    console.log('✅ Obsius AI Agent plugin unloaded');
  }

  /**
   * Initialize provider manager with enhanced secure API key handling and state synchronization
   */
  private async initializeProviderManager(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔑 [${startTime}] Starting enhanced ProviderManager initialization...`);
    
    try {
      // Step 1: Create ProviderManager instance
      this.providerManager = new ProviderManager(this);
      console.log('✅ ProviderManager instance created');
      
      // Step 2: Log initial state for debugging
      console.log('🔍 Initial provider auth states:', 
        Object.entries(this.settings.providers).map(([id, config]) => 
          `${id}: ${config.authenticated ? 'authenticated' : 'not authenticated'}${config.hasApiKey ? ' (hasKey)' : ''}${config.keyPrefix ? ` [${config.keyPrefix}]` : ''}`
        ).join(', ')
      );
      
      // Step 3: Initialize with existing configurations
      console.log('🚀 Initializing ProviderManager with existing configurations...');
      await this.providerManager.initialize(this.settings.providers);
      console.log('✅ ProviderManager initialization completed');

      // Step 4: Handle legacy API key migration
      await this.handleLegacyApiKeyMigration();
      
      // Step 5: Synchronize provider configurations
      await this.synchronizeProviderConfigurations();
      
      // Step 6: Restore API keys to provider instances after initialization
      console.log('🔄 Ensuring API keys are set in provider instances...');
      await this.providerManager.restoreApiKeysToProviders();
      
      // Step 7: Validate final state
      await this.validateProviderManagerState();
      
      const initTime = Date.now() - startTime;
      console.log(`✅ ProviderManager initialization completed successfully in ${initTime}ms`);
      
    } catch (error) {
      const initTime = Date.now() - startTime;
      console.error(`❌ ProviderManager initialization failed after ${initTime}ms:`, error);
      
      // Emergency fallback: ensure we have a working provider manager
      if (!this.providerManager) {
        console.log('🚑 Creating fallback ProviderManager...');
        this.providerManager = new ProviderManager(this);
        await this.providerManager.initialize({});
        console.log('✅ Fallback ProviderManager created');
      }
      
      throw error;
    }
  }
  
  /**
   * Handle migration of legacy plaintext API keys
   */
  private async handleLegacyApiKeyMigration(): Promise<void> {
    console.log('🔄 Checking for legacy API key migration...');
    
    try {
      const oldData = await this.loadData();
      console.log('🔍 Migration check:', {
        hasData: !!oldData,
        keys: oldData ? Object.keys(oldData) : [],
        hasProviders: !!oldData?.providers
      });
      
      if (!oldData?.providers) {
        console.log('✅ No legacy provider data found');
        return;
      }
      
      console.log('📋 Legacy provider data found:', Object.keys(oldData.providers));
      
      // Check for plaintext API keys
      const providersWithKeys = Object.entries(oldData.providers).filter(
        ([_, provider]: [string, any]) => provider.apiKey && typeof provider.apiKey === 'string'
      );
      
      if (providersWithKeys.length === 0) {
        console.log('✅ No plaintext API keys found to migrate');
        return;
      }
      
      console.log(`🔄 Migrating ${providersWithKeys.length} plaintext API keys to secure storage...`);
      
      // Perform migration with error handling
      let migrationSuccess = true;
      try {
        await this.providerManager.migrateFromPlaintext(oldData.providers);
        console.log('✅ Migration to secure storage completed');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        migrationSuccess = false;
      }
      
      // Clean up plaintext keys only if migration succeeded
      if (migrationSuccess) {
        let cleanupCount = 0;
        for (const provider of Object.values(oldData.providers) as any[]) {
          if (provider.apiKey) {
            delete provider.apiKey;
            cleanupCount++;
          }
        }
        
        if (cleanupCount > 0) {
          await this.saveData(oldData);
          console.log(`🗑️ Cleaned up ${cleanupCount} plaintext API keys from settings`);
        }
      }
      
    } catch (error) {
      console.error('❌ Legacy migration check failed:', error);
      // Continue initialization despite migration failure
    }
  }
  
  /**
   * Synchronize provider configurations between ProviderManager and plugin settings
   */
  private async synchronizeProviderConfigurations(): Promise<void> {
    console.log('🔄 Synchronizing provider configurations...');
    
    try {
      const providerConfigs = this.providerManager.getAllProviderConfigs();
      let syncCount = 0;
      let updateCount = 0;
      
      // Sync from ProviderManager to settings
      for (const [providerId, managerConfig] of Object.entries(providerConfigs)) {
        const existingConfig = this.settings.providers[providerId];
        
        if (!existingConfig) {
          // New provider not in settings
          this.settings.providers[providerId] = managerConfig;
          syncCount++;
          console.log(`🆕 Added new provider to settings: ${providerId}`);
        } else {
          // Update existing provider with current state from manager
          let hasChanges = false;
          
          // Sync critical fields that might have changed during initialization
          if (existingConfig.hasApiKey !== managerConfig.hasApiKey) {
            existingConfig.hasApiKey = managerConfig.hasApiKey;
            hasChanges = true;
          }
          
          if (existingConfig.authenticated !== managerConfig.authenticated) {
            existingConfig.authenticated = managerConfig.authenticated;
            hasChanges = true;
          }
          
          if (existingConfig.keyPrefix !== managerConfig.keyPrefix) {
            existingConfig.keyPrefix = managerConfig.keyPrefix;
            hasChanges = true;
          }
          
          if (existingConfig.lastVerified !== managerConfig.lastVerified) {
            existingConfig.lastVerified = managerConfig.lastVerified;
            hasChanges = true;
          }
          
          if (hasChanges) {
            updateCount++;
            console.log(`🔄 Updated ${providerId} configuration in settings`);
          }
        }
      }
      
      // Save settings if changes were made
      if (syncCount > 0 || updateCount > 0) {
        console.log(`💾 Saving settings with ${syncCount} new providers and ${updateCount} updates`);
        await this.saveSettings();
        console.log('✅ Provider configuration synchronization saved');
      } else {
        console.log('✅ Provider configurations already in sync');
      }
      
    } catch (error) {
      console.error('❌ Provider configuration synchronization failed:', error);
      // Try to save settings anyway to preserve any partial updates
      try {
        await this.saveSettings();
        console.log('✅ Settings saved despite synchronization error');
      } catch (saveError) {
        console.error('❌ Failed to save settings:', saveError);
      }
    }
  }
  
  /**
   * Validate the final state of ProviderManager
   */
  private async validateProviderManagerState(): Promise<void> {
    console.log('🔍 Validating final ProviderManager state...');
    
    try {
      // Get statistics
      const stats = this.providerManager.getStats();
      console.log('📊 Provider statistics:', stats);
      
      // Validate each provider
      let validProviders = 0;
      let readyProviders = 0;
      
      console.log('🔍 Detailed provider validation:');
      for (const [providerId, config] of Object.entries(this.settings.providers)) {
        const provider = this.providerManager.getProvider(providerId);
        const hasApiKey = provider ? !!(provider as any).apiKey : false;
        const isReady = hasApiKey && config.authenticated;
        
        console.log(`  ${providerId}: ` +
          `provider=${!!provider}, ` +
          `hasApiKey=${hasApiKey}, ` +
          `authenticated=${config.authenticated}, ` +
          `enabled=${config.enabled}, ` +
          `ready=${isReady}`);
        
        if (provider) validProviders++;
        if (isReady) readyProviders++;
      }
      
      console.log(`✅ Validation complete: ${validProviders} valid providers, ${readyProviders} ready for use`);
      
      // Final state summary
      console.log('🏁 Final provider auth states after initialization:', 
        Object.entries(this.settings.providers).map(([id, config]) => {
          const provider = this.providerManager.getProvider(id);
          const hasApiKey = provider ? !!(provider as any).apiKey : false;
          const status = hasApiKey && config.authenticated ? '🟢 READY' : 
                        config.authenticated ? '🟡 AUTH' :
                        config.hasApiKey ? '🟠 KEY' : '⚪ NONE';
          return `${id}: ${status}`;
        }).join(', ')
      );
      
    } catch (error) {
      console.error('❌ Provider state validation failed:', error);
      // Don't throw, as this is just validation
    }
  }

  /**
   * Get provider manager for external access
   */
  public getProviderManager(): ProviderManager | null {
    return this.providerManager;
  }

  /**
   * Save provider settings (called by ProviderManager)
   */
  public async saveProviderSettings(): Promise<void> {
    try {
      // Update settings from provider configurations
      if (this.providerManager) {
        for (const [providerId, registration] of (this.providerManager as any).providers) {
          if (this.settings.providers[providerId]) {
            this.settings.providers[providerId] = { ...registration.config };
          }
        }
      }
      
      await this.saveSettings();
      console.log('💾 Provider settings saved successfully');
    } catch (error) {
      console.error('❌ Failed to save provider settings:', error);
    }
  }

  /**
   * Register ChatView for side panel display
   */
  private registerChatView(): void {
    this.registerView(
      VIEW_TYPE_OBSIUS_CHAT,
      (leaf) => {
        this.chatView = new ChatView(leaf, this);
        return this.chatView;
      }
    );
  }

  /**
   * Activate chat view in right sidebar
   */
  async activateChatView(): Promise<void> {
    const { workspace } = this.app;
    
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_OBSIUS_CHAT)[0];
    
    if (!leaf) {
      // Create new leaf in right sidebar
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({
          type: VIEW_TYPE_OBSIUS_CHAT,
          active: true
        });
      }
    }
    
    // Reveal and focus the view
    if (leaf) {
      workspace.revealLeaf(leaf);
      
      // Update chat view with current provider states
      if (this.chatView) {
        this.chatView.refreshProviders();
      }
    }
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

    this.toolRegistry.registerTool('glob', GlobTool, {
      description: 'Find files matching glob patterns (e.g., **/*.md, src/**/*.ts)',
      riskLevel: 'low',
      category: 'file_system',
      enabled: this.settings.tools.enabled.includes('glob')
    });

    this.toolRegistry.registerTool('list_directory', ListDirectoryTool, {
      description: 'List files and directories in a specified path',
      riskLevel: 'low', 
      category: 'file_system',
      enabled: this.settings.tools.enabled.includes('list_directory')
    });

    this.toolRegistry.registerTool('grep', GrepTool, {
      description: 'Search for regular expression patterns within file contents',
      riskLevel: 'low',
      category: 'content_search',
      enabled: this.settings.tools.enabled.includes('grep')
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
    // Open chat view command
    this.addCommand({
      id: 'open-chat',
      name: 'Open AI Chat',
      callback: () => {
        this.activateChatView();
      }
    });

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

    // Performance test command
    this.addCommand({
      id: 'test-performance',
      name: 'Test: Performance Benchmarks',
      callback: async () => {
        new Notice('⏱️ Starting performance tests...');
        
        // Test 1: Plugin reload time
        console.log('📊 Starting performance benchmarks...');
        
        // Test 2: API key save/load cycle
        const testProvider = 'openai';
        const testKey = 'test-' + Math.random().toString(36).substring(7);
        
        // Measure save time
        const saveStart = performance.now();
        await this.providerManager.setProviderApiKey(testProvider, testKey);
        const saveTime = performance.now() - saveStart;
        
        // Measure load time (check provider config)
        const loadStart = performance.now();
        const providerConfig = this.providerManager.getProviderConfig(testProvider);
        const hasKey = providerConfig ? providerConfig.hasApiKey : false;
        const loadTime = performance.now() - loadStart;
        
        // Clean up test key
        await this.providerManager.removeProviderApiKey(testProvider);
        
        const report = `
Performance Test Results:
========================
API Key Save: ${saveTime.toFixed(2)}ms
API Key Load: ${loadTime.toFixed(2)}ms
Total cycle: ${(saveTime + loadTime).toFixed(2)}ms
        `;
        
        console.log(report);
        new Notice(`⏱️ Performance test complete! Check console for details.`);
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
   * Save plugin settings with enhanced reliability
   */
  async saveSettings() {
    const startTime = Date.now();
    console.log(`💾 [${startTime}] Starting settings save...`);
    
    try {
      // Save settings with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      let saveSuccess = false;
      
      while (attempts < maxAttempts && !saveSuccess) {
        try {
          // Load existing data to preserve secure keys
          const existingData = await this.loadData() || {};
          
          // Debug: Check if secureApiKeys exists
          if ('secureApiKeys' in existingData) {
            console.log('📦 Preserving existing secureApiKeys during settings save');
          }
          
          // Merge settings while preserving other data like secureApiKeys
          const dataToSave = {
            ...existingData,  // Preserve existing data
            ...this.settings  // Override with current settings
          };
          
          await this.saveData(dataToSave);
          console.log(`✅ Settings saved successfully on attempt ${attempts + 1}`);
          
          // Verify save immediately
          const verifyData = await this.loadData();
          const isValid = verifyData && 
            typeof verifyData === 'object' && 
            'providers' in verifyData &&
            'defaultProvider' in verifyData;
          
          if (isValid) {
            saveSuccess = true;
            console.log(`✅ Settings save verified successfully`);
          } else {
            throw new Error('Settings verification failed - invalid data structure');
          }
          
        } catch (error) {
          attempts++;
          console.error(`❌ Settings save attempt ${attempts}/${maxAttempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to save settings after ${maxAttempts} attempts: ${error.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        }
      }
      
      // Synchronize provider instances after settings save
      if (this.providerManager) {
        await this.syncProviderInstancesAfterSave();
        
        // Restore API keys to provider instances
        await this.providerManager.restoreApiKeysToProviders();
      }
      
      // Update tool registry with new settings
      if (this.toolRegistry) {
        this.updateToolRegistry();
      }
      
      const saveTime = Date.now() - startTime;
      console.log(`✅ Settings save completed successfully in ${saveTime}ms`);
      
    } catch (error) {
      const saveTime = Date.now() - startTime;
      console.error(`❌ Critical: Settings save failed after ${saveTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Synchronize provider instances after settings save to ensure consistency
   */
  private async syncProviderInstancesAfterSave(): Promise<void> {
    console.log('🔄 Synchronizing provider instances after settings save...');
    
    try {
      // Get current provider configurations from manager
      const managerConfigs = this.providerManager.getAllProviderConfigs();
      
      // Check each provider for sync issues
      for (const [providerId, settingsConfig] of Object.entries(this.settings.providers)) {
        const managerConfig = managerConfigs[providerId];
        const provider = await this.providerManager.getProviderById(providerId);
        
        if (!provider || !managerConfig) {
          console.warn(`⚠️ Provider ${providerId} not found in manager during sync`);
          continue;
        }
        
        // Check for config/instance mismatches
        const configHasKey = settingsConfig.hasApiKey;
        const instanceHasKey = !!(provider as any).apiKey;
        const configAuth = settingsConfig.authenticated;
        const managerAuth = managerConfig.authenticated;
        
        console.log(`🔍 Sync check ${providerId}:`, {
          settingsHasKey: configHasKey,
          instanceHasKey,
          settingsAuth: configAuth,
          managerAuth,
          synced: configHasKey === instanceHasKey && configAuth === managerAuth
        });
        
        // Sync settings config with manager state with authentication protection
        let hasUpdates = false;
        
        // Protect authentication state - only update if manager has stronger state
        const shouldUpdateAuth = managerConfig.authenticated && !settingsConfig.authenticated;
        const shouldUpdateHasKey = managerConfig.hasApiKey && !settingsConfig.hasApiKey;
        
        if (settingsConfig.hasApiKey !== managerConfig.hasApiKey) {
          // Only update hasApiKey if manager has stronger state (true > false)
          if (shouldUpdateHasKey || (!managerConfig.hasApiKey && settingsConfig.hasApiKey)) {
            settingsConfig.hasApiKey = managerConfig.hasApiKey;
            hasUpdates = true;
            console.log(`🔄 Synced hasApiKey for ${providerId}: ${managerConfig.hasApiKey}`);
          } else {
            console.log(`🛡️ Protected hasApiKey state for ${providerId}: keeping ${settingsConfig.hasApiKey}`);
          }
        }
        
        if (settingsConfig.authenticated !== managerConfig.authenticated) {
          // Only update authenticated if manager has stronger state (true > false)
          if (shouldUpdateAuth || (!managerConfig.authenticated && settingsConfig.authenticated)) {
            settingsConfig.authenticated = managerConfig.authenticated;
            hasUpdates = true;
            console.log(`🔄 Synced authenticated for ${providerId}: ${managerConfig.authenticated}`);
          } else {
            console.log(`🛡️ Protected authentication state for ${providerId}: keeping ${settingsConfig.authenticated}`);
          }
        }
        
        if (settingsConfig.keyPrefix !== managerConfig.keyPrefix) {
          // Only update if manager has a value or settings doesn't have one
          if (managerConfig.keyPrefix || !settingsConfig.keyPrefix) {
            settingsConfig.keyPrefix = managerConfig.keyPrefix;
            hasUpdates = true;
            console.log(`🔄 Synced keyPrefix for ${providerId}: ${managerConfig.keyPrefix}`);
          }
        }
        
        if (settingsConfig.lastVerified !== managerConfig.lastVerified) {
          // Only update if manager has a newer timestamp or settings doesn't have one
          const managerTime = managerConfig.lastVerified ? new Date(managerConfig.lastVerified).getTime() : 0;
          const settingsTime = settingsConfig.lastVerified ? new Date(settingsConfig.lastVerified).getTime() : 0;
          
          if (managerTime > settingsTime || !settingsConfig.lastVerified) {
            settingsConfig.lastVerified = managerConfig.lastVerified;
            hasUpdates = true;
            console.log(`🔄 Synced lastVerified for ${providerId}: ${managerConfig.lastVerified}`);
          }
        }
        
        // If instance has no key but config says it does, attempt recovery
        if (configHasKey && !instanceHasKey) {
          console.warn(`⚠️ Provider ${providerId} config claims API key but instance missing - triggering recovery`);
          await this.providerManager.getProviderById(providerId); // This will trigger recovery
        }
        
        if (hasUpdates) {
          console.log(`✅ Updated settings config for ${providerId}`);
        }
      }
      
      console.log('✅ Provider instance synchronization completed');
      
    } catch (error) {
      console.error('❌ Provider instance synchronization failed:', error);
      // Don't throw - this is cleanup, not critical
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

    // Update ChatView language if language setting changed
    if (this.chatView) {
      this.chatView.updateLanguage();
    }
  }
  /**
   * Verify filesystem and data persistence consistency
   */
  private async verifyFilesystemAndDataConsistency(): Promise<void> {
    console.log('🔍 Starting filesystem and data consistency verification...');
    
    try {
      // Step 1: Basic filesystem stability check
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Step 2: Test write-read cycle to verify data persistence
      console.log('📝 Testing data persistence cycle...');
      
      const testKey = '_obsius_consistency_test';
      const testValue = {
        timestamp: Date.now(),
        testId: Math.random().toString(36).substring(7)
      };
      
      // Write test data
      const currentData = await this.loadData() || {};
      currentData[testKey] = testValue;
      await this.saveData(currentData);
      console.log('✅ Test data written successfully');
      
      // Wait for filesystem operations to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Read and verify test data
      const verifyData = await this.loadData();
      const retrievedValue = verifyData?.[testKey];
      
      if (retrievedValue && 
          retrievedValue.timestamp === testValue.timestamp && 
          retrievedValue.testId === testValue.testId) {
        console.log('✅ Data persistence verification successful');
        
        // Clean up test data
        delete verifyData[testKey];
        await this.saveData(verifyData);
        console.log('🗑️ Test data cleaned up');
      } else {
        console.warn('⚠️ Data persistence verification failed - data may not be stable');
      }
      
      // Step 3: Check for plugin data directory stability
      const vaultAdapter = this.app.vault.adapter;
      if (vaultAdapter && typeof (vaultAdapter as any).path === 'string') {
        const pluginDataPath = (vaultAdapter as any).path;
        console.log(`📁 Plugin data path confirmed: ${pluginDataPath}`);
      }
      
      // Step 4: Verify core Obsidian components are stable
      const coreStability = {
        vault: !!this.app.vault,
        workspace: !!this.app.workspace,
        metadataCache: !!this.app.metadataCache,
        fileManager: !!this.app.fileManager
      };
      
      console.log('🔧 Core component stability:', coreStability);
      
      const allStable = Object.values(coreStability).every(stable => stable);
      if (allStable) {
        console.log('✅ All core components are stable');
      } else {
        console.warn('⚠️ Some core components may not be fully stable');
      }
      
    } catch (error) {
      console.error('❌ Filesystem and data consistency verification failed:', error);
      // Don't throw - this is a verification step, not a requirement
    }
    
    console.log('🏁 Filesystem and data consistency verification completed');
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

    containerEl.createEl('h2', { text: t('settings.settingsTitle') });

    // AI Provider Settings
    this.createProviderSettings(containerEl);

    // Tool Settings
    this.createToolSettings(containerEl);

    // UI Settings
    this.createUISettings(containerEl);

    // Workflow Settings
    this.createWorkflowSettings(containerEl);
  }

  /**
   * Refresh settings display to apply language changes
   */
  refreshSettingsDisplay(): void {
    this.display();
  }

  /**
   * Create AI provider settings section
   */
  private createProviderSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.providerSettings') });

    // Default provider selection
    new Setting(containerEl)
      .setName(t('settings.defaultProvider'))
      .setDesc(t('settings.defaultProviderDesc'))
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
    overviewEl.createEl('h4', { text: t('settings.providerStatus') });

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
      const lastVerified = config.lastVerified ? new Date(config.lastVerified).toLocaleString() : t('settings.unknown');
      statusIcon.title = `${t('settings.connected')} (${lastVerified})`;
    } else if (config.hasApiKey) {
      statusIcon.textContent = '⚠️';
      statusIcon.title = t('settings.apiKeyStored');
    } else {
      statusIcon.textContent = '❌';
      statusIcon.title = t('settings.noApiKey');
    }
  }

  /**
   * Create individual provider settings
   */
  private createIndividualProviderSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h4', { text: t('settings.apiKeyConfiguration') });

    for (const [providerId, config] of Object.entries(this.plugin.settings.providers)) {
      const provider = this.plugin.providerManager.getProvider(providerId);
      if (!provider) continue;

      const providerContainer = containerEl.createDiv('obsius-provider-config');
      
      // Create API key input
      const apiKeyInput = new ApiKeyInput(providerContainer, {
        provider,
        placeholder: this.getPlaceholderForProvider(providerId),
        description: this.getDescriptionForProvider(providerId),
        initialValue: config.hasApiKey && config.keyPrefix ? config.keyPrefix : '', // Show masked API key prefix
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
        .setName(t('settings.model'))
        .setDesc(t('settings.modelDesc'))
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
        .setName(t('settings.connection'))
        .setDesc(t('settings.connectionDesc'))
        .addButton(button => {
          button
            .setButtonText(t('settings.disconnect'))
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
      new Notice(`${t('settings.disconnectFailed', { provider: providerId })}: ${error instanceof Error ? error.message : t('settings.unknownError')}`);
    }
  }

  /**
   * Create tool settings section
   */
  private createToolSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.toolSettings') });

    const toolStats = this.plugin.toolRegistry?.getStats();
    if (toolStats) {
      containerEl.createEl('p', {
        text: t('settings.toolsStatus', { 
          enabled: toolStats.enabled.toString(), 
          disabled: toolStats.disabled.toString() 
        })
      });
    }

    // Could add individual tool enable/disable controls here
  }

  /**
   * Create UI settings section
   */
  private createUISettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.interfaceSettings') });

    new Setting(containerEl)
      .setName(t('settings.interfaceLanguage'))
      .setDesc(t('settings.interfaceLanguageDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('en', t('settings.english'));
        dropdown.addOption('ja', t('settings.japanese'));
        dropdown.setValue(this.plugin.settings.ui.interfaceLanguage);
        dropdown.onChange(async (value: 'en' | 'ja') => {
          this.plugin.settings.ui.interfaceLanguage = value;
          await this.plugin.saveSettings();
          
          // Update i18n and refresh UI
          const { initializeI18n } = await import('./src/utils/i18n');
          initializeI18n(this.plugin.settings.ui.interfaceLanguage, this.plugin.settings.ui.chatLanguage);
          
          // Update chat view if open
          if (this.plugin.chatView) {
            this.plugin.chatView.updateLanguage();
          }
          
          // Refresh settings page
          this.refreshSettingsDisplay();
        });
      });

    new Setting(containerEl)
      .setName(t('settings.chatLanguage'))
      .setDesc(t('settings.chatLanguageDesc'))
      .addDropdown(dropdown => {
        dropdown.addOption('auto', t('settings.autoDetect'));
        dropdown.addOption('en', t('settings.english'));
        dropdown.addOption('ja', t('settings.japanese'));
        dropdown.setValue(this.plugin.settings.ui.chatLanguage);
        dropdown.onChange(async (value: 'auto' | 'en' | 'ja') => {
          this.plugin.settings.ui.chatLanguage = value;
          await this.plugin.saveSettings();
          
          // Update chat language setting
          const { setChatLanguage } = await import('./src/utils/i18n');
          setChatLanguage(value);
        });
      });

    new Setting(containerEl)
      .setName(t('settings.showTimestamps'))
      .setDesc(t('settings.showTimestampsDesc'))
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.ui.showTimestamps);
        toggle.onChange(async (value) => {
          this.plugin.settings.ui.showTimestamps = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t('settings.autoScroll'))
      .setDesc(t('settings.autoScrollDesc'))
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
        return t('settings.enterApiKey');
    }
  }

  /**
   * Create workflow settings section
   */
  private createWorkflowSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: t('settings.workflowSettings') });

    // Max iterations setting with slider
    new Setting(containerEl)
      .setName(t('settings.maxIterations'))
      .setDesc(t('settings.maxIterationsDesc'))
      .addSlider(slider => {
        slider
          .setLimits(1, 100, 1)
          .setValue(this.plugin.settings.workflow.maxIterations)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.workflow.maxIterations = value;
            await this.plugin.saveSettings();
          });
      })
      .addExtraButton(button => {
        button
          .setIcon('reset')
          .setTooltip(t('settings.resetToDefault'))
          .onClick(async () => {
            this.plugin.settings.workflow.maxIterations = 24;
            await this.plugin.saveSettings();
            this.display(); // Refresh the settings display
          });
      });

    // Enable ReACT toggle
    new Setting(containerEl)
      .setName(t('settings.enableReACT'))
      .setDesc(t('settings.enableReACTDesc'))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.workflow.enableReACT)
          .onChange(async (value) => {
            this.plugin.settings.workflow.enableReACT = value;
            await this.plugin.saveSettings();
          });
      });

    // Enable StateGraph toggle
    new Setting(containerEl)
      .setName(t('settings.enableStateGraphWorkflow'))
      .setDesc(t('settings.enableStateGraphWorkflowDesc'))
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.workflow.enableStateGraph)
          .onChange(async (value) => {
            this.plugin.settings.workflow.enableStateGraph = value;
            await this.plugin.saveSettings();
          });
      });

    // Iteration timeout setting
    new Setting(containerEl)
      .setName(t('settings.iterationTimeout'))
      .setDesc(t('settings.iterationTimeoutDesc'))
      .addSlider(slider => {
        slider
          .setLimits(10, 300, 5)
          .setValue(this.plugin.settings.workflow.iterationTimeout)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.workflow.iterationTimeout = value;
            await this.plugin.saveSettings();
          });
      });

    // Add help text
    const helpDiv = containerEl.createDiv('obsius-workflow-help');
    helpDiv.createEl('p', { 
      text: t('settings.workflowTip'),
      cls: 'setting-item-description'
    });
  }

  /**
   * Get description for provider
   */
  private getDescriptionForProvider(providerId: string): string {
    switch (providerId) {
      case 'openai':
        return t('settings.openaiApiKeyDesc');
      case 'anthropic':
        return t('settings.anthropicApiKeyDesc');
      case 'google':
        return t('settings.googleApiKeyDesc');
      default:
        return t('settings.defaultApiKeyDesc');
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
