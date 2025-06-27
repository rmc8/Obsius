/**
 * Google AI (Gemini) API provider implementation
 * Handles authentication and model management for Google AI services
 */

import { BaseProvider, ProviderAuthResult, ProviderConfig, AIMessage, GenerationOptions, AIResponse, StreamChunk } from './BaseProvider';

/**
 * Google AI API configuration
 */
export interface GoogleConfig extends ProviderConfig {
  apiVersion?: string;    // API version (defaults to v1)
}

/**
 * Google AI API response types
 */
interface GoogleAIModelsResponse {
  models: Array<{
    name: string;
    displayName: string;
    description?: string;
    supportedGenerationMethods: string[];
  }>;
}

interface GoogleAIError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: any[];
  };
}

interface GoogleAIGenerateResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: GoogleAIError['error'];
}

/**
 * Google AI provider implementation
 */
export class GoogleProvider extends BaseProvider {
  private apiVersion: string;

  constructor(config: GoogleConfig = { name: 'Google AI', defaultModel: 'gemini-pro' }) {
    super({
      baseUrl: 'https://generativelanguage.googleapis.com',
      ...config
    });
    
    this.apiVersion = config.apiVersion || 'v1';
  }

  get providerId(): string {
    return 'google';
  }

  get displayName(): string {
    return 'Google AI (Gemini)';
  }

