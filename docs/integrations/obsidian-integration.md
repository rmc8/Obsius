# Obsidian Integration Requirements

This document outlines the specific requirements and considerations for integrating AI agent functionality into Obsidian through the Obsius plugin.

## Obsidian Plugin API Overview

### Core Plugin Structure

```typescript
import { Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class ObsiusPlugin extends Plugin {
  settings: ObsiusSettings;

  async onload() {
    // Plugin initialization
    await this.loadSettings();
    
    // Register commands
    this.addCommand({
      id: 'open-obsius-chat',
      name: 'Open Obsius AI Chat',
      callback: () => this.openChatInterface()
    });
    
    // Register UI elements
    this.registerView(OBSIUS_VIEW_TYPE, (leaf) => new ObsiusView(leaf, this));
    
    // Add settings tab
    this.addSettingTab(new ObsiusSettingTab(this.app, this));
  }

  async onunload() {
    // Cleanup
  }
}
```

## UI Integration Strategies

### 1. Custom View (Recommended)

Create a dedicated view for the AI chat interface:

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';

export class ObsiusView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: ObsiusPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return OBSIUS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Obsius AI';
  }

  async onOpen() {
    // Render React component
    const container = this.containerEl.children[1];
    ReactDOM.render(<ObsiusApp plugin={this.plugin} />, container);
  }

  async onClose() {
    // Cleanup
  }
}
```

**Benefits**:
- Persistent interface
- Integrates with Obsidian's workspace
- Can be docked/undocked
- Saved in workspace layout

### 2. Modal Interface

For focused AI interactions:

```typescript
import { Modal } from 'obsidian';

