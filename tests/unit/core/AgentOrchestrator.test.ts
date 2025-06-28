/**
 * Unit tests for AgentOrchestrator class
 * Following TDD methodology: Red → Green → Refactor
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AgentOrchestrator, AgentConfig, ConversationContext } from '../../../src/core/AgentOrchestrator';
import { ToolRegistry } from '../../../src/tools/ToolRegistry';
import { createMockApp, createMockExecutionContext } from '../../setup';
import { MockProviderManager, MockBaseProvider } from '../../mocks/providers';
import { 
  ChatMessage, 
  ObsidianAction, 
  AssistantResponse, 
  ToolResult 
} from '../../../src/utils/types';
import { AIMessage, AIResponse } from '../../../src/core/providers/BaseProvider';

// Mock the i18n module
jest.mock('../../../src/utils/i18n', () => ({
  t: jest.fn((key: string, params?: any) => {
    const translations: Record<string, string> = {
      'provider.noAuthenticated': 'No authenticated provider available',
      'general.error': 'Error',
      'errors.authentication.invalid': 'Authentication failed',
      'errors.rateLimit.exceeded': 'Rate limit exceeded',
      'errors.network.connection': 'Network connection error',
      'errors.model.unavailable': 'Model unavailable',
      'errors.provider.notConfigured': 'Provider not configured',
      'errors.unknown.general': 'Unknown error occurred'
    };
    
    let result = translations[key] || key;
    if (params) {
      Object.keys(params).forEach(paramKey => {
        result = result.replace(`{${paramKey}}`, params[paramKey]);
      });
    }
    return result;
  }),
  getCurrentLanguage: jest.fn(() => 'en'),
  buildLocalizedSystemPrompt: jest.fn((context: any) => `You are an AI assistant for Obsidian. Current vault: ${context.vaultName}. Available tools: ${context.availableTools.join(', ')}.`)
}));

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockApp: any;
  let mockProviderManager: MockProviderManager;
  let mockToolRegistry: ToolRegistry;
  let mockProvider: MockBaseProvider;

  beforeEach(() => {
    mockApp = createMockApp();
    mockProviderManager = new MockProviderManager();
    mockToolRegistry = new ToolRegistry(mockApp, createMockExecutionContext(mockApp));
    
    // Set up mock provider
    mockProvider = new MockBaseProvider('test-provider');
    mockProvider.setApiKey('test-api-key');
    mockProviderManager.addProvider('test-provider', mockProvider);
    mockProviderManager.setCurrentProvider('test-provider');
    
    orchestrator = new AgentOrchestrator(mockApp, mockProviderManager as any, mockToolRegistry);
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with required dependencies', () => {
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
      expect((orchestrator as any).app).toBe(mockApp);
      expect((orchestrator as any).providerManager).toBe(mockProviderManager);
      expect((orchestrator as any).toolRegistry).toBe(mockToolRegistry);
    });

    test('should initialize with empty conversation history', () => {
      const history = orchestrator.getHistory();
      expect(history).toEqual([]);
    });

    test('should initialize with default session stats', () => {
      const stats = orchestrator.getSessionStats();
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
      expect(stats.providerStats).toEqual({});
    });
  });

  describe('Message Processing', () => {
    test('should process simple user message successfully', async () => {
      const userInput = 'Hello, how are you?';
      const context: ConversationContext = {
        messages: [],
        currentFile: 'test.md',
        workspaceState: { activeFile: 'test.md', openTabs: ['test.md'] }
      };

      // Set up mock AI response
      mockProvider.addMockResponse({
        content: 'Hello! I am doing well, thank you for asking.',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 }
      });

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toBe('Hello! I am doing well, thank you for asking.');
      expect(result.actions).toEqual([]);
    });

    test('should handle AI response with tool calls', async () => {
      const userInput = 'Create a note called "Test Note"';
      const context: ConversationContext = {
        messages: [],
        currentFile: undefined,
        workspaceState: { activeFile: undefined, openTabs: [] }
      };

      // Set up mock AI response with tool calls
      mockProvider.addMockResponse({
        content: 'I\'ll create a note called "Test Note" for you.',
        usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({
                title: 'Test Note',
                content: '# Test Note\n\nThis is a test note.'
              })
            }
          }
        ]
      });

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toBe('I\'ll create a note called "Test Note" for you.');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('create_note');
      expect(result.actions[0].parameters).toEqual({
        title: 'Test Note',
        content: '# Test Note\n\nThis is a test note.'
      });
    });

    test('should handle provider authentication failure', async () => {
      // Clear all providers to simulate no authenticated provider
      mockProviderManager.reset();

      const userInput = 'Test message';
      const context: ConversationContext = { messages: [] };

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toContain('No authenticated provider available');
      expect(result.actions).toEqual([]);
    });

    test('should handle AI provider errors gracefully', async () => {
      const userInput = 'Test message that will fail';
      const context: ConversationContext = { messages: [] };

      // Make the provider throw an error
      mockProvider.addMockResponse({
        content: 'This will not be used',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      });
      
      // Mock the provider to throw an error
      jest.spyOn(mockProvider, 'generateResponse').mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toContain('rate limit');
      expect(result.actions).toEqual([]);
    });

    test('should update conversation history after processing', async () => {
      const userInput = 'Hello!';
      const context: ConversationContext = { messages: [] };

      mockProvider.addMockResponse({
        content: 'Hello there!',
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
      });

      await orchestrator.processMessage(userInput, context);

      const history = orchestrator.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('user');
      expect(history[0].content).toBe('Hello!');
      expect(history[1].type).toBe('assistant');
      expect(history[1].content).toBe('Hello there!');
    });
  });

  describe('Streaming Message Processing', () => {
    test('should handle streaming responses', async () => {
      const userInput = 'Tell me a story';
      const context: ConversationContext = { messages: [] };
      const chunks: any[] = [];
      
      const streamCallback = (chunk: any) => {
        chunks.push(chunk);
      };

      mockProvider.addMockResponse({
        content: 'Once upon a time, there was a brave knight.',
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
      });

      const result = await orchestrator.processMessageStreaming(
        userInput, 
        context, 
        streamCallback
      );

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toBe('Once upon a time, there was a brave knight.');
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('should handle streaming errors gracefully', async () => {
      const userInput = 'This will fail during streaming';
      const context: ConversationContext = { messages: [] };
      const chunks: any[] = [];
      
      const streamCallback = (chunk: any) => {
        chunks.push(chunk);
      };

      // Mock the provider to throw an error during streaming
      jest.spyOn(mockProvider, 'generateStreamingResponse').mockRejectedValueOnce(
        new Error('Streaming connection failed')
      );

      const result = await orchestrator.processMessageStreaming(
        userInput, 
        context, 
        streamCallback
      );

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toContain('connection');
      expect(result.actions).toEqual([]);
    });
  });

  describe('Session Management', () => {
    test('should clear conversation history', () => {
      // Add some messages first
      (orchestrator as any).conversationHistory = [
        { id: '1', type: 'user', content: 'Hello', timestamp: new Date() },
        { id: '2', type: 'assistant', content: 'Hi there', timestamp: new Date() }
      ];

      orchestrator.clearHistory();
      
      const history = orchestrator.getHistory();
      expect(history).toEqual([]);
    });

    test('should set conversation history', () => {
      const testMessages: ChatMessage[] = [
        { id: '1', type: 'user', content: 'Test 1', timestamp: new Date() },
        { id: '2', type: 'assistant', content: 'Response 1', timestamp: new Date() }
      ];

      orchestrator.setHistory(testMessages);
      
      const history = orchestrator.getHistory();
      expect(history).toEqual(testMessages);
    });

    test('should track session statistics', async () => {
      const userInput = 'Test for statistics';
      const context: ConversationContext = { messages: [] };

      mockProvider.addMockResponse({
        content: 'Statistics response',
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 }
      });

      await orchestrator.processMessage(userInput, context);

      const stats = orchestrator.getSessionStats();
      expect(stats.totalTokens).toBe(300);
      expect(stats.requestCount).toBe(1);
      expect(stats.providerStats['test-provider']).toBeDefined();
      expect(stats.providerStats['test-provider'].tokens).toBe(300);
      expect(stats.providerStats['test-provider'].requests).toBe(1);
    });

    test('should clear session statistics', () => {
      // First add some stats
      (orchestrator as any).sessionStats = {
        totalTokens: 500,
        totalCost: 0.01,
        requestCount: 3,
        providerStats: { 'test': { tokens: 500, cost: 0.01, requests: 3 } }
      };

      orchestrator.clearSessionStats();

      const stats = orchestrator.getSessionStats();
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.requestCount).toBe(0);
      expect(stats.providerStats).toEqual({});
    });
  });

  describe('Tool Execution', () => {
    test('should execute tools from AI responses', async () => {
      const userInput = 'Create a note and search for content';
      const context: ConversationContext = { messages: [] };

      // Mock tool registry to return successful results
      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: true,
        message: 'Tool executed successfully',
        data: { noteCreated: true }
      });

      mockProvider.addMockResponse({
        content: 'I\'ll create a note and search for you.',
        usage: { promptTokens: 30, completionTokens: 40, totalTokens: 70 },
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({ title: 'New Note', content: 'Content' })
            }
          }
        ]
      });

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].result?.success).toBe(true);
      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
        'create_note',
        { title: 'New Note', content: 'Content' },
        expect.objectContaining({ context: expect.any(Object) })
      );
    });

    test('should handle tool execution failures', async () => {
      const userInput = 'Try to execute a failing tool';
      const context: ConversationContext = { messages: [] };

      // Mock tool registry to return failure
      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: false,
        message: 'Tool execution failed',
        error: 'Invalid parameters'
      });

      mockProvider.addMockResponse({
        content: 'I\'ll try to execute the tool.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'failing_tool',
              arguments: JSON.stringify({ param: 'invalid' })
            }
          }
        ]
      });

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].result?.success).toBe(false);
      expect(result.actions[0].result?.error).toBe('Invalid parameters');
    });
  });

  describe('Risk Assessment and Confirmation', () => {
    test('should correctly assess risk levels for different operations', () => {
      expect((orchestrator as any).assessRiskLevel('create_note')).toBe('low');
      expect((orchestrator as any).assessRiskLevel('read_note')).toBe('low');
      expect((orchestrator as any).assessRiskLevel('search_notes')).toBe('low');
      expect((orchestrator as any).assessRiskLevel('update_note')).toBe('medium');
      expect((orchestrator as any).assessRiskLevel('unknown_tool')).toBe('medium');
    });

    test('should determine which operations require confirmation', () => {
      expect((orchestrator as any).requiresConfirmation('create_note')).toBe(false);
      expect((orchestrator as any).requiresConfirmation('read_note')).toBe(false);
      expect((orchestrator as any).requiresConfirmation('update_note')).toBe(true);
      expect((orchestrator as any).requiresConfirmation('delete_note')).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should create appropriate error messages for different error types', () => {
      const authError = new Error('API key invalid');
      const rateLimitError = new Error('Rate limit exceeded');
      const networkError = new Error('Network timeout');
      const unknownError = new Error('Something unexpected happened');

      const authMessage = (orchestrator as any).createErrorMessage(authError);
      const rateLimitMessage = (orchestrator as any).createErrorMessage(rateLimitError);
      const networkMessage = (orchestrator as any).createErrorMessage(networkError);
      const unknownMessage = (orchestrator as any).createErrorMessage(unknownError);

      expect(authMessage.content).toContain('Authentication failed');
      expect(rateLimitMessage.content).toContain('Rate limit exceeded');
      expect(networkMessage.content).toContain('Network connection error');
      expect(unknownMessage.content).toContain('Something unexpected happened');
    });

    test('should handle provider switching during conversation', async () => {
      const userInput = 'Test message';
      const context: ConversationContext = { messages: [] };
      const config: AgentConfig = { providerId: 'different-provider' };

      // Add a different provider
      const differentProvider = new MockBaseProvider('different-provider');
      differentProvider.setApiKey('different-api-key');
      differentProvider.addMockResponse({
        content: 'Response from different provider',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
      });
      
      mockProviderManager.addProvider('different-provider', differentProvider);

      const result = await orchestrator.processMessage(userInput, context, config);

      expect(result.message.content).toBe('Response from different provider');
    });
  });

  describe('System Prompt Generation', () => {
    test('should build appropriate system prompt with context', async () => {
      const userInput = 'Test message to check system prompt';
      const context: ConversationContext = {
        messages: [],
        currentFile: 'current-note.md',
        workspaceState: { activeFile: 'current-note.md', openTabs: ['note1.md', 'note2.md'] }
      };

      mockProvider.addMockResponse({
        content: 'Response with system prompt',
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 }
      });

      await orchestrator.processMessage(userInput, context);

      // Verify that generateResponse was called with a system message
      const calls = jest.mocked(mockProvider.generateResponse).mock.calls;
      expect(calls).toHaveLength(1);
      
      const [messages, options] = calls[0];
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('AI assistant for Obsidian');
      expect(messages[0].content).toContain('Test Vault');
    });
  });

  describe('File Tracking', () => {
    test('should track created and modified files from actions', async () => {
      const userInput = 'Create and modify some files';
      const context: ConversationContext = { messages: [] };

      jest.spyOn(mockToolRegistry, 'executeTool')
        .mockResolvedValueOnce({
          success: true,
          message: 'Note created',
          data: { path: 'new-note.md' }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Note updated',
          data: { path: 'existing-note.md' }
        });

      mockProvider.addMockResponse({
        content: 'I\'ll create and modify files for you.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({ title: 'New Note' })
            }
          },
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'update_note',
              arguments: JSON.stringify({ path: 'existing-note.md', content: 'Updated content' })
            }
          }
        ]
      });

      const result = await orchestrator.processMessage(userInput, context);

      expect(result.filesCreated).toEqual(['new-note.md']);
      expect(result.filesModified).toEqual(['existing-note.md']);
    });
  });
});