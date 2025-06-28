/**
 * Base class for AI provider authentication and management
 * Provides common functionality for all AI provider integrations
 */

/**
 * Authentication result from provider
 */
export interface ProviderAuthResult {
  success: boolean;
  models?: string[];
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
  usage?: {
    limit?: number;
    used?: number;
    remaining?: number;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  baseUrl?: string;
  defaultModel: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * AI message format
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Generation options
 */
export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
}

/**
 * AI response format
 */
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
  finishReason?: string;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
  finishReason?: string;
}

/**
 * Streaming response callback
 */
export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * HTTP request configuration
 */
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * HTTP response interface
 */
interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  data: any;
}

/**
 * Abstract base class for AI provider authentication
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected apiKey: string | null = null;

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000,      // 60 seconds default (AI responses can be slow)
      maxRetries: 2,       // 2 retries default
      ...config
    };
  }

  // Abstract methods that must be implemented by concrete providers
  abstract get providerId(): string;
  abstract get displayName(): string;
  abstract get authEndpoint(): string;
  abstract get modelsEndpoint(): string;
  abstract get completionEndpoint(): string;
  
  protected abstract formatAuthHeaders(apiKey: string): Record<string, string>;
  protected abstract parseAuthResponse(response: any): ProviderAuthResult;
  protected abstract parseModelsResponse(response: any): string[];
  protected abstract formatCompletionRequest(messages: AIMessage[], options: GenerationOptions): any;
  protected abstract parseCompletionResponse(response: any): AIResponse;
  protected abstract parseStreamChunk(chunk: string): StreamChunk | null;

  /**
   * Set API key for authentication with enhanced tracking
   */
  setApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    
    const previousKey = this.apiKey;
    this.apiKey = apiKey.trim();
    
    // Enhanced logging for debugging API key lifecycle
    console.log(`🔐 [${this.providerId}] API key set: ${this.apiKey ? 'SUCCESS' : 'FAILED'} (${this.apiKey?.length || 0} chars)`);
    
    if (previousKey && previousKey !== this.apiKey) {
      console.log(`🔄 [${this.providerId}] API key changed from ${previousKey.length} to ${this.apiKey.length} chars`);
    }
    
    // Verify the key was actually set
    setTimeout(() => {
      if (!this.apiKey) {
        console.error(`❌ [${this.providerId}] API key was cleared shortly after setting!`);
        console.trace('API key clear trace');
      }
    }, 100);
  }

  /**
   * Clear API key from memory with tracking
   */
  clearApiKey(): void {
    const hadKey = !!this.apiKey;
    const keyLength = this.apiKey?.length || 0;
    
    this.apiKey = null;
    
    // Track API key clearing for debugging
    if (hadKey) {
      console.warn(`🗑️ [${this.providerId}] API key cleared (was ${keyLength} chars)`);
      console.trace('API key clear stack trace');
    }
  }

  /**
   * Test authentication with the provider
   */
  async testAuthentication(): Promise<ProviderAuthResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not set',
        errorCode: 'NO_API_KEY'
      };
    }

    try {
      // Test basic authentication
      const authResponse = await this.makeAuthRequest();
      
      if (!authResponse.success) {
        return authResponse;
      }

      // Try to fetch available models as additional validation
      const models = await this.fetchAvailableModels();
      
      return {
        ...authResponse,
        models
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'AUTH_ERROR'
      };
    }
  }

  /**
   * Fetch available models from the provider
   */
  async fetchAvailableModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const response = await this.makeHttpRequest({
        method: 'GET',
        headers: this.formatAuthHeaders(this.apiKey),
        timeout: this.config.timeout
      }, this.modelsEndpoint);

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
   * Generate AI response using the provider
   */
  async generateResponse(messages: AIMessage[], options: GenerationOptions = {}): Promise<AIResponse> {
    // Final API key check with detailed diagnostics
    if (!this.apiKey) {
      console.error(`❌ ${this.providerId} generateResponse called but API key not set`);
      console.error(`🔍 Provider diagnostic:`, {
        providerId: this.providerId,
        hasApiKey: !!this.apiKey,
        apiKeyType: typeof this.apiKey,
        apiKeyLength: this.apiKey ? this.apiKey.length : 0,
        currentTime: new Date().toISOString()
      });
      
      // Provide helpful guidance
      console.error(`💡 Troubleshooting tips:`);
      console.error(`   1. Check if API key was properly saved in settings`);
      console.error(`   2. Verify provider authentication status`);
      console.error(`   3. Try re-entering API key in plugin settings`);
      console.error(`   4. Check console for SecureStorage errors`);
      
      throw new Error(`API key not set for ${this.providerId}. Try: 1) /repair command to fix corruption, 2) /settings to re-enter API key, or 3) restart Obsidian.`);
    }
    
    // Validate API key format if possible
    const isValidFormat = this.validateApiKeyFormat(this.apiKey);
    if (!isValidFormat) {
      console.warn(`⚠️ ${this.providerId} API key format may be invalid`);
    }
    
    console.log(`✅ ${this.providerId} API key validated, proceeding with generation`);

    try {
      const requestBody = this.formatCompletionRequest(messages, {
        maxTokens: 1000,
        temperature: 0.7,
        ...options
      });

      const response = await this.makeHttpRequest({
        method: 'POST',
        headers: {
          ...this.formatAuthHeaders(this.apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: this.config.timeout
      }, this.completionEndpoint);

      if (!response.ok) {
        const errorMsg = this.extractErrorMessage(response.data);
        const enhancedError = this.createEnhancedError(response.status, errorMsg, response.data);
        throw enhancedError;
      }

      return this.parseCompletionResponse(response.data);
    } catch (error) {
      // Enhanced error handling with specific error types
      const enhancedError = this.enhanceError(error);
      console.error(`Failed to generate response from ${this.providerId}:`, enhancedError);
      throw enhancedError;
    }
  }

  /**
   * Generate streaming AI response using the provider
   */
  async generateStreamingResponse(messages: AIMessage[], callback: StreamCallback, options: GenerationOptions = {}): Promise<void> {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const requestBody = this.formatCompletionRequest(messages, {
        maxTokens: 1000,
        temperature: 0.7,
        stream: true,
        ...options
      });

      await this.makeStreamingRequest({
        method: 'POST',
        headers: {
          ...this.formatAuthHeaders(this.apiKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: this.config.timeout
      }, this.completionEndpoint, callback);

    } catch (error) {
      console.error(`Failed to generate streaming response from ${this.providerId}:`, error);
      // Send error as final chunk
      callback({
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isComplete: true,
        finishReason: 'error'
      });
      throw error;
    }
  }

  /**
   * Make authentication request to provider
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
      const response = await this.makeHttpRequest({
        method: 'GET',
        headers: this.formatAuthHeaders(this.apiKey),
        timeout: this.config.timeout
      }, this.authEndpoint);

      if (!response.ok) {
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
   * Make HTTP request with retry logic
   */
  protected async makeHttpRequest(config: RequestConfig, url: string): Promise<HttpResponse> {
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeHttpRequest(config, url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on 4xx errors (client errors)
        if (lastError.message.includes('HTTP 4')) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Make streaming HTTP request for Server-Sent Events
   */
  protected async makeStreamingRequest(config: RequestConfig, url: string, callback: StreamCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Streaming request timeout'));
      }, config.timeout || this.config.timeout);

      fetch(url, {
        method: config.method,
        headers: {
          ...config.headers,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: config.body,
        signal: controller.signal
      })
      .then(async response => {
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.text();
          reject(new Error(`HTTP ${response.status}: ${error}`));
          return;
        }

        if (!response.body) {
          reject(new Error('No response body for streaming'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send final completion chunk
              callback({
                content: '',
                isComplete: true,
                finishReason: 'stop'
              });
              resolve();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              try {
                const chunk = this.parseStreamChunk(line);
                if (chunk) {
                  callback(chunk);
                  
                  if (chunk.isComplete) {
                    resolve();
                    return;
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse stream chunk:', parseError);
                // Continue processing other chunks
              }
            }
          }
        } catch (streamError) {
          reject(streamError);
        } finally {
          reader.releaseLock();
        }
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Execute single HTTP request
   */
  private async executeHttpRequest(config: RequestConfig, url: string): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, config.timeout || this.config.timeout);

      // Use fetch API (available in Electron/Obsidian)
      fetch(url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        signal: controller.signal
      })
      .then(async response => {
        clearTimeout(timeoutId);
        
        let data: any;
        try {
          data = await response.json();
        } catch (error) {
          data = await response.text();
        }

        resolve({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data
        });
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API key format (override in subclasses for specific validation)
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    return !!(apiKey && apiKey.length >= 8);
  }

  /**
   * Extract error message from response
   */
  protected extractErrorMessage(response: any): string {
    if (typeof response === 'string') {
      return response;
    }
    
    // Common error message patterns
    const errorFields = ['error', 'message', 'detail', 'error_message'];
    
    for (const field of errorFields) {
      if (response[field]) {
        if (typeof response[field] === 'string') {
          return response[field];
        }
        if (response[field].message) {
          return response[field].message;
        }
      }
    }
    
    return 'Unknown error';
  }

  /**
   * Create enhanced error with detailed information
   */
  protected createEnhancedError(status: number, message: string, responseData: any): Error {
    let errorType = 'API_ERROR';
    let userMessage = message;
    let troubleshooting: string[] = [];

    // Categorize error by HTTP status code
    switch (status) {
      case 401:
        errorType = 'AUTH_ERROR';
        userMessage = 'Invalid API key or authentication failed';
        troubleshooting = [
          'Verify your API key is correct',
          'Check if the API key has expired',
          'Ensure you have the necessary permissions'
        ];
        break;
      
      case 403:
        errorType = 'PERMISSION_ERROR';
        userMessage = 'Access denied - insufficient permissions';
        troubleshooting = [
          'Check your account permissions',
          'Verify billing is up to date',
          'Contact provider support if issue persists'
        ];
        break;
      
      case 429:
        errorType = 'RATE_LIMIT_ERROR';
        userMessage = 'Rate limit exceeded - too many requests';
        troubleshooting = [
          'Wait a moment before trying again',
          'Check your rate limits in the provider dashboard',
          'Consider upgrading your plan for higher limits'
        ];
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = 'SERVER_ERROR';
        userMessage = 'Provider server error - please try again later';
        troubleshooting = [
          'This is a temporary server issue',
          'Try again in a few minutes',
          'Check provider status page for updates'
        ];
        break;
      
      default:
        if (status >= 400 && status < 500) {
          errorType = 'CLIENT_ERROR';
        } else if (status >= 500) {
          errorType = 'SERVER_ERROR';
        }
    }

    const error = new Error(`[${errorType}] ${userMessage}`);
    (error as any).errorType = errorType;
    (error as any).httpStatus = status;
    (error as any).originalMessage = message;
    (error as any).troubleshooting = troubleshooting;
    (error as any).responseData = responseData;
    
    return error;
  }

  /**
   * Enhance existing errors with additional context
   */
  protected enhanceError(error: any): Error {
    if (!error) return new Error('Unknown error');
    
    let errorType = 'UNKNOWN_ERROR';
    let userMessage = error.message || 'Unknown error occurred';
    let troubleshooting: string[] = [];

    // Handle timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
      errorType = 'TIMEOUT_ERROR';
      userMessage = 'Request timed out - the AI server took too long to respond';
      troubleshooting = [
        'AI responses can take time - this is normal for complex requests',
        'Try a shorter or simpler question',
        'Check your internet connection',
        'The AI service may be experiencing high load',
        'Wait a moment and try again'
      ];
    }
    // Handle network errors
    else if (error.message?.includes('fetch') || error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      errorType = 'NETWORK_ERROR';
      userMessage = 'Network error - unable to connect to the provider';
      troubleshooting = [
        'Check your internet connection',
        'Verify firewall settings allow the connection',
        'Try again in a moment',
        'Check if the provider service is online'
      ];
    }
    // Handle JSON parsing errors
    else if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      errorType = 'PARSE_ERROR';
      userMessage = 'Invalid response format from provider';
      troubleshooting = [
        'This may be a temporary provider issue',
        'Try again in a moment',
        'Contact support if the problem persists'
      ];
    }

    const enhancedError = new Error(`[${errorType}] ${userMessage}`);
    (enhancedError as any).errorType = errorType;
    (enhancedError as any).originalError = error;
    (enhancedError as any).troubleshooting = troubleshooting;
    
    return enhancedError;
  }

  /**
   * Get provider status information with enhanced details
   */
  getStatus(): {
    providerId: string;
    displayName: string;
    hasApiKey: boolean;
    apiKeyLength: number;
    lastAuthSuccess?: Date;
  } {
    const status = {
      providerId: this.providerId,
      displayName: this.displayName,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0
    };
    
    // Log status for debugging
    console.log(`📊 [${this.providerId}] Status check:`, status);
    
    return status;
  }
  
  /**
   * Force verify API key is still present
   */
  verifyApiKeyPresence(): boolean {
    const hasKey = !!this.apiKey;
    const keyLength = this.apiKey?.length || 0;
    
    console.log(`🔍 [${this.providerId}] API key verification: ${hasKey ? 'PRESENT' : 'MISSING'} (${keyLength} chars)`);
    
    if (!hasKey) {
      console.error(`❌ [${this.providerId}] API key verification FAILED - key is missing`);
    }
    
    return hasKey;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearApiKey();
  }
}