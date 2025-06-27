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
      timeout: 10000,      // 10 seconds default
      maxRetries: 2,       // 2 retries default
      ...config
    };
  }

  // Abstract methods that must be implemented by concrete providers
  abstract get providerId(): string;
  abstract get displayName(): string;
  abstract get authEndpoint(): string;
  abstract get modelsEndpoint(): string;
  
  protected abstract formatAuthHeaders(apiKey: string): Record<string, string>;
  protected abstract parseAuthResponse(response: any): ProviderAuthResult;
  protected abstract parseModelsResponse(response: any): string[];

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    this.apiKey = apiKey.trim();
  }

  /**
   * Clear API key from memory
   */
  clearApiKey(): void {
    this.apiKey = null;
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
   * Get provider status information
   */
  getStatus(): {
    providerId: string;
    displayName: string;
    hasApiKey: boolean;
    lastAuthSuccess?: Date;
  } {
    return {
      providerId: this.providerId,
      displayName: this.displayName,
      hasApiKey: !!this.apiKey
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearApiKey();
  }
}