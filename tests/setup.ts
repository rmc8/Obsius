/**
 * Jest test setup file
 * Configures global test environment and mocks
 */

import { jest } from '@jest/globals';

// Mock global objects that may not be available in test environment
global.fetch = jest.fn();
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Mock Node.js APIs that might be used
Object.defineProperty(global, 'setTimeout', {
  value: jest.fn((fn: Function, delay: number) => {
    return setTimeout(fn, delay);
  }),
  writable: true
});

Object.defineProperty(global, 'clearTimeout', {
  value: jest.fn(clearTimeout),
  writable: true
});

// Mock crypto for secure storage tests
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
      generateKey: jest.fn()
    }
  },
  writable: true
});

// Set test timeout for async operations
jest.setTimeout(10000);

// Global test utilities
export const createMockFile = (path: string, content: string = '') => ({
  path,
  name: path.split('/').pop() || '',
  basename: path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '',
  extension: path.split('.').pop() || '',
  stat: {
    ctime: Date.now(),
    mtime: Date.now(),
    size: content.length
  },
  vault: null,
  parent: null
});

export const createMockApp = () => ({
  vault: {
    getName: jest.fn(() => 'Test Vault'),
    getAbstractFileByPath: jest.fn(),
    create: jest.fn(),
    read: jest.fn(),
    modify: jest.fn(),
    delete: jest.fn(),
    getMarkdownFiles: jest.fn(() => []),
    adapter: {
      path: '/test/vault'
    }
  },
  workspace: {
    getActiveFile: jest.fn(),
    openLinkText: jest.fn(),
    getLeaf: jest.fn()
  },
  metadataCache: {
    getFileCache: jest.fn(),
    getFirstLinkpathDest: jest.fn()
  },
  fileManager: {
    generateMarkdownLink: jest.fn()
  }
});

export const createMockExecutionContext = (app = createMockApp()) => ({
  app,
  currentFile: undefined,
  vaultPath: '/test/vault',
  workspaceState: {
    activeFile: undefined,
    openTabs: [],
    selectedText: undefined,
    cursorPosition: undefined
  }
});

// Mock timers for testing async operations
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
});