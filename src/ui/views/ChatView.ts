/**
 * CLI-style Chat View for Obsius AI Agent
 * Provides a terminal-like interface for AI chat interactions
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import ObsiusPlugin from '../../../main';
import { t, initializeI18n, formatDate, getCommandDescriptions, detectLanguageFromText, setChatLanguage } from '../../utils/i18n';
import { AgentOrchestrator, ConversationContext } from '../../core/AgentOrchestrator';
import { AssistantResponse, SessionStats } from '../../utils/types';

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
  private agentOrchestrator: AgentOrchestrator | null = null;
  private isProcessing: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: ObsiusPlugin) {
    super(leaf);
    this.plugin = plugin;
    
    // Initialize i18n with user's language preferences
    initializeI18n(this.plugin.settings.ui.interfaceLanguage, this.plugin.settings.ui.chatLanguage);
    
    // Initialize agent orchestrator
    this.initializeAgentOrchestrator();
  }

  /**
   * Initialize the agent orchestrator for AI interactions
   */
  private initializeAgentOrchestrator(): void {
    if (this.plugin.providerManager && this.plugin.toolRegistry) {
      this.agentOrchestrator = new AgentOrchestrator(
        this.plugin.app,
        this.plugin.providerManager,
        this.plugin.toolRegistry,
        this.plugin.settings
      );
    }
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
    const commands = ['/help', '/clear', '/provider', '/settings', '/status', '/tokens', '/repair'];
    
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
  private addOutput(text: string, type: 'normal' | 'error' | 'success' | 'info' = 'normal'): HTMLElement {
    const line = this.outputContainer.createDiv(`obsius-output-line ${type}`);
    line.textContent = text;
    return line;
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
      case 'tokens':
        this.showTokenStats();
        break;
      case 'repair':
        await this.repairEncryption();
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
    if (this.isProcessing) {
      this.addOutput(t('cli.thinking'), 'info');
      return;
    }

    console.log('🤖 ChatView.sendChatMessage called with:', message);

    // Auto-detect language if chat language is set to 'auto'
    if (this.plugin.settings.ui.chatLanguage === 'auto') {
      const detectedLanguage = detectLanguageFromText(message);
      setChatLanguage(detectedLanguage);
      console.log('🔤 Auto-detected language:', detectedLanguage);
    }

    const provider = this.getCurrentProvider();
    const config = this.plugin.settings.providers[provider];
    
    console.log('🔑 Current provider:', provider, 'config:', config);
    
    if (!config?.authenticated) {
      console.log('❌ Provider not authenticated');
      this.addOutput(t('provider.noAuthenticated'), 'error');
      this.addOutput(t('provider.checkStatus'), 'info');
      return;
    }

    if (!this.agentOrchestrator) {
      console.log('❌ Agent orchestrator not initialized');
      this.addOutput(t('general.error') + ': Agent orchestrator not initialized', 'error');
      return;
    }

    console.log('✅ All checks passed, proceeding with AI processing');
    
    this.isProcessing = true;
    
    try {
      // Build conversation context
      const context: ConversationContext = {
        messages: this.agentOrchestrator.getHistory(),
        currentFile: this.getCurrentFilePath(),
        workspaceState: this.getWorkspaceState(),
        userId: 'user'
      };

      // Check if streaming is enabled (default to true)
      const enableStreaming = this.plugin.settings.ui?.enableStreaming !== false;
      
      if (enableStreaming) {
        console.log('🔄 Using streaming response');
        await this.sendStreamingChatMessage(message, context);
      } else {
        console.log('⏳ Using non-streaming response');
        await this.sendNonStreamingChatMessage(message, context);
      }
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      this.addOutput(`${t('general.error')}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send chat message with streaming response
   */
  private async sendStreamingChatMessage(message: string, context: ConversationContext): Promise<void> {
    console.log('🔄 Starting streaming chat message processing');
    
    // Show processing indicator
    const processingLine = this.addOutput('🤔 Thinking...', 'info');
    
    // Create streaming output line
    const streamingLine = this.addOutput('', 'normal');
    let accumulatedContent = '';
    let isFirstChunk = true;
    
    // Process message with streaming AI
    const response = await this.agentOrchestrator!.processMessageStreaming(
      message, 
      context,
      (chunk) => {
        console.log('📦 Received chunk:', chunk);
        
        // Remove processing indicator on first content
        if (isFirstChunk && chunk.content && processingLine.parentNode) {
          processingLine.parentNode.removeChild(processingLine);
          isFirstChunk = false;
        }
        
        if (chunk.content) {
          accumulatedContent += chunk.content;
          streamingLine.textContent = accumulatedContent;
          
          // Auto-scroll to keep the streaming content visible
          this.scrollToBottom();
        }
        
        if (chunk.isComplete) {
          console.log('✅ Streaming complete');
        }
      },
      {
        providerId: this.getCurrentProvider()  // Pass specific provider ID
      }
    );
    
    console.log('📋 Final response:', response);
    this.displayActionResults(response);
    this.displayTokenUsage();
  }

  /**
   * Send chat message without streaming (fallback)
   */
  private async sendNonStreamingChatMessage(message: string, context: ConversationContext): Promise<void> {
    // Show thinking indicator
    const thinkingLine = this.addOutput(t('cli.thinking'), 'info');
    
    // Process message with AI
    const response = await this.agentOrchestrator!.processMessage(message, context, {
      providerId: this.getCurrentProvider()  // Pass specific provider ID
    });
    
    // Remove thinking indicator
    if (thinkingLine.parentNode) {
      thinkingLine.parentNode.removeChild(thinkingLine);
    }
    
    // Display AI response
    this.addOutput(response.message.content);
    
    this.displayActionResults(response);
    this.displayTokenUsage();
  }

  /**
   * Display token usage information
   */
  private displayTokenUsage(): void {
    if (!this.agentOrchestrator) return;
    
    const stats: SessionStats = this.agentOrchestrator.getSessionStats();
    const costStr = stats.totalCost > 0 ? ` ($${stats.totalCost.toFixed(4)})` : '';
    this.addOutput(`📊 Session: ${stats.totalTokens} tokens, ${stats.requestCount} requests${costStr}`, 'info');
  }

  /**
   * Display action results and file summaries
   */
  private displayActionResults(response: AssistantResponse): void {
    // Display action results if any
    if (response.actions && response.actions.length > 0) {
      this.addOutput(''); // Empty line for spacing
      
      for (const action of response.actions) {
        if (action.result?.success) {
          this.addOutput(`✅ ${action.description}: ${action.result.message}`, 'success');
          
          // Show additional details if available
          if (action.result.data) {
            const data = action.result.data;
            if (data.path) {
              this.addOutput(`   📄 ${data.path}`, 'info');
            }
            if (data.title) {
              this.addOutput(`   📝 ${data.title}`, 'info');
            }
          }
        } else {
          this.addOutput(`❌ ${action.description}: ${action.result?.message || 'Failed'}`, 'error');
        }
      }
    }
    
    // Show files created/modified summary
    if (response.filesCreated && response.filesCreated.length > 0) {
      this.addOutput(''); // Empty line
      this.addOutput(`📄 Created ${response.filesCreated.length} file(s):`, 'success');
      response.filesCreated.forEach((file: string) => {
        this.addOutput(`   • ${file}`, 'info');
      });
    }
    
    if (response.filesModified && response.filesModified.length > 0) {
      this.addOutput(''); // Empty line
      this.addOutput(`📝 Modified ${response.filesModified.length} file(s):`, 'success');
      response.filesModified.forEach((file: string) => {
        this.addOutput(`   • ${file}`, 'info');
      });
    }
  }

  /**
   * Get current file path
   */
  private getCurrentFilePath(): string | undefined {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    return activeFile?.path;
  }

  /**
   * Get current workspace state
   */
  private getWorkspaceState(): any {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    return {
      activeFile: activeFile?.path,
      openTabs: this.plugin.app.workspace.getLeavesOfType('markdown').map(leaf => {
        const view = leaf.view as { file?: { path: string } };
        return view.file?.path || '';
      }).filter(path => path)
    };
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
    // Add tokens command manually for now
    this.addOutput(`  /tokens    Show detailed token usage statistics`);
    this.addOutput(`  /repair    Repair corrupted encryption data`);
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

    // Show session token stats
    if (this.agentOrchestrator) {
      const sessionStats = this.agentOrchestrator.getSessionStats();
      this.addOutput(`📊 Session: ${sessionStats.totalTokens} tokens, ${sessionStats.requestCount} requests`);
      if (sessionStats.totalCost > 0) {
        this.addOutput(`💰 Estimated cost: $${sessionStats.totalCost.toFixed(4)}`);
      }
    }
  }

  /**
   * Show detailed token statistics
   */
  private showTokenStats(): void {
    if (!this.agentOrchestrator) {
      this.addOutput('Token tracking not available', 'error');
      return;
    }

    const stats: SessionStats = this.agentOrchestrator.getSessionStats();
    
    this.addOutput('📊 Token Usage Statistics', 'info');
    this.addOutput(`Total Tokens: ${stats.totalTokens}`);
    this.addOutput(`Total Requests: ${stats.requestCount}`);
    
    if (stats.totalCost > 0) {
      this.addOutput(`Estimated Cost: $${stats.totalCost.toFixed(4)}`);
    }
    
    // Provider breakdown
    if (Object.keys(stats.providerStats).length > 0) {
      this.addOutput(''); // Empty line
      this.addOutput('Provider Breakdown:', 'info');
      
      for (const [providerId, providerStat] of Object.entries(stats.providerStats)) {
        const costStr = providerStat.cost > 0 ? ` ($${providerStat.cost.toFixed(4)})` : '';
        this.addOutput(`  ${providerId}: ${providerStat.tokens} tokens, ${providerStat.requests} requests${costStr}`);
      }
    }

    // Average tokens per request
    if (stats.requestCount > 0) {
      const avgTokens = Math.round(stats.totalTokens / stats.requestCount);
      this.addOutput(''); // Empty line
      this.addOutput(`Average tokens per request: ${avgTokens}`);
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
    // Re-initialize agent orchestrator when providers change
    this.initializeAgentOrchestrator();
    
    // Update prompt with new provider info
    this.updatePrompt();
  }

  /**
   * Update language (called when language setting is changed)
   */
  public updateLanguage(): void {
    // Re-initialize i18n with new separated language settings
    initializeI18n(this.plugin.settings.ui.interfaceLanguage, this.plugin.settings.ui.chatLanguage);
    
    // Update prompt and placeholder
    this.updatePrompt();
  }

  /**
   * Repair corrupted encryption
   */
  private async repairEncryption(): Promise<void> {
    this.addOutput('🔧 Starting encryption repair...', 'info');
    
    try {
      const providerManager = this.plugin.getProviderManager();
      if (!providerManager) {
        this.addOutput('❌ Provider manager not available', 'error');
        return;
      }
      
      // Access secure storage through provider manager
      const secureStorage = (providerManager as any).secureStorage;
      if (!secureStorage) {
        this.addOutput('❌ Secure storage not available', 'error');
        return;
      }
      
      // Run integrity check first
      this.addOutput('🔍 Checking encryption integrity...', 'info');
      const integrityResult = await secureStorage.performIntegrityCheck();
      
      if (integrityResult.success) {
        this.addOutput('✅ No corruption detected', 'success');
        return;
      }
      
      this.addOutput('❌ Corruption detected:', 'error');
      integrityResult.issues.forEach((issue: string) => {
        this.addOutput(`   • ${issue}`, 'error');
      });
      
      // Attempt repair with settings reset
      this.addOutput('🗑️ Clearing corrupted data...', 'info');
      const repairSuccess = await secureStorage.repairCorruptedEncryption(
        async (affectedProviders: string[]) => {
          this.addOutput(`🔄 Resetting settings for: ${affectedProviders.join(', ')}`, 'info');
          if (providerManager && (providerManager as any).resetProviderSettings) {
            await (providerManager as any).resetProviderSettings(affectedProviders);
          }
        }
      );
      
      if (repairSuccess) {
        this.addOutput('✅ Repair successful! Authentication flags have been reset.', 'success');
        this.addOutput('💡 Use `/settings` to re-enter your API keys', 'info');
        this.addOutput('🔄 Providers have been reset to unauthenticated state', 'info');
      } else {
        this.addOutput('❌ Repair failed. Manual intervention required.', 'error');
      }
      
    } catch (error) {
      this.addOutput(`❌ Repair error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  /**
   * Focus input for external access
   */
  public focusInput(): void {
    this.currentInput?.focus();
  }
}