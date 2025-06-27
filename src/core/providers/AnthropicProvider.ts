/**
 * Anthropic Claude API provider implementation
 * Handles authentication and model management for Claude services
 */

import { BaseProvider, ProviderAuthResult, ProviderConfig, AIMessage, GenerationOptions, AIResponse, StreamChunk } from './BaseProvider';

/**
 * Anthropic API configuration
 */
export interface AnthropicConfig extends ProviderConfig {
  apiVersion?: string;    // API version (defaults to 2023-06-01)
}

/**
 * Anthropic API response types
 */
interface AnthropicError {
  type: string;
  message: string;
  details?: any;
}

interface AnthropicErrorResponse {
  error: AnthropicError;
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  private apiVersion: string;

  constructor(config: AnthropicConfig = { name: 'Anthropic Claude', defaultModel: 'claude-3-sonnet-20240229' }) {
    super({
      baseUrl: 'https://api.anthropic.com',
      ...config
    });
    
    this.apiVersion = config.apiVersion || '2023-06-01';
  }

  get providerId(): string {
    return 'anthropic';
  }

  get displayName(): string {
    return 'Anthropic Claude';
  }

  get authEndpoint(): string {
    // Anthropic doesn't have a dedicated auth endpoint, we'll use messages endpoint for testing
    return `${this.config.baseUrl}/v1/messages`;
  }

  get modelsEndpoint(): string {
    // Anthropic doesn't have a models endpoint, we'll return known models
    return `${this.config.baseUrl}/v1/messages`;
  }

  get completionEndpoint(): string {
    return `${this.config.baseUrl}/v1/messages`;
  }

