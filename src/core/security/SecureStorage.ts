/**
 * Secure storage service for API keys and sensitive data
 * Provides encrypted storage with automatic key management
 */

import { Plugin } from 'obsidian';
import { EncryptionService, EncryptedData } from './EncryptionService';

/**
 * Secure storage configuration
 */
export interface SecureStorageConfig {
  pluginId: string;
  dataKey: string;          // Key in plugin data for encrypted storage
  encryptionService?: EncryptionService;
}

/**
 * Stored secure data structure
 */
interface SecureDataContainer {
  version: string;
  created: string;
  lastAccessed: string;
  data: { [key: string]: EncryptedData };
}

/**
 * API key metadata
 */
export interface ApiKeyMetadata {
  provider: string;
  created: Date;
  lastVerified?: Date;
  keyPrefix?: string;  // First few characters for identification
}

/**
 * Secure storage service for encrypted API key management
 */
export class SecureStorage {
  private plugin: Plugin;
  private config: SecureStorageConfig;
  private encryptionService: EncryptionService;
  private cache: Map<string, string> = new Map(); // Temporary plaintext cache
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(plugin: Plugin, config: SecureStorageConfig) {
    this.plugin = plugin;
    this.config = config;
    
    // Initialize encryption service
    if (config.encryptionService) {
      this.encryptionService = config.encryptionService;
    } else {
      const masterPassword = EncryptionService.generateMasterPassword(config.pluginId);
      this.encryptionService = new EncryptionService(masterPassword);
    }
  }

