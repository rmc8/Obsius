/**
 * API Key Input Component
 * Secure input component for API keys with masking and validation
 */

import { Setting } from 'obsidian';
import { t } from '../../utils/i18n';
import { BaseProvider, ProviderAuthResult } from '../../core/providers/BaseProvider';

/**
 * API key input state
 */
export interface ApiKeyInputState {
  value: string;
  masked: boolean;
  validating: boolean;
  authenticated: boolean;
  error?: string;
  lastValidated?: Date;
  authInProgress: boolean;
  skipAutoValidation: boolean;
}

/**
 * API key input configuration
 */
export interface ApiKeyInputConfig {
  provider: BaseProvider;
  placeholder: string;
  description: string;
  onKeyChange: (apiKey: string) => Promise<void>;
  onAuthResult: (result: ProviderAuthResult) => void;
  initialValue?: string;
  initialAuthenticated?: boolean;
  initialLastVerified?: string;
  showTestButton?: boolean;
  autoValidate?: boolean;
}

/**
 * Secure API Key input component for Obsidian settings
 */
export class ApiKeyInput {
  private container: HTMLElement;
  private config: ApiKeyInputConfig;
  private state: ApiKeyInputState;
  private setting: Setting;
  private inputElement: HTMLInputElement | null = null;
  private statusElement: HTMLElement | null = null;
  private connectionButton: HTMLButtonElement | null = null;
  private validationTimeout: NodeJS.Timeout | null = null;

  constructor(container: HTMLElement, config: ApiKeyInputConfig) {
    this.container = container;
    this.config = config;
    this.state = {
      value: config.initialValue || '',
      masked: true,
      validating: false,
      authenticated: config.initialAuthenticated || false,
      lastValidated: config.initialLastVerified ? new Date(config.initialLastVerified) : undefined,
      authInProgress: false,
      skipAutoValidation: config.initialAuthenticated || false
    };

    this.initialize();
  }

  /**
   * Initialize the input component
   */
  private initialize(): void {
    this.setting = new Setting(this.container)
      .setName(this.config.provider.displayName)
      .setDesc(this.config.description);

    this.createInputElements();
    this.createStatusDisplay();
    
    if (this.config.showTestButton !== false) {
      this.createConnectionButton();
    }
    
    // Add input protection after all elements are created
    this.addInputProtection();

    // Auto-validate only for real API keys, not placeholders or already authenticated
    if (this.state.value && 
        this.config.autoValidate !== false && 
        !this.state.authenticated && 
        !this.state.skipAutoValidation &&
        !this.isPlaceholderValue(this.state.value)) {
      console.log(`🔑 Scheduling auto-validation for ${this.config.provider.displayName}`);
      this.scheduleValidation();
    } else if (this.state.value) {
      const reasons = [];
      if (this.config.autoValidate === false) reasons.push('autoValidate disabled');
      if (this.state.authenticated) reasons.push('already authenticated');
      if (this.state.skipAutoValidation) reasons.push('auto-validation disabled');
      if (this.isPlaceholderValue(this.state.value)) reasons.push('placeholder value');
      console.log(`🔑 Skipping auto-validation for ${this.config.provider.displayName}: ${reasons.join(', ')}`);
    }
  }

  /**
   * Check if the value is a placeholder rather than a real API key
   */
  private isPlaceholderValue(value: string): boolean {
    const placeholders = ['stored-api-key', 'api-key-stored', '••••••••'];
    return placeholders.includes(value) || 
           value.startsWith('stored-') || 
           /^•+$/.test(value) ||
           /^sk-.{1,4}\.{3,}$/.test(value) || // OpenAI prefix format: sk-p...
           /^sk-ant-.{1,4}\.{3,}$/.test(value) || // Anthropic prefix format: sk-ant-ab...
           /^AI.{1,4}\.{3,}$/.test(value) || // Google prefix format: AI12...
           /^sk-.{2,4}•{8,}/.test(value) || // OpenAI masked format: sk-ab••••••••••
           /^sk-ant-.{2,4}•{8,}/.test(value) || // Anthropic masked format: sk-ant-ab••••••••••
           /^AI.{2,4}•{8,}/.test(value); // Google masked format
  }

