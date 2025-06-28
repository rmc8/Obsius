/**
 * Mock implementation of Obsidian API for testing
 * Provides comprehensive mocks for all Obsidian types and functions
 */

import { jest } from '@jest/globals';

// Mock TFile class
export class TFile {
  constructor(
    public vault: any,
    public path: string,
    public stat = {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0
    }
  ) {}

  get name(): string {
    return this.path.split('/').pop() || '';
  }

  get basename(): string {
    return this.name.replace(/\.[^/.]+$/, '');
  }

  get extension(): string {
    return this.path.split('.').pop() || '';
  }

  get parent(): any {
    return null;
  }
}

// Mock TFolder class
export class TFolder {
  constructor(
    public vault: any,
    public path: string
  ) {}

  get name(): string {
    return this.path.split('/').pop() || '';
  }

  get parent(): any {
    return null;
  }

  children: any[] = [];
}

// Mock Vault class
export class Vault {
  private files: Map<string, TFile> = new Map();
  private fileContents: Map<string, string> = new Map();

  getName = jest.fn(() => 'Test Vault');
  
  getAbstractFileByPath = jest.fn((path: string) => {
    return this.files.get(path) || null;
  });

  create = jest.fn(async (path: string, data: string) => {
    const file = new TFile(this, path, {
      ctime: Date.now(),
      mtime: Date.now(),
      size: data.length
    });
    this.files.set(path, file);
    this.fileContents.set(path, data);
    return file;
  });

  read = jest.fn(async (file: TFile) => {
    return this.fileContents.get(file.path) || '';
  });

  modify = jest.fn(async (file: TFile, data: string) => {
    this.fileContents.set(file.path, data);
    file.stat.mtime = Date.now();
    file.stat.size = data.length;
  });

  delete = jest.fn(async (file: TFile) => {
    this.files.delete(file.path);
    this.fileContents.delete(file.path);
  });

  getMarkdownFiles = jest.fn(() => {
    return Array.from(this.files.values()).filter(f => f.extension === 'md');
  });

  getAllLoadedFiles = jest.fn(() => {
    return Array.from(this.files.values());
  });

  getFiles = jest.fn(() => {
    return Array.from(this.files.values());
  });

  getFolders = jest.fn(() => []);

  adapter = {
    path: '/test/vault',
    list: jest.fn(),
    exists: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn()
  };
}

// Mock Workspace class
export class Workspace {
  getActiveFile = jest.fn(() => null);
  openLinkText = jest.fn();
  getLeaf = jest.fn(() => ({
    openFile: jest.fn(),
    setViewState: jest.fn()
  }));
  getLeavesOfType = jest.fn(() => []);
  onLayoutReady = jest.fn();
  trigger = jest.fn();
  on = jest.fn();
  off = jest.fn();
}

// Mock MetadataCache class
export class MetadataCache {
  getFileCache = jest.fn(() => null);
  getFirstLinkpathDest = jest.fn(() => null);
  resolvedLinks = {};
  unresolvedLinks = {};
  on = jest.fn();
  off = jest.fn();
  trigger = jest.fn();
}

// Mock FileManager class
export class FileManager {
  generateMarkdownLink = jest.fn((file: TFile, sourcePath?: string) => {
    return `[[${file.basename}]]`;
  });
  
  createFolder = jest.fn();
  processFrontMatter = jest.fn();
}

// Mock App class
export class App {
  vault = new Vault();
  workspace = new Workspace();
  metadataCache = new MetadataCache();
  fileManager = new FileManager();
  
  lastEvent = jest.fn();
  setting = {};
  
  // Plugin loading
  plugins = {
    plugins: {},
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn()
  };

  // Settings
  loadData = jest.fn(() => Promise.resolve({}));
  saveData = jest.fn(() => Promise.resolve());
}

// Mock Plugin class
export class Plugin {
  app: App;
  manifest: any;
  
  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  onload = jest.fn();
  onunload = jest.fn();
  loadData = jest.fn(() => Promise.resolve({}));
  saveData = jest.fn(() => Promise.resolve());
  addRibbonIcon = jest.fn();
  addStatusBarItem = jest.fn();
  addCommand = jest.fn();
  addSettingTab = jest.fn();
  registerView = jest.fn();
  registerHoverLinkSource = jest.fn();
  registerMarkdownPostProcessor = jest.fn();
  registerCodeMirror = jest.fn();
  registerInterval = jest.fn();
  registerDomEvent = jest.fn();
  register = jest.fn();
}

// Mock ItemView class
export class ItemView {
  app: App;
  containerEl: HTMLElement;
  
  constructor() {
    this.app = new App();
    this.containerEl = document.createElement('div');
  }

  getViewType = jest.fn(() => 'mock-view');
  getDisplayText = jest.fn(() => 'Mock View');
  onOpen = jest.fn();
  onClose = jest.fn();
  load = jest.fn();
  unload = jest.fn();
}

// Mock PluginSettingTab class
export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display = jest.fn();
  hide = jest.fn();
}

// Mock Setting class
export class Setting {
  settingEl: HTMLElement;
  
  constructor(public containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }

  setName = jest.fn(() => this);
  setDesc = jest.fn(() => this);
  addText = jest.fn(() => this);
  addDropdown = jest.fn(() => this);
  addToggle = jest.fn(() => this);
  addButton = jest.fn(() => this);
  addTextArea = jest.fn(() => this);
  setClass = jest.fn(() => this);
}

// Mock Notice class
export class Notice {
  constructor(
    public message: string,
    public timeout?: number
  ) {}
  
  hide = jest.fn();
  noticeEl: HTMLElement = document.createElement('div');
}

// Mock Component class
export class Component {
  _loaded = false;
  _children: Component[] = [];

  load = jest.fn(() => {
    this._loaded = true;
    this.onload();
  });

  unload = jest.fn(() => {
    this._loaded = false;
    this.onunload();
  });

  onload = jest.fn();
  onunload = jest.fn();
  addChild = jest.fn();
  removeChild = jest.fn();
  register = jest.fn();
  registerEvent = jest.fn();
  registerDomEvent = jest.fn();
  registerInterval = jest.fn();
}

// Export default mock factory
export const createMockApp = () => new App();
export const createMockPlugin = (app: App = new App()) => new Plugin(app, {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  minAppVersion: '0.15.0'
});

// Default exports for compatibility
export default {
  App,
  Plugin,
  TFile,
  TFolder,
  Vault,
  Workspace,
  MetadataCache,
  FileManager,
  ItemView,
  PluginSettingTab,
  Setting,
  Notice,
  Component,
  createMockApp,
  createMockPlugin
};