/**
 * OpenAI API provider implementation
 * Handles authentication and model management for OpenAI services
 */

import { BaseProvider, ProviderAuthResult, ProviderConfig, AIMessage, GenerationOptions, AIResponse } from './BaseProvider';

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  organization?: string;  // Optional organization ID
  apiVersion?: string;    // API version (defaults to v1)
}

/**
 * OpenAI API response types
 */
interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

interface OpenAIUserResponse {
  object: string;
  id: string;
  name?: string;
  email?: string;
}

interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  private organization?: string;
  private apiVersion: string;

  constructor(config: OpenAIConfig = { name: 'OpenAI', defaultModel: 'gpt-4' }) {
    super({
      baseUrl: 'https://api.openai.com',
      ...config
    });
    
    this.organization = config.organization;
    this.apiVersion = config.apiVersion || 'v1';
  }

  get providerId(): string {
    return 'openai';
  }

  get displayName(): string {
    return 'OpenAI';
  }

  get authEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/models`;
  }

  get modelsEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/models`;
  }

  get completionEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/chat/completions`;
  }

  /**
   * Set organization ID
   */
  setOrganization(organizationId: string): void {
    this.organization = organizationId;
  }

  /**
   * Format authentication headers for OpenAI API
   */
  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Obsius-AI-Agent/1.0'
    };

    // Add organization header if specified
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  /**
   * Parse authentication response from OpenAI
   */
  protected parseAuthResponse(response: any): ProviderAuthResult {
    try {
      // OpenAI models endpoint returns list of models if auth is successful
      if (response.object === 'list' && Array.isArray(response.data)) {
        const models = response.data
          .filter((model: any) => model.object === 'model')
          .map((model: any) => model.id)
          .sort();

        return {
          success: true,
          models,
          user: {
            id: 'authenticated' // OpenAI doesn't provide user info in models endpoint
          }
        };
      }

      // Handle error response
      if (response.error) {
        const error = response as OpenAIError;
        return {
          success: false,
          error: error.error.message,
          errorCode: error.error.code || error.error.type
        };
      }

      return {
        success: false,
        error: 'Unexpected response format',
        errorCode: 'INVALID_RESPONSE'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'PARSE_ERROR'
      };
    }
  }

  /**
   * Parse models response from OpenAI
   */
  protected parseModelsResponse(response: any): string[] {
    try {
      if (response.object === 'list' && Array.isArray(response.data)) {
        return response.data
          .filter((model: any) => model.object === 'model')
          .map((model: any) => model.id)
          .sort();
      }
      return [];
    } catch (error) {
      console.error('Failed to parse OpenAI models response:', error);
      return [];
    }
  }

  /**
   * Validate OpenAI API key format
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return apiKey.startsWith('sk-') && apiKey.length >= 20;
  }

  /**
   * Test specific OpenAI functionality
   */
  async testSpecificFeatures(): Promise<{
    modelsAccess: boolean;
    chatCompletion: boolean;
    organization?: string;
  }> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const results = {
      modelsAccess: false,
      chatCompletion: false,
      organization: this.organization
    };

    try {
      // Test models access
      const models = await this.fetchAvailableModels();
      results.modelsAccess = models.length > 0;

      // Test a simple chat completion
      const chatResponse = await this.testChatCompletion();
      results.chatCompletion = chatResponse;

    } catch (error) {
      console.error('OpenAI specific tests failed:', error);
    }

    return results;
  }

  /**
   * Test chat completion functionality
   */
  private async testChatCompletion(): Promise<boolean> {
    try {
      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: this.formatAuthHeaders(this.apiKey!),
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'Say "test" if you can hear me.' }
          ],
          max_tokens: 10,
          temperature: 0
        }),
        timeout: this.config.timeout
      }, `${this.config.baseUrl}/${this.apiVersion}/chat/completions`);

      return response.ok;
    } catch (error) {
      console.error('Chat completion test failed:', error);
      return false;
    }
  }

  /**
   * Get available models with categories
   */
  async getModelsByCategory(): Promise<{
    gpt4: string[];
    gpt35: string[];
    embedding: string[];
    other: string[];
  }> {
    const models = await this.fetchAvailableModels();
    
    const categorized = {
      gpt4: models.filter(m => m.includes('gpt-4')),
      gpt35: models.filter(m => m.includes('gpt-3.5')),
      embedding: models.filter(m => m.includes('embedding')),
      other: models.filter(m => 
        !m.includes('gpt-4') && 
        !m.includes('gpt-3.5') && 
        !m.includes('embedding')
      )
    };

    return categorized;
  }

  /**
   * Get pricing estimate for model
   */
  getPricingInfo(modelId: string): {
    inputPrice?: number;    // per 1k tokens
    outputPrice?: number;   // per 1k tokens
    currency: string;
  } {
    // Approximate pricing as of 2024 (in USD per 1k tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'text-embedding-ada-002': { input: 0.0001, output: 0 }
    };

    const modelPricing = pricing[modelId];
    if (modelPricing) {
      return {
        inputPrice: modelPricing.input,
        outputPrice: modelPricing.output,
        currency: 'USD'
      };
    }

    return { currency: 'USD' };
  }

  /**
   * Format completion request for OpenAI API
   */
  protected formatCompletionRequest(messages: AIMessage[], options: GenerationOptions): any {
    const request: any = {
      model: this.config.defaultModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7
    };

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      request.tools = options.tools;
      request.tool_choice = 'auto';
    }

    // Add streaming if requested
    if (options.stream) {
      request.stream = true;
    }

    return request;
  }

  /**
   * Parse completion response from OpenAI
   */
  protected parseCompletionResponse(response: any): AIResponse {
    try {
      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];
        const message = choice.message;

        const aiResponse: AIResponse = {
          content: message.content || '',
          finishReason: choice.finish_reason
        };

        // Add usage information if available
        if (response.usage) {
          aiResponse.usage = {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          };
        }

        // Add tool calls if present
        if (message.tool_calls && message.tool_calls.length > 0) {
          aiResponse.toolCalls = message.tool_calls;
        }

        return aiResponse;
      }

      throw new Error('No choices in response');
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract detailed error information from OpenAI response
   */
  protected extractErrorMessage(response: any): string {
    if (response.error) {
      const error = response.error;
      let message = error.message || 'Unknown OpenAI error';
      
      if (error.type) {
        message += ` (${error.type})`;
      }
      
      if (error.code) {
        message += ` [${error.code}]`;
      }
      
      return message;
    }
    
    return super.extractErrorMessage(response);
  }
}