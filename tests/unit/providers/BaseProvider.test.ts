/**
 * Unit tests for BaseProvider class
 * Following TDD methodology: Red → Green → Refactor
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { 
  BaseProvider, 
  ProviderAuthResult, 
  AIMessage, 
  AIResponse, 
  StreamChunk, 
  StreamCallback 
} from '../../../src/core/providers/BaseProvider';

// Concrete implementation of BaseProvider for testing
class TestProvider extends BaseProvider {
  public mockAuthResult: ProviderAuthResult = { success: true };
  public mockModels: string[] = ['test-model-1', 'test-model-2'];
  public mockCompletionResponse: AIResponse = {
    content: 'Test AI response',
    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
  };

  constructor() {
    super({
      name: 'Test Provider',
      defaultModel: 'test-model-1',
      timeout: 5000
    });
  }

  get providerId(): string {
    return 'test-provider';
  }

  get displayName(): string {
    return 'Test Provider';
  }

  get authEndpoint(): string {
    return 'https://api.test-provider.com/auth';
  }

  get modelsEndpoint(): string {
    return 'https://api.test-provider.com/models';
  }

  get completionEndpoint(): string {
    return 'https://api.test-provider.com/completions';
  }

  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  protected parseAuthResponse(response: any): ProviderAuthResult {
    return this.mockAuthResult;
  }

  protected parseModelsResponse(response: any): string[] {
    return this.mockModels;
  }

  protected formatCompletionRequest(messages: AIMessage[], options: any): any {
    return {
      model: this.config.defaultModel,
      messages,
      ...options
    };
  }

  protected parseCompletionResponse(response: any): AIResponse {
    return this.mockCompletionResponse;
  }

  protected parseStreamChunk(chunk: string): StreamChunk | null {
    if (chunk.startsWith('data: ')) {
      try {
        const data = JSON.parse(chunk.slice(6));
        return {
          content: data.content || '',
          isComplete: data.isComplete || false,
          finishReason: data.finishReason
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  // Helper methods to control test behavior
  setMockAuthResult(result: ProviderAuthResult): void {
    this.mockAuthResult = result;
  }

  setMockModels(models: string[]): void {
    this.mockModels = models;
  }

  setMockCompletionResponse(response: AIResponse): void {
    this.mockCompletionResponse = response;
  }

  // Expose protected methods for testing
  public testMakeHttpRequest(config: any, url: string) {
    return (this as any).makeHttpRequest(config, url);
  }

  public testValidateApiKeyFormat(apiKey: string): boolean {
    return (this as any).validateApiKeyFormat(apiKey);
  }

  public testCreateEnhancedError(status: number, message: string, responseData: any) {
    return (this as any).createEnhancedError(status, message, responseData);
  }
}

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock ReadableStream and TextEncoder for streaming tests
global.ReadableStream = class ReadableStream {
  constructor(underlyingSource?: any) {
    this.controller = {
      enqueue: jest.fn(),
      close: jest.fn()
    };
    if (underlyingSource?.start) {
      underlyingSource.start(this.controller);
    }
  }
  
  controller: any;
  
  getReader() {
    const chunks = ['data: {"content":"Hello"}\n\n', 'data: {"content":" world"}\n\n', 'data: {"content":"!","isComplete":true}\n\n'];
    let index = 0;
    
    return {
      read: async () => {
        if (index < chunks.length) {
          const chunk = chunks[index++];
          return {
            done: false,
            value: new TextEncoder().encode(chunk)
          };
        }
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn()
    };
  }
} as any;

global.TextEncoder = class TextEncoder {
  encode(input: string): Uint8Array {
    const bytes = new Uint8Array(input.length);
    for (let i = 0; i < input.length; i++) {
      bytes[i] = input.charCodeAt(i);
    }
    return bytes;
  }
} as any;

global.TextDecoder = class TextDecoder {
  decode(input: Uint8Array): string {
    return String.fromCharCode(...Array.from(input));
  }
} as any;

describe('BaseProvider', () => {
  let provider: TestProvider;
  let originalConsoleLog: any;
  let originalConsoleError: any;

  beforeEach(() => {
    provider = new TestProvider();
    mockFetch.mockClear();
    
    // Mock console methods to avoid noise in tests
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with correct default configuration', () => {
      expect(provider.providerId).toBe('test-provider');
      expect(provider.displayName).toBe('Test Provider');
      expect((provider as any).config.name).toBe('Test Provider');
      expect((provider as any).config.defaultModel).toBe('test-model-1');
      expect((provider as any).config.timeout).toBe(5000);
      expect((provider as any).config.maxRetries).toBe(2);
    });

    test('should apply default timeout and maxRetries if not provided', () => {
      const providerWithDefaults = new (class extends BaseProvider {
        get providerId() { return 'default-test'; }
        get displayName() { return 'Default Test'; }
        get authEndpoint() { return 'test'; }
        get modelsEndpoint() { return 'test'; }
        get completionEndpoint() { return 'test'; }
        protected formatAuthHeaders() { return {}; }
        protected parseAuthResponse() { return { success: true }; }
        protected parseModelsResponse() { return []; }
        protected formatCompletionRequest() { return {}; }
        protected parseCompletionResponse() { return { content: 'test' }; }
        protected parseStreamChunk() { return null; }
      })({ name: 'Test', defaultModel: 'test' });

      expect((providerWithDefaults as any).config.timeout).toBe(60000);
      expect((providerWithDefaults as any).config.maxRetries).toBe(2);
    });
  });

  describe('API Key Management', () => {
    test('should set API key correctly', () => {
      const apiKey = 'test-api-key-123';
      provider.setApiKey(apiKey);
      
      expect((provider as any).apiKey).toBe(apiKey);
    });

    test('should throw error for empty API key', () => {
      expect(() => provider.setApiKey('')).toThrow('API key cannot be empty');
      expect(() => provider.setApiKey('   ')).toThrow('API key cannot be empty');
    });

    test('should clear API key', () => {
      provider.setApiKey('test-key');
      expect((provider as any).apiKey).toBe('test-key');
      
      provider.clearApiKey();
      expect((provider as any).apiKey).toBeNull();
    });

    test('should verify API key presence', () => {
      expect(provider.verifyApiKeyPresence()).toBe(false);
      
      provider.setApiKey('test-key');
      expect(provider.verifyApiKeyPresence()).toBe(true);
      
      provider.clearApiKey();
      expect(provider.verifyApiKeyPresence()).toBe(false);
    });

    test('should validate API key format', () => {
      expect(provider.testValidateApiKeyFormat('valid-key')).toBe(true);
      expect(provider.testValidateApiKeyFormat('short')).toBe(false);
      expect(provider.testValidateApiKeyFormat('')).toBe(false);
    });
  });

  describe('Authentication Testing', () => {
    test('should return error when no API key is set', async () => {
      const result = await provider.testAuthentication();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not set');
      expect(result.errorCode).toBe('NO_API_KEY');
    });

    test('should test authentication successfully', async () => {
      provider.setApiKey('test-key');
      provider.setMockAuthResult({ success: true, models: ['test-model-1'] });
      
      // Mock successful HTTP responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ success: true })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ models: ['test-model-1', 'test-model-2'] })
        } as any);

      const result = await provider.testAuthentication();
      
      expect(result.success).toBe(true);
      expect(result.models).toEqual(['test-model-1', 'test-model-2']);
    });

    test('should handle authentication failure', async () => {
      provider.setApiKey('invalid-key');
      provider.setMockAuthResult({ success: false, error: 'Invalid API key' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' })
      } as any);

      const result = await provider.testAuthentication();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    test.skip('should handle network errors during authentication', async () => {
      provider.setApiKey('test-key');
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.testAuthentication();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.errorCode).toBe('NETWORK_ERROR');
    }, 15000);
  });

  describe('Model Fetching', () => {
    test('should fetch available models', async () => {
      provider.setApiKey('test-key');
      provider.setMockModels(['model-a', 'model-b']);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ models: ['model-a', 'model-b'] })
      } as any);

      const models = await provider.fetchAvailableModels();
      
      expect(models).toEqual(['model-a', 'model-b']);
    });

    test('should throw error when fetching models without API key', async () => {
      await expect(provider.fetchAvailableModels()).rejects.toThrow('API key not set');
    });

    test.skip('should handle HTTP errors when fetching models', async () => {
      provider.setApiKey('test-key');
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      await expect(provider.fetchAvailableModels()).rejects.toThrow('HTTP 404: Not Found');
    }, 15000);
  });

  describe('Response Generation', () => {
    const testMessages: AIMessage[] = [
      { role: 'user', content: 'Hello, how are you?' }
    ];

    test('should generate AI response successfully', async () => {
      provider.setApiKey('test-key');
      provider.setMockCompletionResponse({
        content: 'I am doing well, thank you!',
        usage: { promptTokens: 5, completionTokens: 8, totalTokens: 13 }
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({
          content: 'I am doing well, thank you!',
          usage: { promptTokens: 5, completionTokens: 8, totalTokens: 13 }
        })
      } as any);

      const response = await provider.generateResponse(testMessages);
      
      expect(response.content).toBe('I am doing well, thank you!');
      expect(response.usage?.totalTokens).toBe(13);
    });

    test('should throw error when generating response without API key', async () => {
      await expect(provider.generateResponse(testMessages))
        .rejects.toThrow('API key not set for test-provider');
    });

    test('should validate API key format before generating response', async () => {
      provider.setApiKey('short');
      
      // Mock warning for invalid format
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ content: 'response' })
      } as any);

      await provider.generateResponse(testMessages);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API key format may be invalid')
      );
      
      consoleSpy.mockRestore();
    });

    test('should apply default generation options', async () => {
      provider.setApiKey('valid-test-key');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ content: 'response' })
      } as any);

      await provider.generateResponse(testMessages);
      
      // Verify the request was made with default options
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test-provider.com/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-test-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"maxTokens":1000')
        })
      );
    });
  });

  describe('Streaming Response Generation', () => {
    test('should handle streaming responses', async () => {
      provider.setApiKey('test-key');
      
      const chunks: StreamChunk[] = [];
      const callback: StreamCallback = (chunk) => chunks.push(chunk);
      
      // Mock ReadableStream for streaming response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"content":"Hello"}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"content":" world"}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"content":"!","isComplete":true}\n\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: mockStream
      } as any);

      await provider.generateStreamingResponse(
        [{ role: 'user', content: 'Say hello' }],
        callback
      );
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some(chunk => chunk.isComplete)).toBe(true);
    });

    test('should handle streaming errors gracefully', async () => {
      provider.setApiKey('test-key');
      
      const chunks: StreamChunk[] = [];
      const callback: StreamCallback = (chunk) => chunks.push(chunk);
      
      mockFetch.mockRejectedValueOnce(new Error('Streaming failed'));

      await expect(provider.generateStreamingResponse(
        [{ role: 'user', content: 'test' }],
        callback
      )).rejects.toThrow('Streaming failed');
      
      // Should send error as final chunk
      expect(chunks.some(chunk => 
        chunk.content.includes('Error') && chunk.isComplete
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should create enhanced errors for different HTTP status codes', () => {
      const error401 = provider.testCreateEnhancedError(401, 'Unauthorized', {});
      expect(error401.message).toContain('AUTH_ERROR');
      expect(error401.message).toContain('Invalid API key');

      const error429 = provider.testCreateEnhancedError(429, 'Rate limited', {});
      expect(error429.message).toContain('RATE_LIMIT_ERROR');
      expect(error429.message).toContain('Rate limit exceeded');

      const error500 = provider.testCreateEnhancedError(500, 'Server error', {});
      expect(error500.message).toContain('SERVER_ERROR');
      expect(error500.message).toContain('server error');
    });

    test('should enhance timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const enhanced = (provider as any).enhanceError(timeoutError);
      
      expect(enhanced.message).toContain('TIMEOUT_ERROR');
      expect(enhanced.message).toContain('took too long to respond');
    });

    test('should enhance network errors', () => {
      const networkError = new Error('Failed to fetch');
      const enhanced = (provider as any).enhanceError(networkError);
      
      expect(enhanced.message).toContain('NETWORK_ERROR');
      expect(enhanced.message).toContain('unable to connect');
    });
  });

  describe('Status and Monitoring', () => {
    test('should return correct status information', () => {
      const status = provider.getStatus();
      
      expect(status.providerId).toBe('test-provider');
      expect(status.displayName).toBe('Test Provider');
      expect(status.hasApiKey).toBe(false);
      expect(status.apiKeyLength).toBe(0);
      
      provider.setApiKey('test-key-123');
      const statusWithKey = provider.getStatus();
      
      expect(statusWithKey.hasApiKey).toBe(true);
      expect(statusWithKey.apiKeyLength).toBe(12);
    });

    test('should properly cleanup resources', () => {
      provider.setApiKey('test-key');
      expect((provider as any).apiKey).toBe('test-key');
      
      provider.destroy();
      expect((provider as any).apiKey).toBeNull();
    });
  });

  describe('HTTP Request Handling', () => {
    test.skip('should retry failed requests', async () => {
      provider.setApiKey('test-key');
      
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({ success: true })
        } as any);

      const result = await provider.testMakeHttpRequest(
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-key' }
        },
        'https://api.test.com/test'
      );
      
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 15000);

    test('should not retry 4xx client errors', async () => {
      provider.setApiKey('test-key');
      
      mockFetch.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'));

      await expect(provider.testMakeHttpRequest(
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-key' }
        },
        'https://api.test.com/test'
      )).rejects.toThrow('HTTP 400: Bad Request');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle JSON and text responses', async () => {
      provider.setApiKey('test-key');
      
      // Test JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ test: 'data' }),
        text: () => Promise.resolve('{"test":"data"}')
      } as any);

      const jsonResult = await provider.testMakeHttpRequest(
        { method: 'GET', headers: {} },
        'https://api.test.com/json'
      );
      
      expect(jsonResult.data).toEqual({ test: 'data' });
    });
  });
});