export class ObsiusModal extends Modal {
  constructor(app: App, private plugin: ObsiusPlugin) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Render AI chat interface
    ReactDOM.render(<ObsiusChat plugin={this.plugin} />, contentEl);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

### 3. Sidebar Integration

Add AI functionality to existing sidebars:

```typescript
// Add to right sidebar
this.addRibbonIcon('bot', 'Obsius AI', () => {
  this.activateView();
});

// Register leaf
this.registerView(OBSIUS_VIEW_TYPE, (leaf) => new ObsiusView(leaf, this));
```

## Obsidian-Specific Tools

### Vault Operations

```typescript
export class ObsidianVaultTool extends Tool {
  constructor(private app: App) {
    super('obsidian_vault', 'Vault Operations', 'Manage Obsidian vault');
  }

  async listNotes(): Promise<string[]> {
    return this.app.vault.getMarkdownFiles().map(file => file.path);
  }

  async readNote(path: string): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }
    throw new Error(`Note not found: ${path}`);
  }

  async createNote(path: string, content: string): Promise<void> {
    await this.app.vault.create(path, content);
  }

  async updateNote(path: string, content: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.vault.modify(file, content);
    }
  }
}
```

### Workspace Operations

```typescript
export class ObsidianWorkspaceTool extends Tool {
  constructor(private app: App) {
    super('obsidian_workspace', 'Workspace Operations', 'Manage workspace');
  }

  async openNote(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await this.app.workspace.openLinkText(file.path, '');
    }
  }

  async getCurrentNote(): Promise<string | null> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    return activeView?.file?.path || null;
  }

  async createSplit(direction: 'horizontal' | 'vertical'): Promise<void> {
    const leaf = this.app.workspace.getActiveLeaf();
    if (leaf) {
      await this.app.workspace.splitLeaf(leaf, direction);
    }
  }
}
```

### Search and Navigation

```typescript
export class ObsidianSearchTool extends Tool {
  constructor(private app: App) {
    super('obsidian_search', 'Search', 'Search vault content');
  }

  async searchNotes(query: string): Promise<SearchResult[]> {
    const searchPlugin = this.app.internalPlugins.plugins.search;
    if (searchPlugin.enabled) {
      const results = searchPlugin.instance.searchIndex.search(query);
      return results.map(result => ({
        file: result.file.path,
        matches: result.matches,
        score: result.score
      }));
    }
    return [];
  }

  async findBacklinks(notePath: string): Promise<string[]> {
    const file = this.app.vault.getAbstractFileByPath(notePath);
    if (file instanceof TFile) {
      const backlinks = this.app.metadataCache.getBacklinksForFile(file);
      return Object.keys(backlinks.data);
    }
    return [];
  }
}
```

## Settings Integration

### Plugin Settings

```typescript
interface ObsiusSettings {
  // AI Providers
  providers: {
    claude: {
      enabled: boolean;
      apiKey: string;
      model: string;
    };
    gemini: {
      enabled: boolean;
      apiKey: string;
      model: string;
    };
  };
  
  // Default provider
  defaultProvider: 'claude' | 'gemini';
  
  // UI preferences
  ui: {
    theme: 'dark' | 'light' | 'auto';
    fontSize: number;
    showToolDetails: boolean;
  };
  
  // Tool configuration
  tools: {
    autoConfirm: string[];
    disabled: string[];
  };
  
  // Session management
  sessions: {
    persistHistory: boolean;
    maxHistorySize: number;
    autoSave: boolean;
  };
}
```

### Settings Tab

```typescript
export class ObsiusSettingTab extends PluginSettingTab {
  plugin: ObsiusPlugin;

  constructor(app: App, plugin: ObsiusPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Provider settings
    new Setting(containerEl)
      .setName('Claude API Key')
      .setDesc('Your Claude API key from Anthropic')
      .addText(text => text
        .setPlaceholder('sk-ant-...')
        .setValue(this.plugin.settings.providers.claude.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.providers.claude.apiKey = value;
          await this.plugin.saveSettings();
        }));

    // UI settings
    new Setting(containerEl)
      .setName('Theme')
      .setDesc('Choose the UI theme')
      .addDropdown(dropdown => dropdown
        .addOption('auto', 'Auto')
        .addOption('light', 'Light')
        .addOption('dark', 'Dark')
        .setValue(this.plugin.settings.ui.theme)
        .onChange(async (value) => {
          this.plugin.settings.ui.theme = value as any;
          await this.plugin.saveSettings();
        }));
  }
}
```

## Data Persistence

### Session Storage

```typescript
export class SessionManager {
  constructor(private plugin: ObsiusPlugin) {}

  async saveSession(session: Session): Promise<void> {
    const sessionData = {
      id: session.id,
      timestamp: Date.now(),
      history: session.history,
      context: session.context
    };
    
    await this.plugin.saveData(sessionData);
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    const data = await this.plugin.loadData();
    return data?.sessions?.[sessionId] || null;
  }

  async listSessions(): Promise<SessionSummary[]> {
    const data = await this.plugin.loadData();
    return Object.values(data?.sessions || {}).map(session => ({
      id: session.id,
      timestamp: session.timestamp,
      messageCount: session.history.length
    }));
  }
}
```

### Configuration Storage

```typescript
// Use Obsidian's built-in settings system
const DEFAULT_SETTINGS: ObsiusSettings = {
  providers: {
    claude: { enabled: true, apiKey: '', model: 'claude-3-sonnet' },
    gemini: { enabled: false, apiKey: '', model: 'gemini-pro' }
  },
  defaultProvider: 'claude',
  ui: { theme: 'auto', fontSize: 14, showToolDetails: true },
  tools: { autoConfirm: [], disabled: [] },
  sessions: { persistHistory: true, maxHistorySize: 100, autoSave: true }
};

// In plugin onload
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

async saveSettings() {
  await this.saveData(this.settings);
}
```

## Event Integration

### File System Events

```typescript
export class ObsidianEventHandler {
  constructor(private plugin: ObsiusPlugin) {}

  registerEvents(): void {
    // File creation
    this.plugin.registerEvent(
      this.plugin.app.vault.on('create', (file) => {
        this.onFileCreated(file);
      })
    );

    // File modification
    this.plugin.registerEvent(
      this.plugin.app.vault.on('modify', (file) => {
        this.onFileModified(file);
      })
    );

    // Active file change
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
        this.onActiveFileChanged(leaf);
      })
    );
  }

  private onFileCreated(file: TAbstractFile): void {
    // Update AI context with new file
  }

  private onFileModified(file: TAbstractFile): void {
    // Update AI context if relevant
  }

  private onActiveFileChanged(leaf: WorkspaceLeaf | null): void {
    // Update current context
  }
}
```

## Performance Considerations

### Lazy Loading

```typescript
// Load AI providers only when needed
export class LazyProviderLoader {
  private providers = new Map<string, Promise<AIProvider>>();

  async getProvider(name: string): Promise<AIProvider> {
    if (!this.providers.has(name)) {
      this.providers.set(name, this.loadProvider(name));
    }
    return await this.providers.get(name)!;
  }

  private async loadProvider(name: string): Promise<AIProvider> {
    switch (name) {
      case 'claude':
        const { ClaudeProvider } = await import('./providers/claude');
        return new ClaudeProvider();
      case 'gemini':
        const { GeminiProvider } = await import('./providers/gemini');
        return new GeminiProvider();
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }
}
```

### Memory Management

```typescript
// Limit session history to prevent memory issues
export class MemoryManager {
  private maxHistorySize = 100;
  private maxCacheSize = 50;

  pruneHistory(history: Message[]): Message[] {
    if (history.length > this.maxHistorySize) {
      return history.slice(-this.maxHistorySize);
    }
    return history;
  }

  clearCache(): void {
    // Clear tool result caches
    // Clear provider response caches
  }
}
```

## Security Considerations

### API Key Storage

```typescript
// Secure API key handling
export class SecureStorage {
  private static readonly KEY_PREFIX = 'obsius_';

  static async storeApiKey(provider: string, key: string): Promise<void> {
    // Use Obsidian's secure storage if available
    // Otherwise, encrypt before storing
    const encrypted = await this.encrypt(key);
    localStorage.setItem(`${this.KEY_PREFIX}${provider}`, encrypted);
  }

  static async getApiKey(provider: string): Promise<string | null> {
    const encrypted = localStorage.getItem(`${this.KEY_PREFIX}${provider}`);
    return encrypted ? await this.decrypt(encrypted) : null;
  }

  private static async encrypt(data: string): Promise<string> {
    // Simple encryption - consider using crypto-js for production
    return btoa(data);
  }

  private static async decrypt(data: string): Promise<string> {
    return atob(data);
  }
}
```

### Tool Permissions

```typescript
export class PermissionManager {
  private allowedOperations = new Set<string>();

  async requestPermission(operation: string): Promise<boolean> {
    if (this.allowedOperations.has(operation)) {
      return true;
    }

    const confirmed = await this.showPermissionDialog(operation);
    if (confirmed) {
      this.allowedOperations.add(operation);
    }
    return confirmed;
  }

  private async showPermissionDialog(operation: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new ConfirmationModal(
        this.app,
        `Allow ${operation}?`,
        `The AI wants to perform: ${operation}`,
        resolve
      );
      modal.open();
    });
  }
}
```

## Development Workflow

### Hot Reload Setup

```typescript
// In development mode
if (process.env.NODE_ENV === 'development') {
  // Enable hot reload for React components
  if (module.hot) {
    module.hot.accept('./ui/App', () => {
      this.refreshUI();
    });
  }
}
```

### Testing Integration

```typescript
// Mock Obsidian API for testing
export class MockObsidianApp {
  vault = new MockVault();
  workspace = new MockWorkspace();
  metadataCache = new MockMetadataCache();
  
  // Implement necessary Obsidian API methods
}

// Use in tests
describe('ObsiusPlugin', () => {
  let plugin: ObsiusPlugin;
  let mockApp: MockObsidianApp;

  beforeEach(() => {
    mockApp = new MockObsidianApp();
    plugin = new ObsiusPlugin(mockApp as any, {} as any);
  });

  it('should initialize correctly', async () => {
    await plugin.onload();
    expect(plugin.settings).toBeDefined();
  });
});
```