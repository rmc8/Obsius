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
   * Store an API key securely with enhanced persistence verification
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    const startTime = Date.now();
    console.log(`🔐 [${startTime}] SecureStorage.storeApiKey called for provider: ${provider}`);
    
    try {
      // Step 1: Input validation
      if (!provider || !apiKey) {
        throw new Error('Provider and API key are required');
      }

      if (apiKey.length < 8) {
        throw new Error('API key appears to be too short');
      }

      console.log(`📝 Encrypting API key (length: ${apiKey.length})`);
      
      // Step 2: Validate API key format before encryption
      const isValidFormat = this.validateApiKeyFormat(provider, apiKey);
      if (!isValidFormat) {
        console.warn(`⚠️ API key for ${provider} may have invalid format:`, {
          length: apiKey.length,
          startsWithSk: apiKey.startsWith('sk-'),
          provider
        });
      }
      
      // Step 3: Encrypt the API key
      const encryptedData = this.encryptionService.encrypt(apiKey);
      console.log(`✅ API key encrypted successfully:`, {
        hasIv: !!encryptedData.iv,
        hasEncryptedData: !!encryptedData.encryptedData,
        ivLength: encryptedData.iv ? encryptedData.iv.length : 0,
        encryptedDataLength: encryptedData.encryptedData ? encryptedData.encryptedData.length : 0,
        isValidFormat
      });
      
      // Step 4: Test decryption immediately to verify integrity
      try {
        const testDecrypted = this.encryptionService.decrypt(encryptedData);
        const roundTripValid = testDecrypted === apiKey;
        console.log(`🔄 Encryption round-trip test:`, {
          success: roundTripValid,
          originalLength: apiKey.length,
          decryptedLength: testDecrypted.length
        });
        
        if (!roundTripValid) {
          throw new Error('API key encryption round-trip validation failed');
        }
      } catch (roundTripError) {
        console.error(`❌ Encryption round-trip test failed:`, roundTripError);
        throw new Error(`Encryption validation failed: ${roundTripError.message}`);
      }
      
      // Step 5: Load existing secure data
      const container = await this.loadSecureContainer();
      console.log(`📦 Loaded container for storage, current providers:`, Object.keys(container.data));
      
      // Step 6: Store encrypted key with timestamp
      container.data[provider] = encryptedData;
      container.lastAccessed = new Date().toISOString();
      console.log(`💾 Added ${provider} to container data (${Object.keys(container.data).length} total providers)`);
      
      // Step 7: Save to plugin data with enhanced verification
      console.log(`💾 Starting critical save operation for ${provider}...`);
      await this.saveSecureContainer(container);
      console.log(`✅ Container save operation completed`);
      
      // Step 6: Multi-level verification
      console.log(`🔍 Starting comprehensive verification for ${provider}...`);
      
      // Verification Level 1: Immediate reload
      const verifyContainer1 = await this.loadSecureContainer();
      const hasProvider1 = provider in verifyContainer1.data;
      console.log(`🔍 Level 1 verification - ${provider} in saved data: ${hasProvider1}`);
      
      if (!hasProvider1) {
        throw new Error('Level 1 verification failed - provider not found in immediate reload');
      }
      
      // Verification Level 2: Encryption integrity
      try {
        const savedEncryptedData = verifyContainer1.data[provider];
        const decryptedKey = this.encryptionService.decrypt(savedEncryptedData);
        const keyMatches = decryptedKey === apiKey;
        console.log(`🔍 Level 2 verification - encryption integrity: ${keyMatches}`);
        
        if (!keyMatches) {
          throw new Error('Level 2 verification failed - decrypted key does not match original');
        }
      } catch (decryptError) {
        console.error(`❌ Level 2 verification failed:`, decryptError);
        throw new Error(`Encryption integrity check failed: ${decryptError.message}`);
      }
      
      // Verification Level 3: Delayed persistence check
      await new Promise(resolve => setTimeout(resolve, 250));
      const verifyContainer3 = await this.loadSecureContainer();
      const hasProvider3 = provider in verifyContainer3.data;
      console.log(`🔍 Level 3 verification - delayed persistence: ${hasProvider3}`);
      
      if (!hasProvider3) {
        throw new Error('Level 3 verification failed - data not persisted after delay');
      }
      
      // Step 7: Cache the plaintext key temporarily
      this.setCachedKey(provider, apiKey);
      
      const storeTime = Date.now() - startTime;
      console.log(`✅ API key stored and verified securely for provider: ${provider} in ${storeTime}ms`);
      
    } catch (error) {
      const storeTime = Date.now() - startTime;
      console.error(`❌ Failed to store API key after ${storeTime}ms:`, error);
      
      // Clear any partial cache on failure
      this.clearCachedKey(provider);
      
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

      // Decrypt the API key with enhanced debugging
      console.log(`🔓 Decrypting API key for ${provider}:`, {
        hasEncryptedData: !!encryptedData.encryptedData,
        hasIv: !!encryptedData.iv,
        hasAuthTag: !!encryptedData.authTag,
        algorithm: encryptedData.algorithm
      });
      
      const apiKey = this.encryptionService.decrypt(encryptedData);
      
      // Verify decrypted key integrity
      console.log(`🔍 Decrypted API key for ${provider}:`, {
        length: apiKey?.length || 0,
        startsWithSk: apiKey?.startsWith('sk-') || false,
        isValidFormat: this.validateApiKeyFormat(provider, apiKey)
      });
      
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
   * Load secure data container with streamlined retry logic
   */
  private async loadSecureContainer(): Promise<SecureDataContainer> {
    const startTime = Date.now();
    console.log(`🔍 Loading secure container`);
    
    try {
      // Step 1: Load plugin data with simplified retry (max 3 attempts)
      let data: any;
      const maxAttempts = 3;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          data = await this.plugin.loadData();
          
          if (data && typeof data === 'object') {
            console.log(`✅ Plugin data loaded on attempt ${attempt}`);
            break;
          }
          
          throw new Error('Invalid data structure');
          
        } catch (error) {
          if (attempt === maxAttempts) {
            console.error('❌ Failed to load plugin data');
            return this.createNewContainer();
          }
          
          // Short delay: 50ms, 100ms
          const delay = attempt * 50;
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Step 2: Validate basic data structure
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ Invalid data, creating new container');
        return this.createNewContainer();
      }
      
      // Step 3: Extract secure data directly
      const secureData = data[this.config.dataKey];
      
      // Step 4: Handle missing secure data
      if (!secureData) {
        console.log('🆕 No secure data found, creating new container');
        return this.createNewContainer();
      }
      
      // Step 5: Quick validation
      const isValid = this.isValidContainer(secureData);
      
      if (secureData && isValid) {
        const loadTime = Date.now() - startTime;
        console.log(`✅ Container loaded in ${loadTime}ms`);
        return secureData;
      }
      
      // Step 6: Fallback to new container
      console.log('🆕 Invalid container, creating new');
      return this.createNewContainer();
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ Error loading secure container after ${loadTime}ms:`, error);
      console.log('🔄 Creating new container as error recovery');
      return this.createNewContainer();
    }
  }

  /**
   * Save secure data container with simplified verification
   */
  private async saveSecureContainer(container: SecureDataContainer): Promise<void> {
    const startTime = Date.now();
    console.log(`💾 Saving secure container...`);
    
    try {
      // Step 1: Validate container
      if (!this.isValidContainer(container)) {
        throw new Error('Invalid container structure');
      }
      
      // Step 2: Load existing data (single attempt)
      let data: any = {};
      try {
        data = await this.plugin.loadData();
        if (!data || typeof data !== 'object') {
          data = {};
        }
      } catch (error) {
        console.warn('⚠️ Failed to load existing data, using empty object');
        data = {};
      }
      
      // Step 3: Update container
      container.lastAccessed = new Date().toISOString();
      data[this.config.dataKey] = container;
      
      // Step 4: Save with simplified retry (max 3 attempts)
      let saved = false;
      const maxAttempts = 3;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.plugin.saveData(data);
          
          // Quick verification
          await new Promise(resolve => setTimeout(resolve, 50));
          const verify = await this.plugin.loadData();
          
          if (verify && this.config.dataKey in verify) {
            saved = true;
            console.log(`✅ Save verified on attempt ${attempt}`);
            break;
          }
          
          throw new Error('Verification failed');
          
        } catch (error) {
          if (attempt === maxAttempts) {
            throw new Error(`Failed to save after ${maxAttempts} attempts`);
          }
          
          // Short delay: 100ms, 200ms
          const delay = attempt * 100;
          console.log(`🔄 Retrying save in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      if (!saved) {
        throw new Error('Failed to save container');
      }
      
      const saveTime = Date.now() - startTime;
      console.log(`✅ Secure container saved and verified successfully in ${saveTime}ms`);
      
    } catch (error) {
      const saveTime = Date.now() - startTime;
      console.error(`❌ Failed to save secure container after ${saveTime}ms:`, error);
      throw new Error(`Container save failed: ${error.message}`);
    }
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
   * Validate container structure efficiently
   */
  private isValidContainer(container: any): container is SecureDataContainer {
    return (
      container &&
      typeof container === 'object' &&
      typeof container.version === 'string' &&
      typeof container.created === 'string' &&
      typeof container.lastAccessed === 'string' &&
      container.data !== null &&
      typeof container.data === 'object'
    );
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
   * Validate API key format based on provider
   */
  private validateApiKeyFormat(provider: string, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    switch (provider) {
      case 'openai':
        // OpenAI keys start with 'sk-' and are typically 51 characters
        return apiKey.startsWith('sk-') && apiKey.length >= 45;
      case 'anthropic':
        // Anthropic keys start with 'sk-ant-' and are longer
        return apiKey.startsWith('sk-ant-') && apiKey.length >= 50;
      case 'google':
        // Google AI Studio keys are different format
        return apiKey.length >= 30;
      default:
        // Generic validation
        return apiKey.length >= 20;
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
   * Perform comprehensive data integrity check
   */
  async performIntegrityCheck(): Promise<{
    success: boolean;
    issues: string[];
    providers: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let providers: string[] = [];
    
    try {
      console.log('🔍 Starting comprehensive data integrity check...');
      
      // Check 1: Plugin data accessibility
      let pluginData: any;
      try {
        pluginData = await this.plugin.loadData();
        if (!pluginData || typeof pluginData !== 'object') {
          issues.push('Plugin data is missing or invalid');
          recommendations.push('Re-initialize plugin data');
        }
      } catch (error) {
        issues.push(`Plugin data load failed: ${error.message}`);
        recommendations.push('Check file system permissions');
      }
      
      // Check 2: Secure container existence and structure
      if (pluginData) {
        const hasSecureKey = this.config.dataKey in pluginData;
        const secureData = pluginData[this.config.dataKey];
        
        if (!hasSecureKey) {
          issues.push(`Secure container key '${this.config.dataKey}' not found`);
          recommendations.push('API keys may need to be re-entered');
        } else if (!secureData) {
          issues.push('Secure container exists but is null/undefined');
          recommendations.push('Container data corrupted - re-enter API keys');
        } else if (typeof secureData !== 'object') {
          issues.push(`Secure container has invalid type: ${typeof secureData}`);
          recommendations.push('Container format corrupted - re-enter API keys');
        } else {
          // Check 3: Container structure validation
          const isValid = this.isValidContainer(secureData);
          if (!isValid) {
            issues.push('Secure container structure is invalid');
            recommendations.push('Container corrupted - re-enter API keys');
          } else {
            // Check 4: Provider data integrity
            providers = Object.keys(secureData.data || {});
            console.log(`🔍 Checking ${providers.length} providers: ${providers.join(', ')}`);
            
            for (const providerId of providers) {
              const encryptedData = secureData.data[providerId];
              
              // Check encryption data structure
              if (!encryptedData || typeof encryptedData !== 'object') {
                issues.push(`Provider ${providerId}: invalid encrypted data structure`);
                continue;
              }
              
              if (!('iv' in encryptedData) || !('encryptedData' in encryptedData)) {
                issues.push(`Provider ${providerId}: missing encryption fields`);
                continue;
              }
              
              // Check decryption capability
              try {
                const decryptedKey = this.encryptionService.decrypt(encryptedData);
                if (!decryptedKey || decryptedKey.length < 8) {
                  issues.push(`Provider ${providerId}: decrypted key is too short`);
                } else {
                  console.log(`✅ Provider ${providerId}: encryption integrity verified`);
                }
              } catch (decryptError) {
                issues.push(`Provider ${providerId}: decryption failed - ${decryptError.message}`);
                recommendations.push(`Re-enter API key for ${providerId}`);
              }
            }
          }
        }
      }
      
      const success = issues.length === 0;
      console.log(`🏁 Integrity check completed: ${success ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (issues.length > 0) {
        console.log('❌ Issues found:', issues);
        console.log('💡 Recommendations:', recommendations);
      }
      
      return {
        success,
        issues,
        providers,
        recommendations
      };
      
    } catch (error) {
      console.error('❌ Integrity check failed:', error);
      return {
        success: false,
        issues: [`Integrity check failed: ${error.message}`],
        providers: [],
        recommendations: ['Restart plugin and check console for errors']
      };
    }
  }

  // Removed waitForObsidianDataStability and extractSecureDataWithRetry - no longer needed

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    console.log('SecureStorage destroyed');
  }
}