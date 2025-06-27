/**
 * CLI-style Chat View for Obsius AI Agent
 * Provides a terminal-like interface for AI chat interactions
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import ObsiusPlugin from '../../../main';
import { t, initializeI18n, formatDate, getCommandDescriptions } from '../../utils/i18n';

export const VIEW_TYPE_OBSIUS_CHAT = 'obsius-chat-view';

/**
 * CLI-style chat view for side panel display
 */
export class ChatView extends ItemView {
  private plugin: ObsiusPlugin;
  private terminalContainer: HTMLElement;
  private outputContainer: HTMLElement;
  private inputLine: HTMLElement;
  private currentInput: HTMLInputElement;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  constructor(leaf: WorkspaceLeaf, plugin: ObsiusPlugin) {
    super(leaf);
    this.plugin = plugin;
    
    // Initialize i18n with user's language preference
    initializeI18n(this.plugin.settings.ui.language);
  }

  getViewType(): string {
    return VIEW_TYPE_OBSIUS_CHAT;
  }

  getDisplayText(): string {
    return 'Obsius CLI';
  }

  getIcon(): string {
    return 'terminal';
  }

  async onOpen(): Promise<void> {
    console.log('Opening Obsius CLI view...');
    
    // Clear existing content
    const container = this.containerEl.children[1];
    container.empty();

    // Create terminal container
    this.terminalContainer = container.createDiv('obsius-terminal');
    
    // Create output area
    this.outputContainer = this.terminalContainer.createDiv('obsius-output');
    
    // Show welcome message
    this.showWelcome();
    
    // Create input line
    this.createInputLine();
    
    // Focus input
    this.currentInput.focus();
    
    console.log('Obsius CLI view opened successfully');
  }

  async onClose(): Promise<void> {
    console.log('Closing Obsius CLI view...');
    // Cleanup any resources if needed
  }

  /**
   * Show simple welcome message
   */
  private showWelcome(): void {
    this.addOutput(t('cli.welcome'));
    this.addOutput('');
    this.addOutput(t('cli.welcomeVault', { vaultName: this.getVaultName() }));
    this.addOutput('');
    this.addOutput(t('cli.welcomeHelp'));
  }

  /**
   * Get vault name for display
   */
  private getVaultName(): string {
    const vault = this.plugin.app.vault;
    return vault.getName() || 'Unknown Vault';
  }

