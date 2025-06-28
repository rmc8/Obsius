/**
 * Integration tests for basic Obsius workflows
 * Tests the complete flow from user input to tool execution
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AgentOrchestrator } from '../../../src/core/AgentOrchestrator';
import { ToolRegistry } from '../../../src/tools/ToolRegistry';
import { createMockApp, createMockExecutionContext } from '../../setup';
import { MockProviderManager, MockBaseProvider } from '../../mocks/providers';
import { CreateNoteTool } from '../../../src/tools/obsidian/CreateNoteTool';
import { ReadNoteTool } from '../../../src/tools/obsidian/ReadNoteTool';
import { SearchNotesTool } from '../../../src/tools/obsidian/SearchNotesTool';

// Mock the i18n module
jest.mock('../../../src/utils/i18n', () => ({
  t: jest.fn((key: string) => key),
  getCurrentLanguage: jest.fn(() => 'en'),
  buildLocalizedSystemPrompt: jest.fn(() => 'System prompt for testing')
}));

describe('Basic Obsius Workflows', () => {
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
    
    orchestrator = new AgentOrchestrator(mockApp, mockProviderManager as any, mockToolRegistry, {
      providers: {},
      defaultProvider: 'openai',
      tools: {
        enabled: [],
        confirmationRequired: [],
        riskLevels: { low: [], medium: [], high: [] }
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
      },
      mcp: {
        enabled: false,
        servers: {},
        autoDiscovery: false,
        defaultTimeout: 600000
      }
    });
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Note Creation Workflow', () => {
    test('should successfully create a note through AI interaction', async () => {
      const userInput = 'Create a note called "Meeting Notes" with basic content';
      
      // Mock the AI response to include note creation
      mockProvider.addMockResponse({
        content: 'I\'ll create a meeting notes file for you.',
        usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50 },
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({
                title: 'Meeting Notes',
                content: '# Meeting Notes\n\n- Agenda item 1\n- Agenda item 2',
                folder: 'Work'
              })
            }
          }
        ]
      });

      // Mock successful tool execution
      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: true,
        message: 'Note created successfully',
        data: {
          path: 'Work/Meeting Notes.md',
          title: 'Meeting Notes'
        }
      });

      const result = await orchestrator.processMessage(userInput, { messages: [] });

      expect(result.message.content).toBe('I\'ll create a meeting notes file for you.');
      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].type).toBe('create_note');
      expect(result.actions![0].result?.success).toBe(true);
      expect(result.filesCreated).toContain('Work/Meeting Notes.md');
    }, 15000);

    test('should handle note creation failure gracefully', async () => {
      const userInput = 'Create a note in a protected folder';

      mockProvider.addMockResponse({
        content: 'I\'ll try to create that note for you.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({
                title: 'Protected Note',
                folder: '/system/protected'
              })
            }
          }
        ]
      });

      // Mock failed tool execution
      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: false,
        message: 'Permission denied',
        error: 'Cannot write to protected folder'
      });

      const result = await orchestrator.processMessage(userInput, { messages: [] });

      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].result?.success).toBe(false);
      expect(result.actions![0].result?.error).toContain('protected folder');
    }, 15000);
  });

  describe('Note Reading Workflow', () => {
    test('should read existing note content', async () => {
      const userInput = 'Show me the content of "Project Plan.md"';

      mockProvider.addMockResponse({
        content: 'I\'ll read the Project Plan file for you.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'read_note',
              arguments: JSON.stringify({
                path: 'Project Plan.md',
                includeMetadata: true
              })
            }
          }
        ]
      });

      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: true,
        message: 'Note read successfully',
        data: {
          content: '# Project Plan\n\n## Phase 1\nInitial setup and planning\n\n## Phase 2\nImplementation',
          metadata: {
            created: '2024-01-01',
            modified: '2024-01-15',
            tags: ['project', 'planning']
          }
        }
      });

      const result = await orchestrator.processMessage(userInput, { messages: [] });

      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].type).toBe('read_note');
      expect(result.actions![0].result?.data.content).toContain('Project Plan');
      expect(result.actions![0].result?.data.metadata.tags).toContain('project');
    }, 15000);
  });

  describe('Note Search Workflow', () => {
    test('should search for notes with specific content', async () => {
      const userInput = 'Find all notes that mention "artificial intelligence"';

      mockProvider.addMockResponse({
        content: 'I\'ll search for notes mentioning artificial intelligence.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'search_notes',
              arguments: JSON.stringify({
                query: 'artificial intelligence',
                searchType: 'content',
                includeSnippets: true,
                limit: 10
              })
            }
          }
        ]
      });

      jest.spyOn(mockToolRegistry, 'executeTool').mockResolvedValue({
        success: true,
        message: 'Found 3 notes matching your search',
        data: {
          results: [
            {
              title: 'AI Research Notes',
              path: 'Research/AI Research Notes.md',
              snippet: 'Artificial intelligence is transforming how we work...',
              score: 0.95
            },
            {
              title: 'Technology Trends',
              path: 'Technology Trends.md',
              snippet: 'The rise of artificial intelligence in business...',
              score: 0.87
            }
          ],
          totalCount: 2
        }
      });

      const result = await orchestrator.processMessage(userInput, { messages: [] });

      expect(result.actions).toHaveLength(1);
      expect(result.actions![0].type).toBe('search_notes');
      expect(result.actions![0].result?.data.results).toHaveLength(2);
      expect(result.actions![0].result?.data.results[0].title).toBe('AI Research Notes');
    }, 15000);
  });

  describe('Multi-step Workflow', () => {
    test('should handle complex multi-step operations', async () => {
      const userInput = 'Search for notes about "project management", then create a summary note';

      // First AI response - search for notes
      mockProvider.addMockResponse({
        content: 'I\'ll search for project management notes first, then create a summary.',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'search_notes',
              arguments: JSON.stringify({
                query: 'project management',
                searchType: 'all',
                includeSnippets: true
              })
            }
          }
        ]
      });

      // Mock search results
      jest.spyOn(mockToolRegistry, 'executeTool')
        .mockResolvedValueOnce({
          success: true,
          message: 'Found project management notes',
          data: {
            results: [
              {
                title: 'Agile Methodology',
                path: 'Agile Methodology.md',
                snippet: 'Agile project management focuses on iterative development...'
              },
              {
                title: 'Team Management',
                path: 'Team Management.md', 
                snippet: 'Effective team management requires clear communication...'
              }
            ]
          }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Summary note created',
          data: {
            path: 'Project Management Summary.md',
            title: 'Project Management Summary'
          }
        });

      // Process first message (search)
      const searchResult = await orchestrator.processMessage(userInput, { messages: [] });

      expect(searchResult.actions).toHaveLength(1);
      expect(searchResult.actions![0].type).toBe('search_notes');
      expect(searchResult.actions![0].result?.success).toBe(true);

      // Simulate follow-up for creating summary
      mockProvider.addMockResponse({
        content: 'Based on the search results, I\'ll create a summary note.',
        toolCalls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: JSON.stringify({
                title: 'Project Management Summary',
                content: '# Project Management Summary\n\nBased on my search, here are key insights:\n\n## Agile Methodology\n- Iterative development\n\n## Team Management\n- Clear communication'
              })
            }
          }
        ]
      });

      const summaryResult = await orchestrator.processMessage(
        'Now create the summary note',
        { messages: searchResult ? [searchResult.message] : [] }
      );

      expect(summaryResult.actions).toHaveLength(1);
      expect(summaryResult.actions![0].type).toBe('create_note');
      expect(summaryResult.actions![0].result?.success).toBe(true);
      expect(summaryResult.filesCreated).toContain('Project Management Summary.md');
    }, 20000);
  });

  describe('Error Recovery Workflow', () => {
    test('should handle provider failures and suggest alternatives', async () => {
      const userInput = 'Create a note about today\'s meeting';

      // First attempt fails due to provider error
      jest.spyOn(mockProvider, 'generateResponse').mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      const result = await orchestrator.processMessage(userInput, { messages: [] });

      expect(result.message.type).toBe('assistant');
      expect(result.message.content).toContain('rate limit');
      expect(result.actions).toEqual([]);
    }, 15000);

    test('should maintain conversation context across failures', async () => {
      // Start with successful interaction
      const firstInput = 'Hello';
      mockProvider.addMockResponse({
        content: 'Hello! How can I help you?',
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 }
      });

      const firstResult = await orchestrator.processMessage(firstInput, { messages: [] });
      expect(firstResult.message.content).toBe('Hello! How can I help you?');

      // History should contain both messages
      const history = orchestrator.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Hello');
      expect(history[1].content).toBe('Hello! How can I help you?');

      // Follow-up should have context even if it fails
      jest.spyOn(mockProvider, 'generateResponse').mockRejectedValueOnce(
        new Error('Network error')
      );

      const secondResult = await orchestrator.processMessage(
        'Can you help me create a note?',
        { messages: history }
      );

      // Even after error, history should be preserved
      const finalHistory = orchestrator.getHistory();
      expect(finalHistory).toHaveLength(4); // 2 original + user message + error response
    }, 15000);
  });
});