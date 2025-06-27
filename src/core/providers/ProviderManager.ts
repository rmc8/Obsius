/**
 * Provider Manager
 * Central management for all AI providers with secure authentication
 */

import { Plugin } from 'obsidian';
import { SecureStorage } from '../security/SecureStorage';
import { BaseProvider, ProviderAuthResult } from './BaseProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GoogleProvider } from './GoogleProvider';
import { SecureProviderConfig } from '../../utils/types';

/**
 * Provider registration information
 */
interface ProviderRegistration {
  provider: BaseProvider;
  config: SecureProviderConfig;
  lastAuthResult?: ProviderAuthResult;
}

/**
 * Provider manager for secure AI provider handling
 */
export class ProviderManager {
  private plugin: Plugin;
  private secureStorage: SecureStorage;
  private providers: Map<string, ProviderRegistration> = new Map();
  private initialized = false;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.secureStorage = new SecureStorage(plugin, {
      pluginId: 'obsius',
      dataKey: 'secureApiKeys'
    });
  }

  /**
   * Initialize provider manager with default providers
   */
  async initialize(existingProviderConfigs?: Record<string, SecureProviderConfig>): Promise<void> {
    if (this.initialized) return;

    // Register default providers with existing configs if available
    await this.registerDefaultProviders(existingProviderConfigs);
    
    // Load stored API keys and verify them
    await this.loadAndVerifyStoredKeys();
    
    this.initialized = true;
    console.log('ProviderManager initialized with', this.providers.size, 'providers');
  }

  /**
   * Register default AI providers
   */
  private async registerDefaultProviders(existingConfigs?: Record<string, SecureProviderConfig>): Promise<void> {
    // OpenAI
    const openAIProvider = new OpenAIProvider({
      name: 'OpenAI',
      defaultModel: 'gpt-4'
    });
    
    await this.registerProvider('openai', openAIProvider, existingConfigs?.openai || {
      name: 'OpenAI',
      model: 'gpt-4',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    });

    // Anthropic (Claude)
    const anthropicProvider = new AnthropicProvider({
      name: 'Anthropic Claude',
      defaultModel: 'claude-3-sonnet-20240229'
    });
    
    await this.registerProvider('anthropic', anthropicProvider, existingConfigs?.anthropic || {
      name: 'Anthropic Claude',
      model: 'claude-3-sonnet-20240229',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    });

    // Google AI
    const googleProvider = new GoogleProvider({
      name: 'Google AI',
      defaultModel: 'gemini-pro'
    });
    
    await this.registerProvider('google', googleProvider, existingConfigs?.google || {
      name: 'Google AI (Gemini)',
      model: 'gemini-pro',
      enabled: true,
      authenticated: false,
      hasApiKey: false
    });
  }

  /**
   * Register a new provider
   */
  async registerProvider(
    providerId: string, 
    provider: BaseProvider, 
    config: SecureProviderConfig
  ): Promise<void> {
    this.providers.set(providerId, {
      provider,
      config: { ...config }
    });

    console.log(`Registered provider: ${providerId}`);
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): BaseProvider | null {
    const registration = this.providers.get(providerId);
    return registration?.provider || null;
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerId: string): SecureProviderConfig | null {
    const registration = this.providers.get(providerId);
    return registration?.config || null;
  }

  /**
   * Set API key for provider
   */
  async setProviderApiKey(providerId: string, apiKey: string): Promise<ProviderAuthResult> {
    const registration = this.providers.get(providerId);
    if (!registration) {
      return {
        success: false,
        error: `Provider ${providerId} not found`,
        errorCode: 'PROVIDER_NOT_FOUND'
      };
    }

    try {
      // Store API key securely
      await this.secureStorage.storeApiKey(providerId, apiKey);
      
      // Set key in provider and test authentication
      registration.provider.setApiKey(apiKey);
      const authResult = await registration.provider.testAuthentication();
      
      // Update configuration
      registration.config.hasApiKey = true;
      registration.config.authenticated = authResult.success;
      registration.config.lastVerified = authResult.success ? new Date().toISOString() : undefined;
      registration.config.models = authResult.models || [];
      registration.lastAuthResult = authResult;
      
      // Update key prefix for display
      if (authResult.success) {
        const metadata = await this.secureStorage.getApiKeyMetadata(providerId);
        registration.config.keyPrefix = metadata?.keyPrefix;
      }

      console.log(`API key set for ${providerId}:`, authResult.success ? 'Success' : 'Failed');
      return authResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to set API key for ${providerId}:`, error);
      
      return {
        success: false,
        error: errorMessage,
        errorCode: 'STORAGE_ERROR'
      };
    }
  }

  /**
   * Remove API key for provider
   */
  async removeProviderApiKey(providerId: string): Promise<void> {
    const registration = this.providers.get(providerId);
    if (!registration) {
      throw new Error(`Provider ${providerId} not found`);
    }

    try {
      // Remove from secure storage
      await this.secureStorage.removeApiKey(providerId);
      
      // Clear from provider
      registration.provider.clearApiKey();
      
      // Update configuration
      registration.config.hasApiKey = false;
      registration.config.authenticated = false;
      registration.config.lastVerified = undefined;
      registration.config.keyPrefix = undefined;
      registration.config.models = [];
      registration.lastAuthResult = undefined;

      console.log(`API key removed for ${providerId}`);
    } catch (error) {
      console.error(`Failed to remove API key for ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Test authentication for provider
   */
  async testProviderAuth(providerId: string): Promise<ProviderAuthResult> {
    const registration = this.providers.get(providerId);
    if (!registration) {
      return {
        success: false,
        error: `Provider ${providerId} not found`,
        errorCode: 'PROVIDER_NOT_FOUND'
      };
    }

    try {
      // Get API key from secure storage
      const apiKey = await this.secureStorage.getApiKey(providerId);
      if (!apiKey) {
        return {
          success: false,
          error: 'No API key stored',
          errorCode: 'NO_API_KEY'
        };
      }

      // Set key and test
      registration.provider.setApiKey(apiKey);
      const authResult = await registration.provider.testAuthentication();
      
      // Update configuration
      registration.config.authenticated = authResult.success;
      registration.config.lastVerified = authResult.success ? new Date().toISOString() : undefined;
      registration.config.models = authResult.models || [];
      registration.lastAuthResult = authResult;

      return authResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Authentication test failed for ${providerId}:`, error);
      
      return {
        success: false,
        error: errorMessage,
        errorCode: 'AUTH_ERROR'
      };
    }
  }

  /**
   * Get all provider configurations
   */
  getAllProviderConfigs(): Record<string, SecureProviderConfig> {
    const configs: Record<string, SecureProviderConfig> = {};
    
    for (const [providerId, registration] of this.providers) {
      configs[providerId] = { ...registration.config };
    }
    
    return configs;
  }

  /**
   * Get authenticated providers
   */
  getAuthenticatedProviders(): string[] {
    const authenticated: string[] = [];
    
    for (const [providerId, registration] of this.providers) {
      if (registration.config.authenticated) {
        authenticated.push(providerId);
      }
    }
    
    return authenticated;
  }

  /**
   * Load and verify stored API keys
   */
  private async loadAndVerifyStoredKeys(): Promise<void> {
    try {
      const storedProviders = await this.secureStorage.listProviders();
      
      for (const providerId of storedProviders) {
        const registration = this.providers.get(providerId);
        if (!registration) continue;

        // Update configuration to reflect stored key
        registration.config.hasApiKey = true;
        
        // Get metadata
        const metadata = await this.secureStorage.getApiKeyMetadata(providerId);
        if (metadata) {
          registration.config.keyPrefix = metadata.keyPrefix;
        }
        
        // Load the actual API key and set it in the provider
        const apiKey = await this.secureStorage.getApiKey(providerId);
        if (apiKey) {
          registration.provider.setApiKey(apiKey);
        }

        // Trust previous authentication state for fast startup
        // Authentication will be verified when actually needed during API calls
        console.log(`Provider ${providerId} loaded with stored API key - trusting previous auth state`);
      }

      console.log(`Loaded ${storedProviders.length} stored API keys`);
    } catch (error) {
      console.error('Failed to load stored API keys:', error);
    }
  }

  /**
   * Migrate from old plaintext configuration
   */
  async migrateFromPlaintext(oldProviders: Record<string, any>): Promise<void> {
    console.log('Migrating API keys from plaintext storage...');
    
    let migratedCount = 0;
    
    for (const [providerId, oldConfig] of Object.entries(oldProviders)) {
      if (oldConfig.apiKey && typeof oldConfig.apiKey === 'string') {
        try {
          const authResult = await this.setProviderApiKey(providerId, oldConfig.apiKey);
          if (authResult.success) {
            migratedCount++;
            console.log(`Migrated API key for ${providerId}`);
          } else {
            console.warn(`Migration failed for ${providerId}:`, authResult.error);
          }
        } catch (error) {
          console.error(`Migration error for ${providerId}:`, error);
        }
      }
    }
    
    console.log(`Migration completed: ${migratedCount} API keys migrated`);
  }

  /**
   * Verify all stored API keys
   */
  async verifyAllKeys(): Promise<Record<string, ProviderAuthResult>> {
    const results: Record<string, ProviderAuthResult> = {};
    
    for (const [providerId, registration] of this.providers) {
      if (registration.config.hasApiKey) {
        results[providerId] = await this.testProviderAuth(providerId);
      }
    }
    
    return results;
  }

  /**
   * Get provider statistics
   */
  getStats(): {
    total: number;
    hasApiKey: number;
    authenticated: number;
    enabled: number;
  } {
    let hasApiKey = 0;
    let authenticated = 0;
    let enabled = 0;
    
    for (const registration of this.providers.values()) {
      if (registration.config.hasApiKey) hasApiKey++;
      if (registration.config.authenticated) authenticated++;
      if (registration.config.enabled) enabled++;
    }
    
    return {
      total: this.providers.size,
      hasApiKey,
      authenticated,
      enabled
    };
  }

  /**
   * Get current provider (first authenticated provider or first enabled provider)
   */
  getCurrentProvider(): BaseProvider | null {
    // First try to find an authenticated provider
    for (const registration of this.providers.values()) {
      if (registration.config.authenticated && registration.config.enabled) {
        return registration.provider;
      }
    }
    
    // Fallback to first enabled provider with API key
    for (const registration of this.providers.values()) {
      if (registration.config.hasApiKey && registration.config.enabled) {
        return registration.provider;
      }
    }
    
    return null;
  }

  /**
   * Get provider by ID
   */
  getProviderById(providerId: string): BaseProvider | null {
    const registration = this.providers.get(providerId);
    return registration ? registration.provider : null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear API keys from memory
    for (const registration of this.providers.values()) {
      registration.provider.clearApiKey();
    }
    
    // Clear secure storage cache
    this.secureStorage.clearCache();
    this.secureStorage.destroy();
    
    console.log('ProviderManager destroyed');
  }
}