  /**
   * Create CLI input line
   */
  private createInputLine(): void {
    this.inputLine = this.terminalContainer.createDiv('obsius-input-line');
    
    // Prompt indicator
    const prompt = this.inputLine.createSpan('obsius-prompt');
    prompt.textContent = this.getPrompt();
    
    // Input field
    this.currentInput = this.inputLine.createEl('input', {
      type: 'text',
      cls: 'obsius-input',
      placeholder: this.getInputPlaceholder()
    });
    
    // Handle input events
    this.currentInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCommand(this.currentInput.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabCompletion();
      }
    });
    
    // Auto-focus when clicking in terminal
    this.terminalContainer.addEventListener('click', () => {
      this.currentInput.focus();
    });
  }

  /**
   * Get command prompt
   */
  private getPrompt(): string {
    return t('cli.prompt');
  }

  /**
   * Get placeholder text for input
   */
  private getInputPlaceholder(): string {
    const provider = this.getCurrentProvider();
    const providerName = this.plugin.settings.providers[provider]?.name || t('provider.none');
    return t('cli.placeholder', { providerName });
  }

  /**
   * Execute command
   */
  private async executeCommand(command: string): Promise<void> {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    
    // Add to history
    this.commandHistory.unshift(trimmedCommand);
    this.historyIndex = -1;
    
    // Show command in output
    this.addCommandLine(trimmedCommand);
    
    // Clear input
    this.currentInput.value = '';
    
    // Execute command
    if (trimmedCommand.startsWith('/')) {
      await this.executeSystemCommand(trimmedCommand);
    } else {
      await this.sendChatMessage(trimmedCommand);
    }
    
    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Navigate command history
   */
  private navigateHistory(direction: number): void {
    if (this.commandHistory.length === 0) return;
    
    this.historyIndex += direction;
    
    if (this.historyIndex < -1) {
      this.historyIndex = -1;
      this.currentInput.value = '';
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length - 1;
    }
    
    if (this.historyIndex >= 0) {
      this.currentInput.value = this.commandHistory[this.historyIndex];
    }
  }

  /**
   * Handle tab completion
   */
  private handleTabCompletion(): void {
    const value = this.currentInput.value;
    const commands = ['/help', '/clear', '/provider', '/settings', '/status'];
    
    const matches = commands.filter(cmd => cmd.startsWith(value));
    if (matches.length === 1) {
      this.currentInput.value = matches[0] + ' ';
    } else if (matches.length > 1) {
      this.addOutput(t('commands.help.availableCommands', { commands: matches.join(', ') }));
    }
  }

  /**
   * Add command line to output
   */
  private addCommandLine(command: string): void {
    const line = this.outputContainer.createDiv('obsius-command-line');
    const prompt = line.createSpan('obsius-output-prompt');
    prompt.textContent = this.getPrompt();
    const cmd = line.createSpan('obsius-output-command');
    cmd.textContent = command;
  }

  /**
   * Add output line
   */
  private addOutput(text: string, type: 'normal' | 'error' | 'success' | 'info' = 'normal'): void {
    const line = this.outputContainer.createDiv(`obsius-output-line ${type}`);
    line.textContent = text;
  }

  /**
   * Execute system command
   */
  private async executeSystemCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    switch (cmd) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        this.clearOutput();
        break;
      case 'provider':
        this.showProviderInfo(args[0]);
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'status':
        this.showStatus();
        break;
      default:
        this.addOutput(t('commands.unknown.error', { command }), 'error');
        this.addOutput(t('commands.unknown.suggestion'), 'info');
    }
  }

  /**
   * Send chat message to AI
   */
  private async sendChatMessage(message: string): Promise<void> {
    const provider = this.getCurrentProvider();
    const config = this.plugin.settings.providers[provider];
    
    if (!config?.authenticated) {
      this.addOutput(t('provider.noAuthenticated'), 'error');
      this.addOutput(t('provider.checkStatus'), 'info');
      return;
    }
    
    // Show thinking indicator
    this.addOutput(t('cli.thinking'), 'info');
    
    try {
      // TODO: Integrate with AgentOrchestrator
      await this.simulateTypingDelay();
      this.addOutput(t('tools.aiIntegration'), 'info');
      this.addOutput(t('tools.placeholder'));
      
    } catch (error) {
      this.addOutput(`${t('general.error')}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    this.addOutput(t('commands.help.usage'));
    const commands = getCommandDescriptions();
    commands.forEach(({ command, description }) => {
      this.addOutput(`  ${command.padEnd(10)} ${description}`);
    });
    this.addOutput('');
    this.addOutput(t('commands.help.chatInstructions'));
  }

  /**
   * Clear output
   */
  private clearOutput(): void {
    this.outputContainer.empty();
  }

  /**
   * Show provider information
   */
  private showProviderInfo(providerId?: string): void {
    if (providerId) {
      const config = this.plugin.settings.providers[providerId];
      if (config) {
        this.addOutput(`Provider: ${config.name}`, 'info');
        const status = config.authenticated ? t('provider.connected') : t('provider.notConnected');
        this.addOutput(t('commands.provider.status', { status }));
        this.addOutput(t('commands.provider.model', { model: config.model }));
        if (config.lastVerified) {
          this.addOutput(t('commands.provider.lastVerified', { 
            date: formatDate(new Date(config.lastVerified)) 
          }));
        }
      } else {
        this.addOutput(t('commands.provider.notFound', { providerId }), 'error');
      }
    } else {
      this.addOutput(t('commands.provider.available'), 'info');
      for (const [id, config] of Object.entries(this.plugin.settings.providers)) {
        const status = config.authenticated ? '✅' : '❌';
        this.addOutput(`  ${id}: ${config.name} ${status}`);
      }
    }
  }

  /**
   * Open settings
   */
  private openSettings(): void {
    (this.plugin.app as any).setting.open();
    (this.plugin.app as any).setting.openTabById('obsius');
    this.addOutput(t('commands.settings.opened'), 'success');
  }

  /**
   * Show status
   */
  private showStatus(): void {
    const currentProvider = this.getCurrentProvider();
    const config = this.plugin.settings.providers[currentProvider];
    
    this.addOutput(t('commands.status.systemStatus'), 'info');
    this.addOutput(t('commands.status.currentProvider', { 
      provider: config?.name || t('provider.none') 
    }));
    const authStatus = config?.authenticated ? t('provider.connected') : t('provider.notConnected');
    this.addOutput(t('commands.status.authentication', { status: authStatus }));
    this.addOutput(t('commands.status.commandHistory', { count: this.commandHistory.length }));
    
    const stats = this.plugin.toolRegistry?.getStats();
    if (stats) {
      this.addOutput(t('commands.status.toolsAvailable', { count: stats.enabled }));
    }
  }

  /**
   * Simulate typing delay for demo purposes
   */
  private simulateTypingDelay(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 1000 + Math.random() * 1000);
    });
  }

  /**
   * Scroll to bottom of terminal
   */
  private scrollToBottom(): void {
    this.terminalContainer.scrollTop = this.terminalContainer.scrollHeight;
  }

  /**
   * Update prompt when provider changes
   */
  private updatePrompt(): void {
    const promptEl = this.inputLine?.querySelector('.obsius-prompt');
    if (promptEl) {
      promptEl.textContent = this.getPrompt();
    }
    
    // Update placeholder
    if (this.currentInput) {
      this.currentInput.placeholder = this.getInputPlaceholder();
    }
  }

  /**
   * Get the currently selected provider
   */
  public getCurrentProvider(): string {
    return this.plugin.settings.defaultProvider;
  }

  /**
   * Refresh provider options (called when providers are updated)
   */
  public refreshProviders(): void {
    // Update prompt with new provider info
    this.updatePrompt();
  }

  /**
   * Update language (called when language setting is changed)
   */
  public updateLanguage(): void {
    // Re-initialize i18n with new language
    initializeI18n(this.plugin.settings.ui.language);
    
    // Update prompt and placeholder
    this.updatePrompt();
  }

  /**
   * Focus input for external access
   */
  public focusInput(): void {
    this.currentInput?.focus();
  }
}