  /**
   * Create input elements
   */
  private createInputElements(): void {
    this.setting.addText(text => {
      this.inputElement = text.inputEl;
      
      text
        .setPlaceholder(this.config.placeholder)
        .setValue(this.state.masked ? this.maskApiKey(this.state.value) : this.state.value)
        .onChange(async (value) => {
          await this.handleInputChange(value);
        });

      // Configure input for password-like behavior
      this.configureInputElement();
      
      // Add toggle visibility button
      this.addVisibilityToggle();
    });
  }

  /**
   * Configure input element properties
   */
  private configureInputElement(): void {
    if (!this.inputElement) return;

    // Set input type based on masked state
    this.inputElement.type = this.state.masked ? 'password' : 'text';
    this.inputElement.autocomplete = 'off';
    this.inputElement.spellcheck = false;
    
    // Add CSS classes for styling
    this.inputElement.addClass('obsius-api-key-input');
    
    // Prevent context menu on API key input for security
    this.inputElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Add visibility toggle button
   */
  private addVisibilityToggle(): void {
    if (!this.inputElement) return;

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'obsius-visibility-toggle';
    toggleButton.innerHTML = this.state.masked ? '👁️' : '🙈';
    toggleButton.title = this.state.masked ? 'Show API key' : 'Hide API key';
    
    toggleButton.addEventListener('click', () => {
      this.toggleVisibility();
    });

    // Insert after the input element
    this.inputElement.parentNode?.insertBefore(toggleButton, this.inputElement.nextSibling);
  }

  /**
   * Create status display element
   */
  private createStatusDisplay(): void {
    const statusContainer = document.createElement('div');
    statusContainer.className = 'obsius-api-key-status';
    
    this.statusElement = document.createElement('span');
    this.statusElement.className = 'obsius-status-text';
    
    statusContainer.appendChild(this.statusElement);
    this.setting.descEl.appendChild(statusContainer);
    
    this.updateStatusDisplay();
  }

  /**
   * Create connection button with enhanced interaction protection
   */
  private createConnectionButton(): void {
    this.setting.addButton(button => {
      this.connectionButton = button.buttonEl;
      
      button
        .setButtonText(t('settings.connect'))
        .setClass('obsius-connection-button')
        .onClick(async () => {
          // Prevent rapid clicking
          if (this.connectionButton && this.connectionButton.disabled) {
            return;
          }
          
          await this.testConnection();
        });
      
      // Add double-click protection
      this.connectionButton.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Add keyboard handling
      this.connectionButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (this.connectionButton && this.connectionButton.disabled) {
            e.preventDefault();
            return;
          }
        }
      });
    });
  }

  /**
   * Handle input value change with enhanced state protection
   */
  private async handleInputChange(value: string): Promise<void> {
    // Unmask the value if it was masked
    const actualValue = this.state.masked && value === this.maskApiKey(this.state.value) 
      ? this.state.value 
      : value;

    // Skip processing for placeholder values
    if (this.isPlaceholderValue(actualValue)) {
      console.log(`🔑 Skipping auto-validation for placeholder value: ${actualValue}`);
      return;
    }

    // Prevent cascading authentication during input change
    if (this.state.authInProgress) {
      console.log(`🔑 Skipping input change processing - authentication in progress`);
      return;
    }

    // Prevent rapid changes during processing
    if (this.state.validating) {
      console.log(`🔑 Skipping input change - validation in progress`);
      return;
    }

    this.state.value = actualValue;
    this.state.authenticated = false;
    this.state.error = undefined;
    this.state.skipAutoValidation = false; // Reset for new input

    // Clear previous validation timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }

    // Update UI
    this.updateStatusDisplay();

    // Save the key with error handling
    try {
      await this.config.onKeyChange(actualValue);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to save API key';
      this.updateStatusDisplay();
      return;
    }

    // Schedule auto-validation only for real API keys, not placeholders, and not if already authenticated
    if (actualValue && 
        this.config.autoValidate !== false && 
        !this.state.skipAutoValidation &&
        !this.state.authenticated &&
        !this.isPlaceholderValue(actualValue)) {
      console.log(`🔄 Scheduling auto-validation for ${this.config.provider.displayName}`);
      this.scheduleValidation();
    } else if (this.state.authenticated) {
      console.log(`🔒 Skipping auto-validation for ${this.config.provider.displayName} - already authenticated`);
    }
  }

  /**
   * Schedule validation with debounce
   */
  private scheduleValidation(delay: number = 1000): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }

    this.validationTimeout = setTimeout(() => {
      this.testConnection();
    }, delay);
  }

  /**
   * Establish connection with the provider with enhanced UI protection
   */
  private async testConnection(): Promise<void> {
    if (!this.state.value) {
      this.state.error = 'API key is required';
      this.updateStatusDisplay();
      return;
    }

    // Prevent double-execution during auth process
    if (this.state.authInProgress) {
      console.log(`🔑 Skipping testConnection - authentication already in progress`);
      return;
    }

    // If already authenticated, prevent unnecessary re-authentication
    if (this.state.authenticated) {
      // Only allow manual re-authentication after explicit user confirmation
      if (this.state.skipAutoValidation) {
        console.log(`🔒 Skipping re-authentication for ${this.config.provider.displayName} - already authenticated and locked`);
        return;
      }
      
      // For manual button clicks, ask for confirmation
      const confirmReauth = confirm(`${this.config.provider.displayName} is already connected. Do you want to test the connection again?`);
      if (!confirmReauth) {
        return;
      }
      
      console.log(`🔄 User confirmed re-authentication for ${this.config.provider.displayName}`);
    }

    // Immediate UI feedback and protection
    this.state.authInProgress = true;
    this.state.validating = true;
    this.state.error = undefined;
    this.updateStatusDisplay();
    this.disableUserInteraction();

    try {
      // Set the API key and test
      this.config.provider.setApiKey(this.state.value);
      const result = await this.config.provider.testAuthentication();

      this.state.validating = false;
      this.state.authenticated = result.success;
      this.state.lastValidated = new Date();
      
      if (result.success) {
        // Permanently disable auto-validation and lock authentication state
        this.state.skipAutoValidation = true;
        console.log(`✅ Authentication successful for ${this.config.provider.displayName} - PERMANENT LOCK ENABLED`);
        console.log(`🔒 Authentication state PERMANENTLY LOCKED for ${this.config.provider.displayName}:`, {
          authenticated: this.state.authenticated,
          hasApiKey: !!this.state.value,
          lastValidated: this.state.lastValidated,
          skipAutoValidation: this.state.skipAutoValidation
        });
        
        // Clear any pending validation timeouts
        if (this.validationTimeout) {
          clearTimeout(this.validationTimeout);
          this.validationTimeout = null;
        }
      } else {
        this.state.error = result.error || 'Authentication failed';
        console.log(`❌ Authentication failed for ${this.config.provider.displayName}:`, result.error);
      }

      // Notify parent about auth result with enhanced logging
      console.log(`📤 Sending auth result for ${this.config.provider.displayName}:`, {
        success: result.success,
        hasError: !!result.error,
        modelsCount: result.models?.length || 0
      });
      this.config.onAuthResult(result);

    } catch (error) {
      this.state.validating = false;
      this.state.authenticated = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.state.authInProgress = false;
      this.updateStatusDisplay();
      this.enableUserInteraction();
    }
  }

  /**
   * Toggle API key visibility
   */
  private toggleVisibility(): void {
    this.state.masked = !this.state.masked;
    
    if (this.inputElement) {
      this.inputElement.type = this.state.masked ? 'password' : 'text';
      
      // Update the displayed value
      if (this.state.masked) {
        this.inputElement.value = this.maskApiKey(this.state.value);
      } else {
        this.inputElement.value = this.state.value;
      }
    }

    // Update toggle button
    const toggleButton = this.container.querySelector('.obsius-visibility-toggle') as HTMLButtonElement;
    if (toggleButton) {
      toggleButton.innerHTML = this.state.masked ? '👁️' : '🙈';
      toggleButton.title = this.state.masked ? 'Show API key' : 'Hide API key';
    }
  }

  /**
   * Mask API key for display
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '••••••••';
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '•'.repeat(Math.max(8, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Update status display
   */
  private updateStatusDisplay(): void {
    if (!this.statusElement) return;

    this.statusElement.className = 'obsius-status-text';
    
    if (this.state.validating) {
      this.statusElement.textContent = '🔄 Connecting...';
      this.statusElement.addClass('validating');
    } else if (this.state.error) {
      this.statusElement.textContent = `❌ ${this.state.error}`;
      this.statusElement.addClass('error');
    } else if (this.state.authenticated) {
      const timeStr = this.state.lastValidated?.toLocaleTimeString() || '';
      this.statusElement.textContent = `✅ Connected (${timeStr})`;
      this.statusElement.addClass('success');
    } else if (this.state.value) {
      this.statusElement.textContent = '⏳ Not verified';
      this.statusElement.addClass('pending');
    } else {
      this.statusElement.textContent = '';
    }

    // Update connection button state with enhanced feedback
    if (this.connectionButton) {
      if (this.state.validating) {
        this.connectionButton.disabled = true;
        this.connectionButton.textContent = 'Connecting...';
        this.connectionButton.addClass('obsius-button-connecting');
      } else if (this.state.authenticated) {
        this.connectionButton.disabled = false;
        this.connectionButton.textContent = 'Connected';
        this.connectionButton.removeClass('obsius-button-connecting');
        this.connectionButton.addClass('obsius-button-connected');
      } else if (!this.state.value) {
        this.connectionButton.disabled = true;
        this.connectionButton.textContent = t('settings.connect');
        this.connectionButton.removeClass('obsius-button-connecting', 'obsius-button-connected');
      } else {
        this.connectionButton.disabled = false;
        this.connectionButton.textContent = t('settings.connect');
        this.connectionButton.removeClass('obsius-button-connecting', 'obsius-button-connected');
      }
    }
  }

  /**
   * Set API key programmatically
   */
  setApiKey(apiKey: string): void {
    this.state.value = apiKey;
    this.state.authenticated = false;
    this.state.error = undefined;

    if (this.inputElement) {
      this.inputElement.value = this.state.masked ? this.maskApiKey(apiKey) : apiKey;
    }

    this.updateStatusDisplay();
  }

  /**
   * Get current API key
   */
  getApiKey(): string {
    return this.state.value;
  }

  /**
   * Get authentication state
   */
  getAuthState(): {
    authenticated: boolean;
    validating: boolean;
    error?: string;
    lastValidated?: Date;
  } {
    return {
      authenticated: this.state.authenticated,
      validating: this.state.validating,
      error: this.state.error,
      lastValidated: this.state.lastValidated
    };
  }

  /**
   * Disable user interaction during sensitive operations
   */
  private disableUserInteraction(): void {
    if (this.inputElement) {
      this.inputElement.disabled = true;
    }
    
    if (this.connectionButton) {
      this.connectionButton.disabled = true;
    }
    
    // Disable visibility toggle
    const toggleButton = this.container.querySelector('.obsius-visibility-toggle') as HTMLButtonElement;
    if (toggleButton) {
      toggleButton.disabled = true;
    }
  }

  /**
   * Re-enable user interaction after operations complete
   */
  private enableUserInteraction(): void {
    if (this.inputElement) {
      this.inputElement.disabled = false;
    }
    
    // Connection button state will be handled by updateStatusDisplay()
    
    // Re-enable visibility toggle
    const toggleButton = this.container.querySelector('.obsius-visibility-toggle') as HTMLButtonElement;
    if (toggleButton) {
      toggleButton.disabled = false;
    }
  }

  /**
   * Add input protection against rapid changes
   */
  private addInputProtection(): void {
    if (!this.inputElement) return;
    
    // Debounce input changes
    let inputTimeout: NodeJS.Timeout | null = null;
    const originalOnChange = this.inputElement.onchange;
    
    this.inputElement.addEventListener('input', (e) => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
      
      inputTimeout = setTimeout(() => {
        if (originalOnChange) {
          originalOnChange.call(this.inputElement, e);
        }
      }, 300); // 300ms debounce
    });
    
    // Prevent paste spam
    this.inputElement.addEventListener('paste', (e) => {
      if (this.state.authInProgress || this.state.validating) {
        e.preventDefault();
        return;
      }
    });
    
    // Prevent rapid key events during processing
    this.inputElement.addEventListener('keydown', (e) => {
      if (this.state.authInProgress || this.state.validating) {
        if (e.key !== 'Tab' && e.key !== 'Escape') {
          e.preventDefault();
        }
      }
    });
  }

  /**
   * Destroy the component and clean up
   */
  destroy(): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    // Clear sensitive data
    this.state.value = '';
    this.config.provider.clearApiKey();
    
    // Clean up event listeners
    if (this.inputElement) {
      this.inputElement.removeEventListener('input', () => {});
      this.inputElement.removeEventListener('paste', () => {});
      this.inputElement.removeEventListener('keydown', () => {});
    }
    
    if (this.connectionButton) {
      this.connectionButton.removeEventListener('dblclick', () => {});
      this.connectionButton.removeEventListener('keydown', () => {});
    }
  }
}