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

  constructor(config: GoogleConfig = { name: 'Google AI', defaultModel: 'gemini-1.5-flash' }) {
    super({
      baseUrl: 'https://generativelanguage.googleapis.com',
      ...config
    });
    
    this.apiVersion = config.apiVersion || 'v1beta';
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
    console.log('🚀 GoogleProvider generateResponse called');
    
    if (!this.apiKey) {
      console.error('❌ GoogleProvider: API key not set');
      throw new Error('API key not set');
    }

    try {
      console.log('🔄 Formatting request for Google AI...');
      const requestBody = this.formatCompletionRequest(messages, {
        maxTokens: 1000,
        temperature: 0.7,
        ...options
      });

      const urlWithKey = this.addApiKeyToUrl(this.completionEndpoint);
      console.log('🌐 Request URL:', urlWithKey.replace(/key=[^&]+/, 'key=***'));

      console.log('📤 Making HTTP request to Google AI...');
      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: {
          ...this.formatAuthHeaders(this.apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: this.config.timeout || 30000
      }, urlWithKey);

      console.log('📥 Google AI response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('❌ Google AI HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        const errorMsg = this.extractErrorMessage(response.data);
        throw new Error(`Google AI API error [${response.status}]: ${errorMsg}`);
      }

      console.log('✅ Parsing Google AI response...');
      const parsedResponse = this.parseCompletionResponse(response.data);
      console.log('📋 Parsed response:', {
        contentLength: parsedResponse.content?.length || 0,
        hasUsage: !!parsedResponse.usage,
        finishReason: parsedResponse.finishReason
      });

      return parsedResponse;
    } catch (error) {
      console.error(`❌ GoogleProvider generateResponse failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        providerId: this.providerId
      });
      throw error;
    }
  }

  /**
   * Format completion request for Google AI API
   */
  protected formatCompletionRequest(messages: AIMessage[], options: GenerationOptions): any {
    console.log('🔍 GoogleProvider formatCompletionRequest called with:', { messageCount: messages.length, options });
    
    // Convert messages to Google AI format
    const contents = [];
    let systemContent = '';
    
    // Extract system message first
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      systemContent = systemMessage.content;
      console.log('📋 System message found (length: ' + systemContent.length + ')');
      console.log('📋 System message preview:', systemContent.substring(0, 200) + '...');
      
      // Check if it contains language instructions
      const hasJapanese = systemContent.includes('日本語') || systemContent.includes('絶対言語指示');
      const hasEnglish = systemContent.includes('CRITICAL LANGUAGE INSTRUCTION');
      console.log('🔍 Language detection:', { hasJapanese, hasEnglish });
    }
    
    // Process non-system messages
    for (const message of messages) {
      if (message.role === 'system') {
        continue; // Skip system messages, already processed
      }
      
      const content = {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: message.content
        }]
      };
      
      contents.push(content);
    }

    // If we have system content and user messages, prepend system to first user message
    if (systemContent && contents.length > 0) {
      const firstUserIndex = contents.findIndex(c => c.role === 'user');
      if (firstUserIndex !== -1) {
        const originalText = contents[firstUserIndex].parts[0].text;
        // Strengthen the language instruction for Google AI
        const strengthenedSystemContent = this.strengthenLanguageInstruction(systemContent);
        contents[firstUserIndex].parts[0].text = `${strengthenedSystemContent}\n\n${originalText}`;
        console.log('✅ System message merged with first user message (language instruction strengthened)');
      } else {
        // No user message found, add system as user message
        const strengthenedSystemContent = this.strengthenLanguageInstruction(systemContent);
        contents.unshift({
          role: 'user',
          parts: [{ text: strengthenedSystemContent }]
        });
        console.log('✅ System message added as first user message (language instruction strengthened)');
      }
    }

    // Ensure we have at least one message
    if (contents.length === 0) {
      console.warn('⚠️ No contents after processing, adding default message');
      contents.push({
        role: 'user',
        parts: [{ text: 'Hello' }]
      });
    }

    const request: any = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1000,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
      }
    };

    // Add safety settings
    request.safetySettings = this.getDefaultSafetySettings();

    // Add tool support if tools are provided
    if (options.tools && options.tools.length > 0) {
      console.log('🔧 Adding tools to Google AI request:', options.tools.length);
      request.tools = this.formatToolsForGoogleAI(options.tools);
    }

    console.log('📤 Final Google AI request:', {
      contentsCount: request.contents.length,
      generationConfig: request.generationConfig,
      hasSafetySettings: !!request.safetySettings,
      hasTools: !!request.tools
    });
    
    // Log the actual message content being sent (first message only)
    if (request.contents.length > 0) {
      const firstMessage = request.contents[0];
      console.log('📤 First message content preview:', firstMessage.parts[0].text.substring(0, 300) + '...');
    }

    return request;
  }

  /**
   * Parse completion response from Google AI
   */
  protected parseCompletionResponse(response: any): AIResponse {
    console.log('🔍 Parsing Google AI response:', JSON.stringify(response, null, 2));
    
    try {
      // Check for error in response
      if (response.error) {
        console.error('❌ Google AI API returned error:', response.error);
        throw new Error(`Google AI API error: ${response.error.message || 'Unknown error'}`);
      }

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        console.log('📋 Processing candidate:', candidate);
        
        // Check for safety filter blocks
        if (candidate.finishReason === 'SAFETY') {
          console.warn('⚠️ Content was blocked by safety filters');
          throw new Error('Content was blocked by Google AI safety filters. Please modify your request.');
        }
        
        const content = candidate.content;

        let textContent = '';
        if (content && content.parts) {
          textContent = content.parts
            .filter((part: any) => part.text)
            .map((part: any) => part.text)
            .join('');
        }

        console.log('📝 Extracted text content length:', textContent.length);

        const aiResponse: AIResponse = {
          content: textContent,
          finishReason: candidate.finishReason
        };

        // Check for function calls in the response
        if (content && content.parts) {
          const functionCalls = content.parts.filter((part: any) => part.functionCall);
          if (functionCalls.length > 0) {
            console.log('🔧 Function calls detected:', functionCalls.length);
            aiResponse.toolCalls = functionCalls.map((part: any) => ({
              id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'function',
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {})
              }
            }));
          }
        }

        // Add usage information if available
        if (response.usageMetadata) {
          aiResponse.usage = {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0
          };
          console.log('📊 Usage metadata:', aiResponse.usage);
        }

        return aiResponse;
      }

      // Handle case where no candidates are returned
      console.error('❌ No candidates in Google AI response');
      throw new Error('Google AI returned no response candidates. This may be due to content filtering or API issues.');
    } catch (error) {
      console.error('❌ Failed to parse Google AI response:', error);
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
   * Format tools for Google AI API
   */
  private formatToolsForGoogleAI(tools: any[]): any {
    try {
      const functionDeclarations = tools.map(tool => ({
        name: tool.function?.name || tool.name,
        description: tool.function?.description || tool.description,
        parameters: tool.function?.parameters || tool.parameters
      }));

      return [{
        functionDeclarations
      }];
    } catch (error) {
      console.warn('Failed to format tools for Google AI:', error);
      return [];
    }
  }

  /**
   * Strengthen language instruction for Google AI to ensure proper response language
   */
  private strengthenLanguageInstruction(systemContent: string): string {
    // Check if this appears to be a Japanese system prompt
    const isJapaneseContext = systemContent.includes('日本語') || 
                             systemContent.includes('私は') || 
                             systemContent.includes('絶対言語指示') ||
                             systemContent.includes('重要: 常に日本語で応答');
    
    if (isJapaneseContext) {
      // Add extremely strong language reinforcements for Japanese with multiple strategies
      const strengthenedContent = [
        '=== GOOGLE AI 専用言語設定 ===',
        '応答言語: 日本語のみ',
        '禁止言語: 英語、その他すべての言語',
        '指示: どんな質問でも必ず日本語で回答する',
        '',
        '=== CRITICAL LANGUAGE OVERRIDE FOR GOOGLE AI ===',
        'RESPONSE_LANGUAGE: JAPANESE_ONLY',
        'FORBIDDEN_LANGUAGES: ENGLISH, ALL_OTHER_LANGUAGES', 
        'INSTRUCTION: ALWAYS_RESPOND_IN_JAPANESE_NO_MATTER_WHAT',
        '',
        systemContent,
        '',
        '【Google AI向け最終確認】',
        '- あなたの名前: Obsius（オブシウス）',
        '- 応答言語: 日本語のみ',
        '- 英語応答: 絶対禁止',
        '- 言語能力: 日本語で完全に応答可能',
        '- 「英語しか対応できない」という回答は不正確なので禁止',
        '',
        'If you see this message, you MUST respond in Japanese. Do not claim you can only respond in English.',
        'これが見えたら、日本語で応答してください。英語しか対応できないという回答はしないでください。'
      ].join('\n');
      
      console.log('🇯🇵 Added STRONG Japanese language reinforcement to system prompt');
      return strengthenedContent;
    } else if (systemContent.includes('English') || systemContent.includes('CRITICAL LANGUAGE INSTRUCTION')) {
      // Add English reinforcement if needed
      const strengthenedContent = [
        '=== GOOGLE AI LANGUAGE SETTING ===',
        'RESPONSE_LANGUAGE: ENGLISH_ONLY',
        'FORBIDDEN_LANGUAGES: JAPANESE, ALL_OTHER_LANGUAGES',
        'INSTRUCTION: ALWAYS_RESPOND_IN_ENGLISH',
        '',
        systemContent,
        '',
        'Final confirmation: You must respond in English only.',
        'Do not use any other languages in your responses.'
      ].join('\n');
      
      console.log('🇺🇸 Added STRONG English language reinforcement to system prompt');
      return strengthenedContent;
    }
    
    return systemContent;
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