/**
 * API Key Input Component
 * Secure input component for API keys with masking and validation
 */

import { Setting } from 'obsidian';
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
  private testButton: HTMLButtonElement | null = null;
  private validationTimeout: NodeJS.Timeout | null = null;

  constructor(container: HTMLElement, config: ApiKeyInputConfig) {
    this.container = container;
    this.config = config;
    this.state = {
      value: config.initialValue || '',
      masked: true,
      validating: false,
      authenticated: config.initialAuthenticated || false,
      lastValidated: config.initialLastVerified ? new Date(config.initialLastVerified) : undefined
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
      this.createTestButton();
    }

    // Auto-validate only for real API keys, not placeholders or already authenticated
    if (this.state.value && 
        this.config.autoValidate !== false && 
        !this.state.authenticated && 
        !this.isPlaceholderValue(this.state.value)) {
      console.log(`🔑 Scheduling auto-validation for ${this.config.provider.displayName}`);
      this.scheduleValidation();
    } else if (this.state.value) {
      const reasons = [];
      if (this.config.autoValidate === false) reasons.push('autoValidate disabled');
      if (this.state.authenticated) reasons.push('already authenticated');
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
   * Create connection button
   */
  private createTestButton(): void {
    this.setting.addButton(button => {
      this.testButton = button.buttonEl;
      
      button
        .setButtonText('Connection')
        .setClass('obsius-test-button')
        .onClick(async () => {
          await this.testConnection();
        });
    });
  }

  /**
   * Handle input value change
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

    this.state.value = actualValue;
    this.state.authenticated = false;
    this.state.error = undefined;

    // Clear previous validation timeout
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }

    // Update UI
    this.updateStatusDisplay();

    // Save the key
    try {
      await this.config.onKeyChange(actualValue);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to save API key';
      this.updateStatusDisplay();
      return;
    }

    // Schedule auto-validation only for real API keys, not placeholders
    if (actualValue && 
        this.config.autoValidate !== false && 
        !this.isPlaceholderValue(actualValue)) {
      this.scheduleValidation();
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
   * Establish connection with the provider
   */
  private async testConnection(): Promise<void> {
    if (!this.state.value) {
      this.state.error = 'API key is required';
      this.updateStatusDisplay();
      return;
    }

    // If already authenticated, confirm re-authentication
    if (this.state.authenticated) {
      const confirmReauth = confirm(`${this.config.provider.displayName} is already connected. Do you want to test the connection again?`);
      if (!confirmReauth) {
        return;
      }
    }

    this.state.validating = true;
    this.state.error = undefined;
    this.updateStatusDisplay();

    try {
      // Set the API key and test
      this.config.provider.setApiKey(this.state.value);
      const result = await this.config.provider.testAuthentication();

      this.state.validating = false;
      this.state.authenticated = result.success;
      this.state.lastValidated = new Date();
      
      if (!result.success) {
        this.state.error = result.error || 'Authentication failed';
      }

      // Notify parent about auth result
      this.config.onAuthResult(result);

    } catch (error) {
      this.state.validating = false;
      this.state.authenticated = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.updateStatusDisplay();
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
    if (this.testButton) {
      if (this.state.validating) {
        this.testButton.disabled = true;
        this.testButton.textContent = 'Connecting...';
        this.testButton.addClass('obsius-button-connecting');
      } else if (this.state.authenticated) {
        this.testButton.disabled = false;
        this.testButton.textContent = 'Connected';
        this.testButton.removeClass('obsius-button-connecting');
        this.testButton.addClass('obsius-button-connected');
      } else if (!this.state.value) {
        this.testButton.disabled = true;
        this.testButton.textContent = 'Connection';
        this.testButton.removeClass('obsius-button-connecting', 'obsius-button-connected');
      } else {
        this.testButton.disabled = false;
        this.testButton.textContent = 'Connection';
        this.testButton.removeClass('obsius-button-connecting', 'obsius-button-connected');
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
   * Destroy the component and clean up
   */
  destroy(): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    // Clear sensitive data
    this.state.value = '';
    this.config.provider.clearApiKey();
  }
}