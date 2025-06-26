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
import { ExecutionContext, ObsiusSettings } from './src/utils/types';

/**
 * Default plugin settings
 */
const DEFAULT_SETTINGS: ObsiusSettings = {
  providers: {
    openai: {
      name: 'OpenAI',
      model: 'gpt-4',
      enabled: true
    },
    claude: {
      name: 'Anthropic Claude',
      model: 'claude-3-sonnet',
      enabled: false
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

  async onload() {
    console.log('Loading Obsius AI Agent plugin...');

    // Load settings
    await this.loadSettings();

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
   * Load plugin settings
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
 * Settings tab for Obsius plugin
 */
class ObsiusSettingTab extends PluginSettingTab {
  plugin: ObsiusPlugin;

  constructor(app: App, plugin: ObsiusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Obsius AI Agent Settings' });

    // AI Provider Settings
    containerEl.createEl('h3', { text: 'AI Provider Settings' });

    new Setting(containerEl)
      .setName('Default Provider')
      .setDesc('Select the default AI provider')
      .addDropdown(dropdown => {
        dropdown.addOption('openai', 'OpenAI');
        dropdown.addOption('claude', 'Anthropic Claude');
        dropdown.setValue(this.plugin.settings.defaultProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultProvider = value;
          await this.plugin.saveSettings();
        });
      });

    // OpenAI Settings
    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Enter your OpenAI API key')
      .addText(text => {
        text.setPlaceholder('sk-...');
        text.setValue(this.plugin.settings.providers.openai?.apiKey || '');
        text.onChange(async (value) => {
          if (!this.plugin.settings.providers.openai) {
            this.plugin.settings.providers.openai = {
              name: 'OpenAI',
              model: 'gpt-4',
              enabled: true
            };
          }
          this.plugin.settings.providers.openai.apiKey = value;
          await this.plugin.saveSettings();
        });
      });

    // Tool Settings
    containerEl.createEl('h3', { text: 'Tool Settings' });

    const toolStats = this.plugin.toolRegistry?.getStats();
    if (toolStats) {
      containerEl.createEl('p', {
        text: `${toolStats.enabled} tools enabled, ${toolStats.disabled} disabled`
      });
    }

    // UI Settings
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
}
