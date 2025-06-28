/**
 * Mock implementations for AI providers
 * Provides deterministic responses for testing
 */

import { jest } from '@jest/globals';
import { 
  BaseProvider, 
  ProviderAuthResult, 
  AIMessage, 
  AIResponse, 
  StreamChunk, 
  StreamCallback 
} from '../../src/core/providers/BaseProvider';

export class MockBaseProvider extends BaseProvider {
  public mockResponses: AIResponse[] = [];
  public mockAuthResult: ProviderAuthResult = { success: true };
  public mockModels: string[] = ['mock-model-1', 'mock-model-2'];
  private responseIndex = 0;
  private _providerId: string;

  constructor(providerId: string = 'mock-provider') {
    super({
      name: 'Mock Provider',
      defaultModel: 'mock-model-1'
    });
    this._providerId = providerId;
  }

  get providerId(): string {
    return this._providerId;
  }

  get displayName(): string {
    return 'Mock Provider';
  }

  get authEndpoint(): string {
    return 'https://api.mock-provider.com/auth';
  }

  get modelsEndpoint(): string {
    return 'https://api.mock-provider.com/models';
  }

  get completionEndpoint(): string {
    return 'https://api.mock-provider.com/completions';
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
    const mockResponse = this.mockResponses[this.responseIndex] || {
      content: 'Mock AI response',
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      }
    };
    
    this.responseIndex = (this.responseIndex + 1) % Math.max(1, this.mockResponses.length);
    return mockResponse;
  }

  protected parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      if (chunk.startsWith('data: ')) {
        const data = JSON.parse(chunk.slice(6));
        return {
          content: data.choices?.[0]?.delta?.content || '',
          isComplete: data.choices?.[0]?.finish_reason !== null,
          finishReason: data.choices?.[0]?.finish_reason || undefined
        };
      }
    } catch (error) {
      // Invalid chunk format
    }
    return null;
  }

  // Test helpers
  setMockAuthResult(result: ProviderAuthResult): void {
    this.mockAuthResult = result;
  }

  setMockModels(models: string[]): void {
    this.mockModels = models;
  }

  addMockResponse(response: AIResponse): void {
    this.mockResponses.push(response);
  }

  resetMockResponses(): void {
    this.mockResponses = [];
    this.responseIndex = 0;
  }

  // Override methods to avoid actual HTTP requests
  async testAuthentication(): Promise<ProviderAuthResult> {
    return this.mockAuthResult;
  }

  async fetchAvailableModels(): Promise<string[]> {
    return this.mockModels;
  }

  async generateResponse(messages: AIMessage[], options: any = {}): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockResponse = this.mockResponses[this.responseIndex] || {
      content: `Mock response to: ${messages[messages.length - 1]?.content || 'unknown message'}`,
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      }
    };
    
    this.responseIndex = (this.responseIndex + 1) % Math.max(1, this.mockResponses.length);
    return mockResponse;
  }

  async generateStreamingResponse(
    messages: AIMessage[], 
    callback: StreamCallback, 
    options: any = {}
  ): Promise<void> {
    const response = await this.generateResponse(messages, options);
    
    // Simulate streaming by splitting response into chunks
    const words = response.content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const chunk: StreamChunk = {
        content: (i === 0 ? '' : ' ') + words[i],
        isComplete: i === words.length - 1,
        finishReason: i === words.length - 1 ? 'stop' : undefined
      };
      
      callback(chunk);
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// Specific provider mocks
export class MockOpenAIProvider extends MockBaseProvider {
  constructor() {
    super('openai');
  }

  get displayName(): string {
    return 'OpenAI (Mock)';
  }

  get authEndpoint(): string {
    return 'https://api.openai.com/v1/models';
  }

  get modelsEndpoint(): string {
    return 'https://api.openai.com/v1/models';
  }

  get completionEndpoint(): string {
    return 'https://api.openai.com/v1/chat/completions';
  }

  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

export class MockAnthropicProvider extends MockBaseProvider {
  constructor() {
    super('anthropic');
  }

  get displayName(): string {
    return 'Anthropic (Mock)';
  }

  get authEndpoint(): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  get modelsEndpoint(): string {
    return 'https://api.anthropic.com/v1/models';
  }

  get completionEndpoint(): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
  }
}

export class MockGoogleProvider extends MockBaseProvider {
  constructor() {
    super('google');
  }

  get displayName(): string {
    return 'Google Gemini (Mock)';
  }

  get authEndpoint(): string {
    return 'https://generativelanguage.googleapis.com/v1/models';
  }

  get modelsEndpoint(): string {
    return 'https://generativelanguage.googleapis.com/v1/models';
  }

  get completionEndpoint(): string {
    return 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';
  }

  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json'
    };
  }
}

// Provider factory for tests
export const createMockProvider = (type: 'openai' | 'anthropic' | 'google' | 'base' = 'base'): MockBaseProvider => {
  switch (type) {
    case 'openai':
      return new MockOpenAIProvider();
    case 'anthropic':
      return new MockAnthropicProvider();
    case 'google':
      return new MockGoogleProvider();
    default:
      return new MockBaseProvider();
  }
};

// Mock ProviderManager for testing
export class MockProviderManager {
  private providers: Map<string, MockBaseProvider> = new Map();
  private currentProviderId: string | null = null;

  addProvider = jest.fn((providerId: string, provider: MockBaseProvider) => {
    this.providers.set(providerId, provider);
    if (!this.currentProviderId) {
      this.currentProviderId = providerId;
    }
  });

  getProvider = jest.fn((providerId: string) => {
    return this.providers.get(providerId);
  });

  getCurrentProvider = jest.fn(() => {
    return this.currentProviderId ? this.providers.get(this.currentProviderId) : null;
  });

  setCurrentProvider = jest.fn((providerId: string) => {
    if (this.providers.has(providerId)) {
      this.currentProviderId = providerId;
      return true;
    }
    return false;
  });

  getStats = jest.fn(() => ({
    total: this.providers.size,
    authenticated: Array.from(this.providers.values()).filter(p => p.verifyApiKeyPresence()).length,
    hasApiKey: Array.from(this.providers.values()).filter(p => !!(p as any).apiKey).length
  }));

  getAllProviderConfigs = jest.fn(() => {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.displayName,
      hasApiKey: !!(provider as any).apiKey
    }));
  });

  getAuthenticatedProviders = jest.fn(() => {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.verifyApiKeyPresence())
      .map(([id, _]) => id);
  });

  // Test helpers
  reset(): void {
    this.providers.clear();
    this.currentProviderId = null;
  }

  setupMockProviders(): void {
    this.addProvider('openai', new MockOpenAIProvider());
    this.addProvider('anthropic', new MockAnthropicProvider());
    this.addProvider('google', new MockGoogleProvider());
    
    // Set API keys for all providers
    this.providers.forEach(provider => {
      provider.setApiKey('mock-api-key-' + provider.providerId);
    });
  }
}