  /**
   * Format authentication headers for Anthropic API
   */
  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': this.apiVersion,
      'Content-Type': 'application/json',
      'User-Agent': 'Obsius-AI-Agent/1.0'
    };
  }

  /**
   * Parse authentication response from Anthropic
   */
  protected parseAuthResponse(response: any): ProviderAuthResult {
    try {
      // For Anthropic, we test with a minimal message request
      // Success means we get a proper response or a valid error
      if (response.type === 'message' || response.content) {
        return {
          success: true,
          models: this.getKnownModels(),
          user: {
            id: 'authenticated' // Anthropic doesn't provide user info in messages endpoint
          }
        };
      }

      // Handle error response
      if (response.error) {
        const error = response as AnthropicErrorResponse;
        return {
          success: false,
          error: error.error.message,
          errorCode: error.error.type
        };
      }

      // If we get here, the request structure is correct but may be an expected error
      // for our test message (like invalid message format), which means auth worked
      if (response.type && response.type.includes('error')) {
        // This is likely a validation error, not an auth error
        return {
          success: true,
          models: this.getKnownModels(),
          user: {
            id: 'authenticated'
          }
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
   * Parse models response (Anthropic doesn't have models endpoint)
   */
  protected parseModelsResponse(response: any): string[] {
    // Return known Claude models since Anthropic doesn't have a models endpoint
    return this.getKnownModels();
  }

  /**
   * Get known Claude models
   */
  private getKnownModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }

  /**
   * Validate Anthropic API key format
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    // Anthropic API keys start with 'sk-ant-' and are longer
    return apiKey.startsWith('sk-ant-') && apiKey.length >= 20;
  }

  /**
   * Test authentication with a minimal message request
   */
  protected async makeAuthRequest(): Promise<ProviderAuthResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not set',
        errorCode: 'NO_API_KEY'
      };
    }

    try {
      // Make a minimal test request to validate the API key
      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: this.formatAuthHeaders(this.apiKey),
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [
            { role: 'user', content: 'Hi' }
          ]
        }),
        timeout: this.config.timeout
      }, this.authEndpoint);

      // Any successful response (including error responses about message format)
      // indicates that authentication worked
      if (response.ok || response.status === 400) {
        return {
          success: true,
          models: this.getKnownModels(),
          user: {
            id: 'authenticated'
          }
        };
      }

      // Handle authentication errors
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key',
          errorCode: 'INVALID_API_KEY'
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'Access forbidden - check API key permissions',
          errorCode: 'FORBIDDEN'
        };
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorCode: `HTTP_${response.status}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Format completion request for Anthropic API
   */
  protected formatCompletionRequest(messages: AIMessage[], options: GenerationOptions): any {
    // Convert system messages to system parameter
    const systemMessage = messages.find(msg => msg.role === 'system');
    const conversationMessages = messages.filter(msg => msg.role !== 'system');

    const request: any = {
      model: this.config.defaultModel,
      max_tokens: options.maxTokens || 1000,
      messages: conversationMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    // Add system prompt if present
    if (systemMessage) {
      request.system = systemMessage.content;
    }

    // Add temperature if specified
    if (options.temperature !== undefined) {
      request.temperature = options.temperature;
    }

    // Add tools if provided (Anthropic format)
    if (options.tools && options.tools.length > 0) {
      request.tools = options.tools.map((tool: any) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters
      }));
    }

    return request;
  }

  /**
   * Parse completion response from Anthropic
   */
  protected parseCompletionResponse(response: any): AIResponse {
    try {
      if (response.content && Array.isArray(response.content)) {
        const textContent = response.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('');

        const aiResponse: AIResponse = {
          content: textContent,
          finishReason: response.stop_reason
        };

        // Add usage information if available
        if (response.usage) {
          aiResponse.usage = {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
          };
        }

        // Handle tool calls (Claude format)
        const toolCalls = response.content.filter((item: any) => item.type === 'tool_use');
        if (toolCalls.length > 0) {
          aiResponse.toolCalls = toolCalls.map((call: any) => ({
            function: {
              name: call.name,
              arguments: JSON.stringify(call.input)
            }
          }));
        }

        return aiResponse;
      }

      throw new Error('No content in response');
    } catch (error) {
      throw new Error(`Failed to parse Anthropic response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse streaming response chunk from Anthropic
   */
  protected parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      // Anthropic streaming format: "event: message_delta\ndata: {json}\n"
      const lines = chunk.split('\n');
      let eventType = '';
      let data = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          data = line.slice(6).trim();
        }
      }

      if (!data) return null;

      const parsedData = JSON.parse(data);

      // Handle different event types
      if (eventType === 'content_block_delta' && parsedData.delta) {
        return {
          content: parsedData.delta.text || '',
          isComplete: false
        };
      }

      if (eventType === 'message_stop' || eventType === 'content_block_stop') {
        return {
          content: '',
          isComplete: true,
          finishReason: 'stop'
        };
      }

      // Handle usage information (usually in message_delta)
      if (eventType === 'message_delta' && parsedData.usage) {
        return {
          content: '',
          isComplete: false,
          usage: {
            promptTokens: parsedData.usage.input_tokens || 0,
            completionTokens: parsedData.usage.output_tokens || 0,
            totalTokens: (parsedData.usage.input_tokens || 0) + (parsedData.usage.output_tokens || 0)
          }
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse Anthropic stream chunk:', error);
      return null;
    }
  }

  /**
   * Test specific Claude functionality
   */
  async testSpecificFeatures(): Promise<{
    messagesAccess: boolean;
    modelSupport: Record<string, boolean>;
  }> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const results = {
      messagesAccess: false,
      modelSupport: {} as Record<string, boolean>
    };

    try {
      // Test basic messages access
      const authResult = await this.makeAuthRequest();
      results.messagesAccess = authResult.success;

      // Test individual models
      const testModels = ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'];
      
      for (const model of testModels) {
        try {
          const modelTest = await this.testModelAccess(model);
          results.modelSupport[model] = modelTest;
        } catch (error) {
          results.modelSupport[model] = false;
        }
      }

    } catch (error) {
      console.error('Anthropic specific tests failed:', error);
    }

    return results;
  }

  /**
   * Test access to a specific model
   */
  private async testModelAccess(model: string): Promise<boolean> {
    try {
      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: this.formatAuthHeaders(this.apiKey!),
        body: JSON.stringify({
          model: model,
          max_tokens: 1,
          messages: [
            { role: 'user', content: 'Test' }
          ]
        }),
        timeout: this.config.timeout
      }, `${this.config.baseUrl}/v1/messages`);

      // Both 200 and 400 indicate the model is accessible
      // 400 might be due to our minimal test message format
      return response.ok || response.status === 400;
    } catch (error) {
      console.error(`Model ${model} test failed:`, error);
      return false;
    }
  }

  /**
   * Get model categories
   */
  getModelsByCategory(): {
    claude3: string[];
    claude2: string[];
    instant: string[];
  } {
    const models = this.getKnownModels();
    
    return {
      claude3: models.filter(m => m.includes('claude-3')),
      claude2: models.filter(m => m.includes('claude-2')),
      instant: models.filter(m => m.includes('instant'))
    };
  }

  /**
   * Get pricing information for Claude models
   */
  getPricingInfo(modelId: string): {
    inputPrice?: number;    // per 1k tokens
    outputPrice?: number;   // per 1k tokens
    currency: string;
  } {
    // Approximate pricing as of 2024 (in USD per 1k tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      'claude-2.1': { input: 0.008, output: 0.024 },
      'claude-2.0': { input: 0.008, output: 0.024 },
      'claude-instant-1.2': { input: 0.0008, output: 0.0024 }
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
   * Extract detailed error information from Anthropic response
   */
  protected extractErrorMessage(response: any): string {
    if (response.error) {
      const error = response.error;
      let message = error.message || 'Unknown Anthropic error';
      
      if (error.type) {
        message += ` (${error.type})`;
      }
      
      return message;
    }
    
    return super.extractErrorMessage(response);
  }

  /**
   * Set API version
   */
  setApiVersion(version: string): void {
    this.apiVersion = version;
  }

  /**
   * Get current API version
   */
  getApiVersion(): string {
    return this.apiVersion;
  }
}