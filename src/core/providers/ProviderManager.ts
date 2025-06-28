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

    try {
      // Register default providers with existing configs if available
      await this.registerDefaultProviders(existingProviderConfigs);
      
      // Perform integrity check before loading keys
      const integrityResult = await this.secureStorage.performIntegrityCheck();
      if (!integrityResult.success) {
        console.warn('⚠️ Data integrity issues detected:', integrityResult.issues);
        
        if (integrityResult.recommendations.length > 0) {
          console.log('📝 Recommendations:', integrityResult.recommendations);
        }
      }
      
      // Load stored API keys and verify them
      await this.loadAndVerifyStoredKeys();
      
      this.initialized = true;
      console.log('ProviderManager initialized with', this.providers.size, 'providers');
      
    } catch (error) {
      console.error('❌ ProviderManager initialization failed:', error);
      
      // Emergency fallback: ensure basic providers are available
      console.log('🚑 Applying emergency fallback initialization...');
      try {
        await this.registerDefaultProviders({});
        this.initialized = true;
        console.log('⚠️ ProviderManager initialized in fallback mode');
      } catch (fallbackError) {
        console.error('❌ Even fallback initialization failed:', fallbackError);
        this.initialized = false;
        throw new Error('ProviderManager initialization completely failed');
      }
    }
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
   * Register a new provider with immediate API key restoration
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
    
    // If this provider should have an API key, restore it immediately
    if (config.hasApiKey && config.authenticated) {
      console.log(`🔧 Immediately restoring API key for newly registered ${providerId}`);
      await this.immediateApiKeyRestore(providerId);
    }
  }
  
  /**
   * Immediate API key restoration for a specific provider
   */
  private async immediateApiKeyRestore(providerId: string): Promise<void> {
    try {
      const registration = this.providers.get(providerId);
      if (!registration) return;
      
      const apiKey = await this.secureStorage.getApiKey(providerId);
      if (apiKey) {
        registration.provider.setApiKey(apiKey);
        const verified = !!(registration.provider as any).apiKey;
        console.log(`🔧 Immediate restore for ${providerId}: ${verified ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (error) {
      console.error(`❌ Immediate restore failed for ${providerId}:`, error);
    }
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
      
      // Update configuration with enhanced state management
      registration.config.hasApiKey = true;
      registration.config.authenticated = authResult.success;
      registration.config.lastVerified = authResult.success ? new Date().toISOString() : undefined;
      registration.config.models = authResult.models || [];
      registration.lastAuthResult = authResult;
      
      // Update key prefix for display and ensure API key persistence
      if (authResult.success) {
        const metadata = await this.secureStorage.getApiKeyMetadata(providerId);
        registration.config.keyPrefix = metadata?.keyPrefix;
        
        // Ensure API key is permanently set in provider instance
        this.ensureProviderHasApiKey(providerId, apiKey);
        
        // Log successful authentication state
        console.log(`✅ Authentication successful for ${providerId} - state updated:`, {
          hasApiKey: registration.config.hasApiKey,
          authenticated: registration.config.authenticated,
          lastVerified: registration.config.lastVerified,
          providerHasKey: !!(registration.provider as any).apiKey
        });
      } else {
        console.log(`❌ Authentication failed for ${providerId}:`, authResult.error);
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
   * Get all provider configurations with API key restoration
   */
  getAllProviderConfigs(): Record<string, SecureProviderConfig> {
    const configs: Record<string, SecureProviderConfig> = {};
    
    for (const [providerId, registration] of this.providers) {
      configs[providerId] = { ...registration.config };
      
      // Ensure API key is set if configuration claims it exists
      if (registration.config.hasApiKey && registration.config.authenticated) {
        const hasInstanceKey = !!(registration.provider as any).apiKey;
        if (!hasInstanceKey) {
          console.warn(`🔧 getAllProviderConfigs: ${providerId} missing API key - scheduling restore`);
          // Schedule immediate restoration (non-blocking)
          this.immediateApiKeyRestore(providerId).catch(error => {
            console.error(`❌ Scheduled restore failed for ${providerId}:`, error);
          });
        }
      }
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
   * Load and verify stored API keys with enhanced error handling and recovery
   */
  private async loadAndVerifyStoredKeys(): Promise<void> {
    const startTime = Date.now();
    console.log(`🔍 Loading stored API keys...`);
    
    try {
      // Get stored providers
      const storedProviders = await this.secureStorage.listProviders();
      
      if (storedProviders.length === 0) {
        console.log('📋 No stored providers found');
        return;
      }
      
      console.log(`📋 Found ${storedProviders.length} stored providers: ${storedProviders.join(', ')}`);
      
      // Process each provider
      for (const providerId of storedProviders) {
        try {
          const registration = this.providers.get(providerId);
          if (!registration) {
            console.warn(`⚠️ Provider ${providerId} not registered`);
            continue;
          }

          // Load API key (single attempt)
          const apiKey = await this.secureStorage.getApiKey(providerId);
          
          if (!apiKey) {
            console.warn(`⚠️ No API key found for ${providerId}`);
            registration.config.hasApiKey = false;
            registration.config.authenticated = false;
            continue;
          }
          
          // Set API key and verify it was set correctly
          registration.provider.setApiKey(apiKey);
          
          // Verify API key was actually set in provider instance
          const providerHasKey = !!(registration.provider as any).apiKey;
          if (!providerHasKey) {
            throw new Error(`Failed to set API key in provider instance for ${providerId}`);
          }
          
          registration.config.hasApiKey = true;
          console.log(`✅ Loaded and verified API key for ${providerId} (${apiKey.length} chars)`);
          
          // Get metadata if available
          try {
            const metadata = await this.secureStorage.getApiKeyMetadata(providerId);
            if (metadata) {
              registration.config.keyPrefix = metadata.keyPrefix;
            }
          } catch (error) {
            // Metadata is optional
          }
          
        } catch (error) {
          console.error(`❌ Error loading ${providerId}:`, error);
          
          // Reset provider state on error
          const registration = this.providers.get(providerId);
          if (registration) {
            registration.config.hasApiKey = false;
            registration.config.authenticated = false;
            registration.provider.clearApiKey();
          }
        }
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ API key loading completed in ${loadTime}ms`);
      
    } catch (error) {
      console.error(`❌ Failed to load stored keys:`, error);
      
      // Reset all providers on critical error
      for (const [_, registration] of this.providers) {
        registration.config.hasApiKey = false;
        registration.config.authenticated = false;
        registration.provider.clearApiKey();
      }
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
   * Ensure provider instance has API key set
   */
  private ensureProviderHasApiKey(providerId: string, apiKey: string): void {
    const registration = this.providers.get(providerId);
    if (!registration) {
      console.warn(`⚠️ Cannot ensure API key - provider ${providerId} not found`);
      return;
    }

    try {
      // Force set the API key in provider instance
      registration.provider.setApiKey(apiKey);
      
      // Verify it was set correctly
      const hasKey = !!(registration.provider as any).apiKey;
      console.log(`🔒 ensureProviderHasApiKey for ${providerId}: ${hasKey ? 'SUCCESS' : 'FAILED'}`);
      
      if (!hasKey) {
        console.error(`❌ Failed to ensure API key for ${providerId} - provider instance has no key after setting`);
      }
    } catch (error) {
      console.error(`❌ Error ensuring API key for ${providerId}:`, error);
    }
  }

  /**
   * Restore API keys to all authenticated providers
   */
  async restoreApiKeysToProviders(): Promise<void> {
    console.log('🔄 Restoring API keys to all authenticated providers...');
    
    let restoredCount = 0;
    
    for (const [providerId, registration] of this.providers) {
      if (registration.config.hasApiKey && registration.config.authenticated) {
        const hasInstanceKey = !!(registration.provider as any).apiKey;
        
        if (!hasInstanceKey) {
          console.log(`🔧 Restoring API key to ${providerId} provider instance...`);
          
          try {
            const apiKey = await this.secureStorage.getApiKey(providerId);
            if (apiKey) {
              registration.provider.setApiKey(apiKey);
              const verified = !!(registration.provider as any).apiKey;
              
              if (verified) {
                restoredCount++;
                console.log(`✅ Restored API key to ${providerId}`);
              } else {
                console.error(`❌ Failed to restore API key to ${providerId}`);
              }
            } else {
              console.warn(`⚠️ No API key found in storage for ${providerId}`);
            }
          } catch (error) {
            console.error(`❌ Error restoring API key to ${providerId}:`, error);
          }
        } else {
          console.log(`✅ ${providerId} already has API key in instance`);
        }
      }
    }
    
    console.log(`🏁 API key restoration completed: ${restoredCount} providers restored`);
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
   * Now async to ensure API key recovery completes before returning
   */
  async getCurrentProvider(): Promise<BaseProvider | null> {
    // First try to find an authenticated provider
    for (const [providerId, registration] of this.providers) {
      if (registration.config.authenticated && registration.config.enabled) {
        // Verify the provider actually has an API key set
        const hasApiKey = !!(registration.provider as any).apiKey;
        
        if (!hasApiKey) {
          console.warn(`⚠️ Provider ${providerId} is marked as authenticated but has no API key - attempting immediate recovery`);
          
          // Try immediate restoration first
          try {
            const apiKey = await this.secureStorage.getApiKey(providerId);
            if (apiKey) {
              console.log(`🔧 getCurrentProvider: immediate restore for ${providerId}`);
              registration.provider.setApiKey(apiKey);
              
              const verifyKey = !!(registration.provider as any).apiKey;
              if (verifyKey) {
                console.log(`✅ getCurrentProvider: immediate restore successful for ${providerId}`);
              } else {
                // Fallback to full recovery
                await this.attemptProviderRecovery(providerId);
              }
            } else {
              // Fallback to full recovery
              await this.attemptProviderRecovery(providerId);
            }
          } catch (error) {
            console.error(`❌ getCurrentProvider: immediate restore failed for ${providerId}:`, error);
            // Fallback to full recovery
            await this.attemptProviderRecovery(providerId);
          }
        }
        
        return registration.provider;
      }
    }
    
    // Fallback to first enabled provider with API key
    for (const [providerId, registration] of this.providers) {
      if (registration.config.hasApiKey && registration.config.enabled) {
        // Verify the provider actually has an API key set
        const hasApiKey = !!(registration.provider as any).apiKey;
        
        if (!hasApiKey) {
          console.warn(`⚠️ Provider ${providerId} claims to have API key but doesn't - attempting immediate recovery`);
          
          // Try immediate restoration first
          try {
            const apiKey = await this.secureStorage.getApiKey(providerId);
            if (apiKey) {
              console.log(`🔧 Fallback provider: immediate restore for ${providerId}`);
              registration.provider.setApiKey(apiKey);
              
              const verifyKey = !!(registration.provider as any).apiKey;
              if (verifyKey) {
                console.log(`✅ Fallback provider: immediate restore successful for ${providerId}`);
              } else {
                // Fallback to full recovery
                await this.attemptProviderRecovery(providerId);
              }
            } else {
              // Fallback to full recovery
              await this.attemptProviderRecovery(providerId);
            }
          } catch (error) {
            console.error(`❌ Fallback provider: immediate restore failed for ${providerId}:`, error);
            // Fallback to full recovery
            await this.attemptProviderRecovery(providerId);
          }
        }
        
        return registration.provider;
      }
    }
    
    return null;
  }

  /**
   * Attempt to recover provider API key with enhanced fallback strategies
   */
  private async attemptProviderRecovery(providerId: string): Promise<void> {
    const startTime = Date.now();
    console.log(`🔄 [${startTime}] Starting enhanced recovery for provider: ${providerId}`);
    
    try {
      const registration = this.providers.get(providerId);
      if (!registration) {
        console.error(`❌ Provider ${providerId} not found for recovery`);
        return;
      }

      let recoverySuccess = false;
      
      // Recovery Strategy 1: Secure storage retrieval with retry
      console.log(`🔐 Strategy 1: Secure storage retrieval`);
      let apiKey: string | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !apiKey) {
        try {
          apiKey = await this.secureStorage.getApiKey(providerId);
          if (apiKey) {
            console.log(`✅ Secure storage recovery successful on attempt ${attempts + 1}: [${apiKey.length} chars]`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Secure storage attempt ${attempts + 1} failed:`, error);
        }
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        }
      }
      
      // Recovery Strategy 2: Legacy location fallback
      if (!apiKey && registration.config.authenticated) {
        console.log(`🔄 Strategy 2: Legacy location fallback for ${providerId}`);
        
        try {
          const pluginData = await (this.plugin as any).loadData();
          const legacyApiKey = pluginData?.providers?.[providerId]?.apiKey;
          
          if (legacyApiKey && typeof legacyApiKey === 'string' && legacyApiKey.length > 8) {
            apiKey = legacyApiKey;
            console.log(`✅ Found API key in legacy location for ${providerId}: [${apiKey.length} chars]`);
            
            // Attempt to migrate to secure storage
            try {
              await this.secureStorage.storeApiKey(providerId, apiKey);
              console.log(`✅ Successfully migrated API key to secure storage for ${providerId}`);
              
              // Clear legacy key after successful migration
              pluginData.providers[providerId].apiKey = undefined;
              await (this.plugin as any).saveData(pluginData);
              console.log(`🗑️ Cleared legacy API key for ${providerId}`);
            } catch (migrationError) {
              console.error(`❌ Failed to migrate API key to secure storage:`, migrationError);
              // Continue with the key anyway
            }
          } else {
            console.log(`🚫 No valid legacy API key found for ${providerId}`);
          }
        } catch (error) {
          console.error(`❌ Legacy location check failed:`, error);
        }
      }
      
      // Recovery Strategy 3: Apply recovered key
      if (apiKey) {
        console.log(`🔧 Strategy 3: Applying recovered API key for ${providerId}`);
        
        try {
          // Set the API key in the provider
          registration.provider.setApiKey(apiKey);
          console.log(`✅ API key set in provider instance`);
          
          // Verify it was set correctly
          const verifyKey = (registration.provider as any).apiKey;
          if (verifyKey && verifyKey.length > 0) {
            console.log(`🔍 Verification successful - provider has key: [${verifyKey.length} chars]`);
            
            // Update configuration to reflect recovery
            registration.config.hasApiKey = true;
            console.log(`✅ Updated ${providerId} config to reflect recovered API key`);
            
            recoverySuccess = true;
          } else {
            throw new Error('API key verification failed after setting');
          }
        } catch (error) {
          console.error(`❌ Failed to apply recovered API key:`, error);
        }
      }
      
      // Recovery Strategy 4: State cleanup if recovery failed
      if (!recoverySuccess) {
        console.log(`🗑️ Strategy 4: Cleaning up inconsistent state for ${providerId}`);
        
        // Update configuration to reflect reality
        registration.config.hasApiKey = false;
        registration.config.authenticated = false;
        registration.config.keyPrefix = undefined;
        registration.config.lastVerified = undefined;
        
        // Clear any existing key from provider
        registration.provider.clearApiKey();
        
        console.log(`📝 Updated ${providerId} config to reflect missing API key`);
      }
      
      const recoveryTime = Date.now() - startTime;
      console.log(`🏁 Recovery completed for ${providerId} in ${recoveryTime}ms: ${recoverySuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
    } catch (error) {
      const recoveryTime = Date.now() - startTime;
      console.error(`❌ Critical recovery error for ${providerId} after ${recoveryTime}ms:`, error);
      
      // Emergency cleanup
      const registration = this.providers.get(providerId);
      if (registration) {
        registration.config.hasApiKey = false;
        registration.config.authenticated = false;
        registration.provider.clearApiKey();
        console.log(`🚑 Emergency cleanup applied for ${providerId}`);
      }
    }
  }

  /**
   * Get provider by ID with enhanced API key verification
   * Now async to ensure API key recovery completes before returning
   */
  async getProviderById(providerId: string): Promise<BaseProvider | null> {
    console.log(`🔍 getProviderById called with: ${providerId}`);
    
    const registration = this.providers.get(providerId);
    if (!registration) {
      console.log(`❌ Provider ${providerId} not found`);
      return null;
    }
    
    // Force verification of API key presence
    const providerHasKey = (registration.provider as any).verifyApiKeyPresence?.() || !!(registration.provider as any)?.apiKey;
    const configHasKey = registration.config.hasApiKey;
    const configAuth = registration.config.authenticated;
    
    console.log(`📦 Provider registration found:`, {
      hasRegistration: true,
      configHasKey,
      providerHasKey,
      configAuth,
      synced: configHasKey === providerHasKey
    });
    
    // Check for state inconsistency and attempt immediate recovery
    if (configHasKey && !providerHasKey) {
      console.warn(`⚠️ Provider ${providerId} config claims hasApiKey=true but provider instance has no key - attempting immediate recovery`);
      
      // Try immediate key restoration first (faster than full recovery)
      try {
        const apiKey = await this.secureStorage.getApiKey(providerId);
        if (apiKey) {
          console.log(`🔧 Immediate restore: Setting API key for ${providerId}`);
          registration.provider.setApiKey(apiKey);
          
          const verifyKey = !!(registration.provider as any).apiKey;
          if (verifyKey) {
            console.log(`✅ Immediate restore successful for ${providerId}`);
            return registration.provider;
          }
        }
      } catch (error) {
        console.error(`❌ Immediate restore failed for ${providerId}:`, error);
      }
      
      // Fallback to full recovery if immediate restore failed
      await this.attemptProviderRecovery(providerId);
    } else if (configAuth && !providerHasKey) {
      console.warn(`⚠️ Provider ${providerId} authenticated but missing API key - attempting recovery`);
      await this.attemptProviderRecovery(providerId);
    }
    
    return registration.provider;
  }

  /**
   * Perform comprehensive diagnostic check of the entire provider system
   */
  async performComprehensiveDiagnostics(): Promise<{
    success: boolean;
    summary: string;
    details: {
      initialization: boolean;
      secureStorage: any;
      providers: Record<string, any>;
      authentication: Record<string, any>;
      recommendations: string[];
    };
  }> {
    console.log('🔍 Starting comprehensive provider system diagnostics...');
    
    const diagnostics = {
      success: false,
      summary: '',
      details: {
        initialization: this.initialized,
        secureStorage: {},
        providers: {},
        authentication: {},
        recommendations: [] as string[]
      }
    };
    
    try {
      // 1. Check initialization state
      if (!this.initialized) {
        diagnostics.details.recommendations.push('ProviderManager not initialized - call initialize() first');
      }
      
      // 2. Check secure storage integrity
      console.log('🔐 Checking secure storage integrity...');
      const storageIntegrity = await this.secureStorage.performIntegrityCheck();
      diagnostics.details.secureStorage = storageIntegrity;
      
      if (!storageIntegrity.success) {
        diagnostics.details.recommendations.push(...storageIntegrity.recommendations);
      }
      
      // 3. Check each provider
      console.log('🔍 Diagnosing individual providers...');
      for (const [providerId, registration] of this.providers) {
        const providerDiag = await this.diagnoseProvider(providerId, registration);
        (diagnostics.details.providers as Record<string, any>)[providerId] = providerDiag;
        
        if (providerDiag.issues.length > 0) {
          diagnostics.details.recommendations.push(...providerDiag.recommendations);
        }
      }
      
      // 4. Check authentication states
      console.log('🔑 Checking authentication states...');
      for (const [providerId, registration] of this.providers) {
        try {
          const authResult = await this.testProviderAuth(providerId);
          (diagnostics.details.authentication as Record<string, any>)[providerId] = {
            success: authResult.success,
            error: authResult.error,
            errorCode: authResult.errorCode,
            models: authResult.models
          };
        } catch (error) {
          (diagnostics.details.authentication as Record<string, any>)[providerId] = {
            success: false,
            error: (error as Error).message,
            errorCode: 'DIAGNOSTIC_ERROR'
          };
        }
      }
      
      // 5. Generate summary
      const totalProviders = this.providers.size;
      const authenticatedProviders = Object.values(diagnostics.details.authentication)
        .filter((auth: any) => auth.success).length;
      const providersWithIssues = Object.values(diagnostics.details.providers)
        .filter((prov: any) => prov.issues.length > 0).length;
      
      diagnostics.success = storageIntegrity.success && 
                           authenticatedProviders > 0 && 
                           providersWithIssues === 0;
      
      diagnostics.summary = `${authenticatedProviders}/${totalProviders} providers authenticated, ` +
                           `${providersWithIssues} with issues, ` +
                           `storage ${storageIntegrity.success ? 'healthy' : 'has issues'}`;
      
      console.log('🏁 Comprehensive diagnostics completed:', diagnostics.summary);
      
    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      diagnostics.summary = `Diagnostics failed: ${error.message}`;
      diagnostics.details.recommendations.push('Restart plugin and check console for errors');
    }
    
    return diagnostics;
  }

  /**
   * Diagnose individual provider with detailed analysis
   */
  private async diagnoseProvider(providerId: string, registration: ProviderRegistration): Promise<{
    providerId: string;
    issues: string[];
    recommendations: string[];
    state: {
      hasProvider: boolean;
      hasApiKey: boolean;
      configuredApiKey: boolean;
      authenticated: boolean;
      enabled: boolean;
    };
  }> {
    const diagnosis = {
      providerId,
      issues: [] as string[],
      recommendations: [] as string[],
      state: {
        hasProvider: !!registration.provider,
        hasApiKey: !!(registration.provider as any)?.apiKey,
        configuredApiKey: registration.config.hasApiKey,
        authenticated: registration.config.authenticated,
        enabled: registration.config.enabled
      }
    };
    
    // Check provider instance
    if (!registration.provider) {
      diagnosis.issues.push('Provider instance is missing');
      diagnosis.recommendations.push(`Re-register provider ${providerId}`);
      return diagnosis;
    }
    
    // Check API key consistency
    const hasActualKey = !!(registration.provider as any)?.apiKey;
    const configSaysHasKey = registration.config.hasApiKey;
    
    if (configSaysHasKey && !hasActualKey) {
      diagnosis.issues.push('Configuration claims API key exists but provider has none');
      diagnosis.recommendations.push(`Recover API key for ${providerId} from secure storage`);
    }
    
    if (!configSaysHasKey && hasActualKey) {
      diagnosis.issues.push('Provider has API key but configuration says it doesn\'t');
      diagnosis.recommendations.push(`Update configuration for ${providerId}`);
    }
    
    // Check authentication consistency
    if (registration.config.authenticated && !hasActualKey) {
      diagnosis.issues.push('Marked as authenticated but has no API key');
      diagnosis.recommendations.push(`Re-authenticate ${providerId}`);
    }
    
    // Check secure storage consistency
    try {
      const storedKey = await this.secureStorage.getApiKey(providerId);
      const hasStoredKey = !!storedKey;
      
      if (configSaysHasKey && !hasStoredKey) {
        diagnosis.issues.push('Configuration claims API key but none found in secure storage');
        diagnosis.recommendations.push(`Re-enter API key for ${providerId}`);
      }
      
      if (hasActualKey && hasStoredKey && storedKey !== (registration.provider as any).apiKey) {
        diagnosis.issues.push('API key in provider differs from stored key');
        diagnosis.recommendations.push(`Reload API key from secure storage for ${providerId}`);
      }
    } catch (error) {
      diagnosis.issues.push(`Cannot access secure storage: ${error.message}`);
      diagnosis.recommendations.push(`Check secure storage integrity for ${providerId}`);
    }
    
    return diagnosis;
  }

  /**
   * Attempt automatic recovery of provider system issues
   */
  async attemptSystemRecovery(): Promise<{
    success: boolean;
    actionsPerformed: string[];
    remainingIssues: string[];
  }> {
    console.log('🚑 Starting automatic system recovery...');
    
    const recovery = {
      success: false,
      actionsPerformed: [] as string[],
      remainingIssues: [] as string[]
    };
    
    try {
      // Step 1: Run diagnostics to identify issues
      const diagnostics = await this.performComprehensiveDiagnostics();
      
      if (diagnostics.success) {
        recovery.success = true;
        recovery.actionsPerformed.push('System is healthy - no recovery needed');
        return recovery;
      }
      
      // Step 2: Attempt secure storage recovery
      if (!diagnostics.details.secureStorage.success) {
        console.log('🔧 Attempting secure storage recovery...');
        try {
          // Re-initialize secure storage
          const newSecureStorage = new (this.secureStorage.constructor as any)(
            this.plugin, 
            { pluginId: 'obsius', dataKey: 'secureApiKeys' }
          );
          this.secureStorage = newSecureStorage;
          recovery.actionsPerformed.push('Secure storage re-initialized');
        } catch (error) {
          recovery.remainingIssues.push(`Secure storage recovery failed: ${error.message}`);
        }
      }
      
      // Step 3: Attempt provider recovery
      for (const [providerId, providerDiag] of Object.entries(diagnostics.details.providers)) {
        if (providerDiag.issues.length > 0) {
          console.log(`🔧 Attempting recovery for provider: ${providerId}`);
          try {
            await this.attemptProviderRecovery(providerId);
            recovery.actionsPerformed.push(`Recovered provider: ${providerId}`);
          } catch (error) {
            recovery.remainingIssues.push(`Provider ${providerId} recovery failed: ${error.message}`);
          }
        }
      }
      
      // Step 4: Re-run diagnostics to check if recovery was successful
      console.log('🔍 Re-running diagnostics after recovery...');
      const postRecoveryDiagnostics = await this.performComprehensiveDiagnostics();
      recovery.success = postRecoveryDiagnostics.success;
      
      if (recovery.success) {
        recovery.actionsPerformed.push('Recovery completed successfully');
      } else {
        recovery.remainingIssues.push('Some issues remain after recovery');
      }
      
    } catch (error) {
      console.error('❌ System recovery failed:', error);
      recovery.remainingIssues.push(`Recovery process failed: ${error.message}`);
    }
    
    console.log('🏁 System recovery completed:', {
      success: recovery.success,
      actionsCount: recovery.actionsPerformed.length,
      issuesCount: recovery.remainingIssues.length
    });
    
    return recovery;
  }

  /**
   * Get detailed system health report
   */
  async getHealthReport(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    summary: string;
    details: any;
    recommendations: string[];
  }> {
    const diagnostics = await this.performComprehensiveDiagnostics();
    
    let score = 0;
    let maxScore = 0;
    
    // Score initialization (10 points)
    maxScore += 10;
    if (diagnostics.details.initialization) score += 10;
    
    // Score secure storage (20 points)
    maxScore += 20;
    if (diagnostics.details.secureStorage.success) score += 20;
    else if (diagnostics.details.secureStorage.providers?.length > 0) score += 10;
    
    // Score providers (40 points)
    const totalProviders = Object.keys(diagnostics.details.providers).length;
    if (totalProviders > 0) {
      maxScore += 40;
      const healthyProviders = Object.values(diagnostics.details.providers)
        .filter((prov: any) => prov.issues.length === 0).length;
      score += Math.round((healthyProviders / totalProviders) * 40);
    }
    
    // Score authentication (30 points)
    const totalAuth = Object.keys(diagnostics.details.authentication).length;
    if (totalAuth > 0) {
      maxScore += 30;
      const authenticatedCount = Object.values(diagnostics.details.authentication)
        .filter((auth: any) => auth.success).length;
      score += Math.round((authenticatedCount / totalAuth) * 30);
    }
    
    const healthPercentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (healthPercentage >= 80) status = 'healthy';
    else if (healthPercentage >= 50) status = 'degraded';
    else status = 'critical';
    
    return {
      status,
      score: healthPercentage,
      summary: `System health: ${healthPercentage}% (${status}) - ${diagnostics.summary}`,
      details: diagnostics.details,
      recommendations: diagnostics.details.recommendations
    };
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