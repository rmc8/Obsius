/**
 * Test fixtures and sample data for Obsius tests
 */

import { 
  CreateNoteParams, 
  ReadNoteParams, 
  SearchNotesParams, 
  UpdateNoteParams,
  SearchResult,
  ChatMessage,
  ObsidianAction,
  ToolResult
} from '../../src/utils/types';
import { AIMessage, AIResponse } from '../../src/core/providers/BaseProvider';

// ============================================================================
// Tool Parameter Fixtures
// ============================================================================

export const validCreateNoteParams: CreateNoteParams = {
  title: 'Test Note',
  content: '# Test Note\n\nThis is a test note created by unit tests.',
  folder: 'Tests',
  tags: ['test', 'unit-test'],
  frontmatter: {
    author: 'Test Suite',
    created: '2024-01-01',
    category: 'testing'
  }
};

export const invalidCreateNoteParams = {
  title: '', // Invalid: empty title
  content: 'Some content',
  folder: '/invalid/path/../' // Invalid: path traversal
};

export const validReadNoteParams: ReadNoteParams = {
  path: 'Tests/Test Note.md',
  includeMetadata: true
};

export const validSearchNotesParams: SearchNotesParams = {
  query: 'test content',
  searchType: 'all' as const,
  limit: 10,
  includeSnippets: true
};

export const validUpdateNoteParams: UpdateNoteParams = {
  path: 'Tests/Test Note.md',
  operation: 'append' as const,
  content: '\n\nAppended content from test',
  backup: true
};

// ============================================================================
// Expected Results Fixtures
// ============================================================================

export const expectedCreateNoteResult: ToolResult = {
  success: true,
  message: 'Note created successfully',
  data: {
    path: 'Tests/Test Note.md',
    title: 'Test Note',
    created: true
  }
};

export const expectedSearchResults: SearchResult[] = [
  {
    title: 'Test Note 1',
    path: 'Tests/Test Note 1.md',
    snippet: 'This is a test note with relevant content...',
    score: 0.95,
    matches: [
      {
        line: 3,
        column: 15,
        text: 'test content',
        context: 'This is a test content example in the note.'
      }
    ]
  },
  {
    title: 'Another Test Note',
    path: 'Tests/Another Test Note.md',
    snippet: 'Another example of test content...',
    score: 0.87,
    matches: [
      {
        line: 1,
        column: 20,
        text: 'test content',
        context: 'Here we have some test content for searching.'
      }
    ]
  }
];

// ============================================================================
// AI Response Fixtures
// ============================================================================

export const mockAIMessages: AIMessage[] = [
  {
    role: 'system',
    content: 'You are an AI assistant for Obsidian knowledge management.'
  },
  {
    role: 'user',
    content: 'Create a new note about machine learning basics'
  },
  {
    role: 'assistant',
    content: 'I\'ll create a note about machine learning basics for you.'
  }
];

export const mockAIResponse: AIResponse = {
  content: 'I\'ll help you create a note about machine learning basics. Let me use the create_note tool to do this.',
  usage: {
    promptTokens: 125,
    completionTokens: 200,
    totalTokens: 325
  },
  toolCalls: [
    {
      id: 'call_1',
      type: 'function',
      function: {
        name: 'create_note',
        arguments: JSON.stringify({
          title: 'Machine Learning Basics',
          content: '# Machine Learning Basics\n\n## Introduction\nMachine learning is a subset of artificial intelligence...',
          folder: 'Learning',
          tags: ['machine-learning', 'ai', 'basics']
        })
      }
    }
  ],
  finishReason: 'tool_calls'
};

export const mockStreamingResponse = [
  { content: 'I\'ll', isComplete: false },
  { content: ' help', isComplete: false },
  { content: ' you', isComplete: false },
  { content: ' create', isComplete: false },
  { content: ' a', isComplete: false },
  { content: ' note', isComplete: false },
  { content: '.', isComplete: true, finishReason: 'stop' }
];