  get authEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/models`;
  }

  get modelsEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/models`;
  }

  get completionEndpoint(): string {
    return `${this.config.baseUrl}/${this.apiVersion}/models/${this.config.defaultModel}:generateContent`;
  }

  /**
   * Format authentication headers for Google AI API
   */
  protected formatAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Obsius-AI-Agent/1.0'
      // Google AI uses API key as query parameter, not header
    };
  }

  /**
   * Add API key as query parameter for Google AI
   */
  private addApiKeyToUrl(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${this.apiKey}`;
  }

  /**
   * Parse authentication response from Google AI
   */
  protected parseAuthResponse(response: any): ProviderAuthResult {
    try {
      // Google AI models endpoint returns list of models if auth is successful
      if (response.models && Array.isArray(response.models)) {
        const models = response.models
          .filter((model: any) => model.name && model.supportedGenerationMethods?.includes('generateContent'))
          .map((model: any) => model.name.split('/').pop()) // Extract model name from full path
          .sort();

        return {
          success: true,
          models,
          user: {
            id: 'authenticated' // Google AI doesn't provide user info in models endpoint
          }
        };
      }

      // Handle error response
      if (response.error) {
        const error = response as GoogleAIError;
        return {
          success: false,
          error: error.error.message,
          errorCode: error.error.status || `CODE_${error.error.code}`
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
   * Parse models response from Google AI
   */
  protected parseModelsResponse(response: any): string[] {
    try {
      if (response.models && Array.isArray(response.models)) {
        return response.models
          .filter((model: any) => model.name && model.supportedGenerationMethods?.includes('generateContent'))
          .map((model: any) => model.name.split('/').pop())
          .sort();
      }
      return [];
    } catch (error) {
      console.error('Failed to parse Google AI models response:', error);
      return [];
    }
  }

  /**
   * Override makeAuthRequest to handle Google AI's API key in URL
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
      const urlWithKey = this.addApiKeyToUrl(this.authEndpoint);
      
      const response = await this.makeHttpRequest({
        method: 'GET',
        headers: this.formatAuthHeaders(this.apiKey),
        timeout: this.config.timeout
      }, urlWithKey);

      if (!response.ok) {
        if (response.status === 403) {
          return {
            success: false,
            error: 'Invalid API key or insufficient permissions',
            errorCode: 'INVALID_API_KEY'
          };
        }
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          errorCode: `HTTP_${response.status}`
        };
      }

      return this.parseAuthResponse(response.data);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Override fetchAvailableModels to handle API key in URL
   */
  async fetchAvailableModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const urlWithKey = this.addApiKeyToUrl(this.modelsEndpoint);
      
      const response = await this.makeHttpRequest({
        method: 'GET',
        headers: this.formatAuthHeaders(this.apiKey),
        timeout: this.config.timeout
      }, urlWithKey);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return this.parseModelsResponse(response.data);
    } catch (error) {
      console.error(`Failed to fetch models from ${this.providerId}:`, error);
      throw error;
    }
  }

  /**
   * Validate Google AI API key format
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    // Google AI API keys are typically 39 characters long and alphanumeric
    return apiKey.length >= 20 && /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  /**
   * Override generateResponse to handle API key in URL
   */
  async generateResponse(messages: AIMessage[], options: GenerationOptions = {}): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const requestBody = this.formatCompletionRequest(messages, {
        maxTokens: 1000,
        temperature: 0.7,
        ...options
      });

      const urlWithKey = this.addApiKeyToUrl(this.completionEndpoint);

      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: {
          ...this.formatAuthHeaders(this.apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: this.config.timeout
      }, urlWithKey);

      if (!response.ok) {
        const errorMsg = this.extractErrorMessage(response.data);
        throw new Error(`HTTP ${response.status}: ${errorMsg}`);
      }

      return this.parseCompletionResponse(response.data);
    } catch (error) {
      console.error(`Failed to generate response from ${this.providerId}:`, error);
      throw error;
    }
  }

  /**
   * Format completion request for Google AI API
   */
  protected formatCompletionRequest(messages: AIMessage[], options: GenerationOptions): any {
    // Convert messages to Google AI format
    const contents = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Google AI doesn't have system role, so we'll prepend it to the first user message
        continue;
      }
      
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: message.content
        }]
      });
    }

    // Add system message as first user message if present
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = `${systemMessage.content}\n\n${contents[0].parts[0].text}`;
    }

    const request: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1000
      }
    };

    // Add temperature if specified
    if (options.temperature !== undefined) {
      request.generationConfig.temperature = options.temperature;
    }

    // Google AI tools format is different - would need more complex implementation
    // For now, skip tools support

    return request;
  }

  /**
   * Parse completion response from Google AI
   */
  protected parseCompletionResponse(response: any): AIResponse {
    try {
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        const content = candidate.content;

        let textContent = '';
        if (content && content.parts) {
          textContent = content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }

        const aiResponse: AIResponse = {
          content: textContent,
          finishReason: candidate.finishReason
        };

        // Add usage information if available
        if (response.usageMetadata) {
          aiResponse.usage = {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0
          };
        }

        return aiResponse;
      }

      throw new Error('No candidates in response');
    } catch (error) {
      throw new Error(`Failed to parse Google AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse streaming response chunk from Google AI
   */
  protected parseStreamChunk(chunk: string): StreamChunk | null {
    try {
      // Google AI streaming format: JSON objects separated by newlines
      if (!chunk.trim()) return null;

      const data = JSON.parse(chunk);

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        const content = candidate.content;

        let textContent = '';
        if (content && content.parts) {
          textContent = content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }

        const isComplete = candidate.finishReason !== null && candidate.finishReason !== undefined;

        const streamChunk: StreamChunk = {
          content: textContent,
          isComplete,
          finishReason: candidate.finishReason
        };

        // Add usage information if available
        if (data.usageMetadata) {
          streamChunk.usage = {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0
          };
        }

        return streamChunk;
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse Google AI stream chunk:', error);
      return null;
    }
  }

  /**
   * Test specific Google AI functionality
   */
  async testSpecificFeatures(): Promise<{
    modelsAccess: boolean;
    generateContent: boolean;
    availableModels: string[];
  }> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const results = {
      modelsAccess: false,
      generateContent: false,
      availableModels: [] as string[]
    };

    try {
      // Test models access
      const models = await this.fetchAvailableModels();
      results.modelsAccess = models.length > 0;
      results.availableModels = models;

      // Test content generation
      if (models.length > 0) {
        const testModel = models.find(m => m.includes('gemini')) || models[0];
        const generateTest = await this.testContentGeneration(testModel);
        results.generateContent = generateTest;
      }

    } catch (error) {
      console.error('Google AI specific tests failed:', error);
    }

    return results;
  }

  /**
   * Test content generation functionality
   */
  private async testContentGeneration(model: string): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/${this.apiVersion}/models/${model}:generateContent`;
      const urlWithKey = this.addApiKeyToUrl(url);
      
      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: this.formatAuthHeaders(this.apiKey!),
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "test" if you can understand this message.'
            }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0
          }
        }),
        timeout: this.config.timeout
      }, urlWithKey);

      return response.ok;
    } catch (error) {
      console.error('Content generation test failed:', error);
      return false;
    }
  }

  /**
   * Get model categories
   */
  async getModelsByCategory(): Promise<{
    gemini: string[];
    palm: string[];
    other: string[];
  }> {
    const models = await this.fetchAvailableModels();
    
    return {
      gemini: models.filter(m => m.includes('gemini')),
      palm: models.filter(m => m.includes('palm')),
      other: models.filter(m => !m.includes('gemini') && !m.includes('palm'))
    };
  }

  /**
   * Get pricing information for Google AI models
   */
  getPricingInfo(modelId: string): {
    inputPrice?: number;    // per 1k characters for Google AI
    outputPrice?: number;   // per 1k characters for Google AI
    currency: string;
    unit: string;
  } {
    // Google AI pricing is per 1k characters, not tokens
    // Approximate pricing as of 2024 (in USD per 1k characters)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-pro': { input: 0.0005, output: 0.0015 },
      'gemini-pro-vision': { input: 0.0025, output: 0.0075 },
      'palm-2': { input: 0.0005, output: 0.0015 }
    };

    const modelPricing = pricing[modelId];
    if (modelPricing) {
      return {
        inputPrice: modelPricing.input,
        outputPrice: modelPricing.output,
        currency: 'USD',
        unit: 'per 1k characters'
      };
    }

    return { 
      currency: 'USD',
      unit: 'per 1k characters'
    };
  }

  /**
   * Extract detailed error information from Google AI response
   */
  protected extractErrorMessage(response: any): string {
    if (response.error) {
      const error = response.error;
      let message = error.message || 'Unknown Google AI error';
      
      if (error.status) {
        message += ` (${error.status})`;
      }
      
      if (error.code) {
        message += ` [${error.code}]`;
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

  /**
   * Get safety settings for Google AI content generation
   */
  getDefaultSafetySettings() {
    return [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];
  }
}