  /**
   * Store an API key securely
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    try {
      // Validate inputs
      if (!provider || !apiKey) {
        throw new Error('Provider and API key are required');
      }

      if (apiKey.length < 8) {
        throw new Error('API key appears to be too short');
      }

      // Encrypt the API key
      const encryptedData = this.encryptionService.encrypt(apiKey);
      
      // Load existing secure data
      const container = await this.loadSecureContainer();
      
      // Store encrypted key
      container.data[provider] = encryptedData;
      container.lastAccessed = new Date().toISOString();
      
      // Save to plugin data
      await this.saveSecureContainer(container);
      
      // Cache the plaintext key temporarily
      this.setCachedKey(provider, apiKey);
      
      console.log(`API key stored securely for provider: ${provider}`);
    } catch (error) {
      throw new Error(`Failed to store API key for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve an API key
   */
  async getApiKey(provider: string): Promise<string | null> {
    try {
      // Check cache first
      const cachedKey = this.cache.get(provider);
      if (cachedKey) {
        this.refreshCacheTimer(provider, cachedKey);
        return cachedKey;
      }

      // Load from secure storage
      const container = await this.loadSecureContainer();
      const encryptedData = container.data[provider];
      
      if (!encryptedData) {
        return null;
      }

      // Decrypt the API key
      const apiKey = this.encryptionService.decrypt(encryptedData);
      
      // Cache temporarily
      this.setCachedKey(provider, apiKey);
      
      // Update last accessed time
      container.lastAccessed = new Date().toISOString();
      await this.saveSecureContainer(container);
      
      return apiKey;
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Check if API key exists for provider
   */
  async hasApiKey(provider: string): Promise<boolean> {
    try {
      const container = await this.loadSecureContainer();
      return provider in container.data;
    } catch (error) {
      console.error(`Error checking API key for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Remove API key for provider
   */
  async removeApiKey(provider: string): Promise<void> {
    try {
      const container = await this.loadSecureContainer();
      
      if (container.data[provider]) {
        delete container.data[provider];
        container.lastAccessed = new Date().toISOString();
        await this.saveSecureContainer(container);
      }
      
      // Clear from cache
      this.clearCachedKey(provider);
      
      console.log(`API key removed for provider: ${provider}`);
    } catch (error) {
      throw new Error(`Failed to remove API key for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get metadata about stored API keys
   */
  async getApiKeyMetadata(provider: string): Promise<ApiKeyMetadata | null> {
    try {
      const container = await this.loadSecureContainer();
      const encryptedData = container.data[provider];
      
      if (!encryptedData) {
        return null;
      }

      // Decrypt to get key prefix (safely)
      const apiKey = this.encryptionService.decrypt(encryptedData);
      const keyPrefix = this.getKeyPrefix(apiKey);
      
      // Clear decrypted key from memory immediately
      EncryptionService.secureClear(apiKey);
      
      return {
        provider,
        created: new Date(container.created),
        keyPrefix
      };
    } catch (error) {
      console.error(`Error getting metadata for ${provider}:`, error);
      return null;
    }
  }

  /**
   * List all providers with stored keys
   */
  async listProviders(): Promise<string[]> {
    try {
      console.log('🔍 SecureStorage.listProviders() called');
      
      const container = await this.loadSecureContainer();
      console.log('📦 Loaded container:', { 
        version: container.version, 
        created: container.created, 
        dataKeys: Object.keys(container.data),
        dataCount: Object.keys(container.data).length
      });
      
      const providers = Object.keys(container.data);
      console.log('📋 Providers with stored keys:', providers);
      
      return providers;
    } catch (error) {
      console.error('❌ Error listing providers:', error);
      return [];
    }
  }

  /**
   * Clear all cached keys from memory
   */
  clearCache(): void {
    // Clear all timers
    for (const timer of this.cacheTimers.values()) {
      clearTimeout(timer);
    }
    this.cacheTimers.clear();
    
    // Clear cache
    this.cache.clear();
    
    console.log('API key cache cleared');
  }

  /**
   * Migrate existing plaintext API keys to encrypted storage
   */
  async migrateFromPlaintext(providers: { [key: string]: { apiKey?: string } }): Promise<void> {
    let migratedCount = 0;
    
    for (const [providerName, config] of Object.entries(providers)) {
      if (config.apiKey && config.apiKey.length > 0) {
        try {
          await this.storeApiKey(providerName, config.apiKey);
          migratedCount++;
          console.log(`Migrated API key for ${providerName}`);
        } catch (error) {
          console.error(`Failed to migrate API key for ${providerName}:`, error);
        }
      }
    }
    
    console.log(`Migration completed: ${migratedCount} API keys migrated to secure storage`);
  }

  /**
   * Load secure data container
   */
  private async loadSecureContainer(): Promise<SecureDataContainer> {
    try {
      console.log(`🔍 Loading secure container with dataKey: ${this.config.dataKey}`);
      
      const data = await this.plugin.loadData();
      console.log('📂 Plugin data loaded:', { 
        hasData: !!data, 
        keys: data ? Object.keys(data) : [],
        dataType: typeof data
      });
      
      const secureData = data?.[this.config.dataKey];
      console.log(`🔐 Secure data for key '${this.config.dataKey}':`, {
        hasSecureData: !!secureData,
        secureDataType: typeof secureData,
        secureDataKeys: secureData && typeof secureData === 'object' ? Object.keys(secureData) : 'not object'
      });
      
      if (secureData && this.isValidContainer(secureData)) {
        console.log('✅ Valid container found, returning existing data');
        return secureData;
      }
      
      // Return new container if none exists or invalid
      console.log('🆕 No valid container found, creating new one');
      return this.createNewContainer();
    } catch (error) {
      console.warn('❌ Error loading secure container, creating new one:', error);
      return this.createNewContainer();
    }
  }

  /**
   * Save secure data container
   */
  private async saveSecureContainer(container: SecureDataContainer): Promise<void> {
    const data = await this.plugin.loadData() || {};
    data[this.config.dataKey] = container;
    await this.plugin.saveData(data);
  }

  /**
   * Create new secure data container
   */
  private createNewContainer(): SecureDataContainer {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      created: now,
      lastAccessed: now,
      data: {}
    };
  }

  /**
   * Validate container structure
   */
  private isValidContainer(container: any): container is SecureDataContainer {
    return container &&
           typeof container.version === 'string' &&
           typeof container.created === 'string' &&
           typeof container.lastAccessed === 'string' &&
           typeof container.data === 'object';
  }

  /**
   * Cache API key temporarily with auto-expiration
   */
  private setCachedKey(provider: string, apiKey: string): void {
    // Clear existing timer
    this.clearCachedKey(provider);
    
    // Set new cache entry
    this.cache.set(provider, apiKey);
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.clearCachedKey(provider);
    }, this.cacheTimeout);
    
    this.cacheTimers.set(provider, timer);
  }

  /**
   * Refresh cache timer for provider
   */
  private refreshCacheTimer(provider: string, apiKey: string): void {
    this.setCachedKey(provider, apiKey);
  }

  /**
   * Clear cached key and timer
   */
  private clearCachedKey(provider: string): void {
    this.cache.delete(provider);
    
    const timer = this.cacheTimers.get(provider);
    if (timer) {
      clearTimeout(timer);
      this.cacheTimers.delete(provider);
    }
  }

  /**
   * Get safe key prefix for display
   */
  private getKeyPrefix(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '***';
    }
    return apiKey.substring(0, 4) + '...';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    console.log('SecureStorage destroyed');
  }
}