// ============================================================================
// Chat Message Fixtures
// ============================================================================

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    type: 'user',
    content: 'Create a note about Python programming'
  },
  {
    id: 'msg_2', 
    timestamp: new Date('2024-01-01T10:00:01Z'),
    type: 'assistant',
    content: 'I\'ll create a Python programming note for you.',
    actions: [
      {
        type: 'create_note',
        description: 'Create Python programming note',
        parameters: {
          title: 'Python Programming',
          content: '# Python Programming\n\nBasics of Python language...'
        },
        riskLevel: 'low',
        requiresConfirmation: false,
        result: {
          success: true,
          message: 'Note created successfully',
          data: { path: 'Python Programming.md' }
        }
      }
    ]
  }
];

// ============================================================================
// Error Fixtures
// ============================================================================

export const mockToolErrors = {
  validation: {
    success: false,
    message: 'Validation failed',
    error: 'Title cannot be empty'
  },
  execution: {
    success: false,
    message: 'Tool execution failed',
    error: 'File already exists at the specified path'
  },
  permission: {
    success: false,
    message: 'Permission denied',
    error: 'Insufficient permissions to create file in target folder'
  },
  network: {
    success: false,
    message: 'Network error',
    error: 'Failed to connect to API endpoint'
  }
};

// ============================================================================
// Provider Configuration Fixtures
// ============================================================================

export const mockProviderConfigs = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    enabled: true,
    authenticated: true,
    hasApiKey: true,
    keyPrefix: 'sk-ab...def',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    lastVerified: '2024-01-01T10:00:00Z'
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet',
    enabled: true,
    authenticated: false,
    hasApiKey: false,
    models: ['claude-3-sonnet', 'claude-3-haiku'],
    lastVerified: undefined
  }
};

// ============================================================================
// Session Fixtures
// ============================================================================

export const mockSessionData = {
  history: mockChatMessages,
  stats: {
    totalTokens: 1250,
    totalCost: 0.025,
    providerStats: {
      openai: {
        tokens: 800,
        cost: 0.016,
        requests: 3
      },
      anthropic: {
        tokens: 450,
        cost: 0.009,
        requests: 2
      }
    },
    requestCount: 5
  },
  settings: {
    providers: mockProviderConfigs,
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
      language: 'en' as const,
      showTimestamps: true,
      enableStreaming: true,
      autoScroll: true
    },
    sessions: {
      maxHistorySize: 100,
      autoSave: true,
      persistAcrossReloads: true
    }
  }
};

// ============================================================================
// Test Utility Functions
// ============================================================================

export const createMockChatMessage = (
  type: 'user' | 'assistant' | 'system' = 'user',
  content: string = 'Test message',
  actions?: ObsidianAction[]
): ChatMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date(),
  type,
  content,
  actions
});

export const createMockObsidianAction = (
  type: string = 'create_note',
  parameters: any = validCreateNoteParams,
  result?: ToolResult
): ObsidianAction => ({
  type,
  description: `Execute ${type}`,
  parameters,
  riskLevel: 'low',
  requiresConfirmation: false,
  result
});

export const createMockToolResult = (
  success: boolean = true,
  message: string = 'Operation completed',
  data?: any,
  error?: string
): ToolResult => ({
  success,
  message,
  data,
  error
});

// File content samples
export const sampleNoteContents = {
  basicNote: '# Basic Note\n\nThis is a simple note with some content.\n\n## Section\n\nMore content here.',
  
  noteWithFrontmatter: `---
title: Advanced Note
author: Test Author
tags: [test, example]
created: 2024-01-01
---

# Advanced Note

This note has frontmatter and structured content.

## Key Points

- Point 1
- Point 2
- Point 3`,

  noteWithLinks: '# Note with Links\n\nThis note references [[Other Note]] and has a [external link](https://example.com).',
  
  longNote: Array(50).fill('This is line content for a long note.').join('\n'),
  
  emptyNote: '',
  
  malformedNote: '# Malformed\n\nThis note has ```unclosed code block'
};