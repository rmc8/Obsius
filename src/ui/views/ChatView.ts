/**
 * CLI-style Chat View for Obsius AI Agent
 * Provides a terminal-like interface for AI chat interactions
 */

import { ItemView, WorkspaceLeaf, Modal } from 'obsidian';
import ObsiusPlugin from '../../../main';
import { t, initializeI18n, formatDate, getCommandDescriptions, detectLanguageFromText, setChatLanguage } from '../../utils/i18n';
import { AgentOrchestrator, ConversationContext, AgentConfig } from '../../core/AgentOrchestrator';
import { AssistantResponse, SessionStats } from '../../utils/types';
import { VaultAnalysisWorkflow, AnalysisProgress, AnalysisData } from '../../core/analysis/VaultAnalysisWorkflow';

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
  
  // Debug mode for tracking unwanted output (enable only when needed)
  private debugTreeOutput: boolean = false;

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
    const commands = ['/help', '/clear', '/provider', '/settings', '/status', '/tokens', '/repair', '/init', '/debug-tools'];
    
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
    // Debug tracing for unwanted tree output
    if (this.debugTreeOutput && (text.includes('FOLDER STRUCTURE') || text.includes('🌳') || text.includes('├──') || text.includes('└──'))) {
      console.error('🚨 FOLDER STRUCTURE output detected!');
      console.error('Text:', text.substring(0, 200) + '...');
      console.trace('Output source trace:');
    }
    
    const line = this.outputContainer.createDiv(`obsius-output-line ${type}`);
    line.textContent = text;
    
    // Force auto-scroll regardless of settings for better UX
    this.forceAutoScroll();
    
    return line;
  }
  
  /**
   * Force auto-scroll with multiple timing strategies
   */
  private forceAutoScroll(): void {
    // Multiple scroll attempts with different timings to ensure success
    requestAnimationFrame(() => this.performScroll());
    setTimeout(() => this.performScroll(), 10);
    setTimeout(() => this.performScroll(), 50);
    setTimeout(() => this.performScroll(), 100);
  }
  
  /**
   * Perform the actual scroll operation
   */
  private performScroll(): void {
    if (!this.terminalContainer) return;
    
    const currentScrollTop = this.terminalContainer.scrollTop;
    const scrollHeight = this.terminalContainer.scrollHeight;
    const clientHeight = this.terminalContainer.clientHeight;
    
    // Only scroll if we're not at the bottom (within 50px)
    if (scrollHeight - currentScrollTop - clientHeight > 50) {
      this.terminalContainer.scrollTop = scrollHeight;
      
      // Debug scroll operation
      if (this.debugTreeOutput) {
        console.log('📜 Auto-scroll performed:', {
          before: currentScrollTop,
          after: this.terminalContainer.scrollTop,
          scrollHeight,
          clientHeight
        });
      }
    }
  }
  
  /**
   * Filter out file tree content from AI responses
   */
  private filterTreeContent(content: string): string {
    if (!content) return content;
    
    // Check if content contains tree structures
    if (content.includes('🌳') || content.includes('├──') || content.includes('└──') || content.includes('FOLDER STRUCTURE')) {
      console.warn('🚨 Filtering tree content from AI response');
      
      // Remove tree sections using the same logic as removeTreeFromStructure
      const lines = content.split('\n');
      const filteredLines: string[] = [];
      let skipSection = false;
      
      for (const line of lines) {
        // Skip folder structure section completely
        if (line.includes('🌳 FOLDER STRUCTURE:') || line.includes('══════════════════════')) {
          skipSection = true;
          continue;
        }
        
        // Skip tree structure lines
        if (line.match(/^[├│└─\s]*[├│└─]/) || line.includes('├──') || line.includes('└──')) {
          continue;
        }
        
        // Resume including lines after tree sections
        if (skipSection && (line.trim() === '' || !line.match(/[├│└─]/))) {
          skipSection = false;
        }
        
        if (!skipSection) {
          filteredLines.push(line);
        }
      }
      
      return filteredLines.join('\n').trim();
    }
    
    return content;
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
      case 'init':
        await this.initializeProject(args);
        break;
      case 'debug-tools':
        this.showDebugTools();
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
          // Filter tree content from streaming chunks
          const filteredContent = this.filterTreeContent(accumulatedContent);
          streamingLine.textContent = filteredContent;
          
          // Auto-scroll to keep the streaming content visible
          this.forceAutoScroll();
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
    
    // Display AI response with tree content filtering
    const filteredContent = this.filterTreeContent(response.message.content);
    this.addOutput(filteredContent);
    
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
          // Filter tree content from action result messages
          const filteredMessage = this.filterTreeContent(action.result.message);
          this.addOutput(`✅ ${action.description}: ${filteredMessage}`, 'success');
          
          // Show additional details if available
          if (action.result.data) {
            const data = action.result.data;
            if (data.path) {
              this.addOutput(`   📄 ${data.path}`, 'info');
            }
            if (data.title) {
              this.addOutput(`   📝 ${data.title}`, 'info');
            }
            // Filter any data structure content that might contain trees
            if (data.structure) {
              const filteredStructure = this.filterTreeContent(data.structure);
              if (filteredStructure && filteredStructure !== data.structure) {
                console.warn('🚨 Filtered tree content from action data structure');
              }
            }
          }
        } else {
          const filteredErrorMessage = this.filterTreeContent(action.result?.message || 'Failed');
          this.addOutput(`❌ ${action.description}: ${filteredErrorMessage}`, 'error');
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
    this.addOutput(`  /tokens      Show detailed token usage statistics`);
    this.addOutput(`  /repair      Repair corrupted encryption data`);
    this.addOutput(`  /init        Initialize comprehensive project exploration and analysis`);
    this.addOutput(`  /debug-tools Show detailed tool registry debug information`);
    this.addOutput('');
    this.addOutput('📖 /init command usage:');
    this.addOutput('   /init                      - Explore vault root (creates OBSIUS.md)');
    this.addOutput('   /init src                  - Explore specific directory');  
    this.addOutput('   /init . --content          - Include file content previews');
    this.addOutput('   /init . --types ts,js      - Focus on specific file types');
    this.addOutput('   /init . --max-items 1000   - Set item limit (50-1000)');
    this.addOutput('   /init . --depth 3          - Set max directory depth (1-10)');
    this.addOutput('   /init . --max-dirs 100     - Set directory scan limit (10-500)');
    this.addOutput('   /init . --help             - Show detailed help');
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
   * Display analysis progress in real-time
   */
  private displayAnalysisProgress(progress: AnalysisProgress): void {
    // Format phase indicator
    const phaseIndicator = `[${progress.phaseNumber}/${progress.totalPhases}] ${progress.phase}`;
    
    // Display current action
    this.addOutput(`${phaseIndicator}`, 'info');
    this.addOutput(`   🔄 ${progress.action}`, 'normal');
    
    // Display thinking process
    if (progress.thinking) {
      this.addOutput(`   💭 ${progress.thinking}`, 'normal');
    }
    
    // Display discoveries
    if (progress.discoveries && progress.discoveries.length > 0) {
      progress.discoveries.forEach(discovery => {
        this.addOutput(`   ${discovery}`, 'success');
      });
    }
    
    // Add spacing
    this.addOutput('', 'normal');
    
    // Ensure scroll to bottom for real-time feel
    this.scrollToBottom();
  }

  /**
   * Initialize project exploration and analysis with multi-stage workflow
   */
  private async initializeProject(args: string[]): Promise<void> {
    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
      this.showInitHelp();
      return;
    }
    
    // Parse arguments for customization
    const directory = args[0] || '.';
    const includeContent = args.includes('--content') || args.includes('-c');
    // Always enable key file sampling for OBSIUS.md generation (required for AI analysis)
    const includeKeyFiles = args.includes('--key-files') || args.includes('-k') || true;
    const maxItems = this.parseMaxItems(args);
    const fileTypes = this.parseFileTypes(args);
    const maxDepth = this.parseMaxDepth(args);
    const maxDirs = this.parseMaxDirs(args);
    // Enable debug mode for tool registry info, but prevent tree output
    const debugMode = args.includes('--debug') || args.includes('-v');
    
    // Start comprehensive multi-stage analysis
    this.addOutput('🧠 Starting comprehensive vault analysis...', 'info');
    this.addOutput('📋 This will involve 6 stages of detailed investigation', 'info');
    this.addOutput('', 'normal');
    
    try {
      // Check if OBSIUS.md exists and ask for confirmation before tool execution
      if ((directory === '.' || directory === '' || directory === '/')) {
        const existingFile = this.plugin.app.vault.getAbstractFileByPath('OBSIUS.md');
        if (existingFile) {
          const shouldUpdate = await this.confirmObsiusUpdate();
          if (!shouldUpdate) {
            this.addOutput('📄 Analysis cancelled - OBSIUS.md not updated', 'info');
            return;
          }
        }
      }
      
      // Comprehensive debugging of tool registry state
      if (debugMode) {
        this.addOutput('🔧 DEBUG MODE: Checking tool registry state...', 'info');
      }
      
      if (!this.plugin.toolRegistry) {
        this.addOutput('❌ Tool registry not available', 'error');
        this.addOutput('🔧 Plugin state:', 'info');
        this.addOutput(`   - Plugin loaded: ${!!this.plugin}`, 'info');
        this.addOutput(`   - Tool registry: ${this.plugin.toolRegistry}`, 'info');
        return;
      }
      
      // Check tool registry state
      const registryStats = this.plugin.toolRegistry.getStats();
      const debugInfo = this.plugin.toolRegistry.getDebugInfo();
      
      if (debugMode) {
        this.addOutput('📊 Tool Registry Statistics:', 'info');
        this.addOutput(`   - Total tools: ${registryStats.total}`, 'info');
        this.addOutput(`   - Enabled tools: ${registryStats.enabled}`, 'info');
        this.addOutput(`   - Disabled tools: ${registryStats.disabled}`, 'info');
        this.addOutput(`   - Registered tools: ${debugInfo.registeredTools.join(', ')}`, 'info');
        this.addOutput(`   - Enabled tools: ${debugInfo.enabledTools.join(', ')}`, 'info');
        this.addOutput(`   - Instantiated tools: ${debugInfo.instantiatedTools.join(', ')}`, 'info');
        this.addOutput('', 'normal');
      }
      
      // Specifically check for project_explorer tool
      const projectExplorerTool = this.plugin.toolRegistry.getTool('project_explorer');
      const projectExplorerMetadata = this.plugin.toolRegistry.getToolMetadata('project_explorer');
      
      if (debugMode) {
        this.addOutput('🔍 Project Explorer Tool Status:', 'info');
        this.addOutput(`   - Tool instance: ${!!projectExplorerTool}`, 'info');
        this.addOutput(`   - Tool metadata: ${!!projectExplorerMetadata}`, 'info');
        if (projectExplorerMetadata) {
          this.addOutput(`   - Enabled: ${projectExplorerMetadata.enabled}`, 'info');
          this.addOutput(`   - Category: ${projectExplorerMetadata.category}`, 'info');
          this.addOutput(`   - Risk level: ${projectExplorerMetadata.riskLevel}`, 'info');
        }
        this.addOutput('', 'normal');
      }
      
      if (!projectExplorerTool) {
        this.addOutput('❌ Project Explorer tool not available', 'error');
        this.addOutput('🔧 Possible causes:', 'info');
        this.addOutput('   • Tool not registered properly', 'info');
        this.addOutput('   • Tool disabled in settings', 'info');
        this.addOutput('   • Plugin initialization incomplete', 'info');
        
        // Check settings
        const toolEnabled = this.plugin.settings.tools.enabled.includes('project_explorer');
        this.addOutput(`   • Tool in settings: ${toolEnabled}`, 'info');
        
        if (!toolEnabled) {
          this.addOutput('', 'normal');
          this.addOutput('🔧 Auto-fixing: Adding project_explorer to enabled tools...', 'info');
          this.plugin.settings.tools.enabled.push('project_explorer');
          await this.plugin.saveSettings();
          this.addOutput('✅ Settings updated. Please try /init again.', 'success');
          return;
        }
        
        this.addOutput('', 'normal');
        this.addOutput('💡 Try: /debug-tools for detailed registry information', 'info');
        return;
      }
      
      // Execute comprehensive multi-stage vault analysis workflow
      const workflow = new VaultAnalysisWorkflow(
        this.plugin.app,
        this.plugin.toolRegistry,
        (progress: AnalysisProgress) => this.displayAnalysisProgress(progress)
      );
      
      const analysisData = await workflow.execute();
      
      // Display completion summary
      this.addOutput('✅ Comprehensive analysis complete!', 'success');
      this.addOutput(`📊 ${analysisData.vaultStructure.totalFiles} notes, ${analysisData.vaultStructure.totalFolders} folders analyzed`, 'info');
      this.addOutput(`🏷️ ${analysisData.contentPatterns.tagCategories.size} tag categories, ${analysisData.contentPatterns.frontmatterFields.size} metadata fields`, 'info');
      
      // Create enhanced OBSIUS.md file with comprehensive analysis
      if ((directory === '.' || directory === '' || directory === '/')) {
        await this.createEnhancedObsiusMdFile(analysisData);
        this.addOutput('📄 Comprehensive instructions saved to OBSIUS.md', 'success');
      }
      
    } catch (error) {
      this.addOutput(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
    
    // Ensure final scroll to show completion
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
  
  /**
   * Remove file tree structure and other detailed output from analysis data
   */
  private removeTreeFromStructure(structure: string): string {
    // Create two versions: one for chat display (minimal) and one for AI analysis (detailed)
    // This method only removes visual tree characters for chat, preserving structure info for AI
    const lines = structure.split('\n');
    const filteredLines: string[] = [];
    let skipTreeVisualization = false;
    
    for (const line of lines) {
      // Keep all summary sections intact for AI analysis
      if (line.includes('📊 PROJECT ANALYSIS SUMMARY') || 
          line.includes('📄 KEY FILE CONTENT SAMPLES:') ||
          line.includes('📋 FILE TYPE BREAKDOWN:')) {
        filteredLines.push(line);
        skipTreeVisualization = false;
        continue;
      }
      
      // Keep folder structure section header but skip only the visual tree lines
      if (line.includes('🌳 FOLDER STRUCTURE:')) {
        filteredLines.push(line);
        skipTreeVisualization = true;
        continue;
      }
      
      // Keep file content previews header but skip individual file content 
      if (line.includes('📄 FILE CONTENT PREVIEWS:')) {
        filteredLines.push(line);
        skipTreeVisualization = true;
        continue;
      }
      
      // Skip only visual tree characters (├──, │, └──) but keep folder/file names for AI
      if (skipTreeVisualization && line.match(/^[├│└─\s]*[├│└─]/)) {
        // Extract folder/file name from tree line for AI analysis
        const cleanedLine = line.replace(/^[├│└─\s]*[├│└─]\s*/, '').trim();
        if (cleanedLine && cleanedLine !== '...' && !cleanedLine.includes('───')) {
          filteredLines.push(`- ${cleanedLine}`);
        }
        continue;
      }
      
      // Include all other content for AI analysis
      if (!skipTreeVisualization || 
          line.trim() === '' || 
          line.includes(':') || 
          line.includes('###') ||
          line.includes('**')) {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  }
  
  /**
   * Parse max items argument from command args
   */
  private parseMaxItems(args: string[]): number {
    const maxItemsIndex = args.findIndex(arg => arg === '--max-items' || arg === '-m');
    if (maxItemsIndex !== -1 && maxItemsIndex + 1 < args.length) {
      const value = parseInt(args[maxItemsIndex + 1]);
      return isNaN(value) ? 1000 : Math.min(Math.max(value, 50), 1000);
    }
    return 1000;
  }
  
  /**
   * Parse file types argument from command args
   */
  private parseFileTypes(args: string[]): string[] {
    const typesIndex = args.findIndex(arg => arg === '--types' || arg === '-t');
    if (typesIndex !== -1 && typesIndex + 1 < args.length) {
      return args[typesIndex + 1].split(',').map(type => type.trim().toLowerCase());
    }
    return [];
  }
  
  /**
   * Parse max depth argument from command args
   */
  private parseMaxDepth(args: string[]): number {
    const depthIndex = args.findIndex(arg => arg === '--depth' || arg === '-d');
    if (depthIndex !== -1 && depthIndex + 1 < args.length) {
      const value = parseInt(args[depthIndex + 1]);
      return isNaN(value) ? 5 : Math.min(Math.max(value, 1), 10);
    }
    return 5;
  }
  
  /**
   * Parse max dirs argument from command args
   */
  private parseMaxDirs(args: string[]): number | undefined {
    const maxDirsIndex = args.findIndex(arg => arg === '--max-dirs' || arg === '--dirs');
    if (maxDirsIndex !== -1 && maxDirsIndex + 1 < args.length) {
      const value = parseInt(args[maxDirsIndex + 1]);
      return isNaN(value) ? undefined : Math.min(Math.max(value, 10), 500);
    }
    return undefined;
  }
  
  /**
   * Show detailed help for /init command
   */
  private showInitHelp(): void {
    this.addOutput('📖 /init command - Comprehensive Project Exploration', 'info');
    this.addOutput('', 'normal');
    this.addOutput('🎯 Purpose:', 'info');
    this.addOutput('   Initialize aggressive project exploration to provide AI with comprehensive', 'normal');
    this.addOutput('   project context. Based on gemini-cli patterns for maximum effectiveness.', 'normal');
    this.addOutput('', 'normal');
    this.addOutput('🚀 Basic Usage:', 'info');
    this.addOutput('   /init                    - Explore vault root directory', 'normal');
    this.addOutput('   /init src                - Explore specific directory', 'normal');
    this.addOutput('   /init docs               - Explore documentation folder', 'normal');
    this.addOutput('', 'normal');
    this.addOutput('⚙️  Options:', 'info');
    this.addOutput('   --content, -c           - Include file content previews', 'normal');
    this.addOutput('   --key-files, -k         - Sample key project files (README, config) for enhanced analysis', 'normal');
    this.addOutput('   --types ts,js,md        - Focus on specific file types', 'normal');
    this.addOutput('   --max-items 500         - Set item limit (50-1000, default: 1000)', 'normal');
    this.addOutput('   --depth 3               - Set max directory depth (1-10, default: 5)', 'normal');
    this.addOutput('   --max-dirs 100          - Set directory scan limit (10-500, improves performance)', 'normal');
    this.addOutput('   --debug, -v             - Enable verbose debugging output', 'normal');
    this.addOutput('   --help, -h              - Show this help message', 'normal');
    this.addOutput('', 'normal');
    this.addOutput('💡 Examples:', 'info');
    this.addOutput('   /init . --key-files                 - Enhanced analysis with key file sampling', 'normal');
    this.addOutput('   /init . --content --types ts,js     - Deep TypeScript/JavaScript analysis', 'normal');
    this.addOutput('   /init src --max-items 500           - Large project exploration', 'normal');
    this.addOutput('   /init docs --depth 2                - Shallow documentation scan', 'normal');
    this.addOutput('   /init . --max-dirs 50               - Performance-optimized scan', 'normal');
    this.addOutput('   /init . --debug                     - Debug mode for troubleshooting', 'normal');
    this.addOutput('', 'normal');
    this.addOutput('🔍 What it provides:', 'info');
    this.addOutput('   • Complete project structure visualization', 'normal');
    this.addOutput('   • File type breakdown and statistics', 'normal');
    this.addOutput('   • Gitignore-aware file filtering', 'normal');
    this.addOutput('   • Optional content previews for context', 'normal');
    this.addOutput('   • Smart key file content sampling (README, config files)', 'normal');
    this.addOutput('   • Structured output for AI analysis', 'normal');
    this.addOutput('', 'normal');
    this.addOutput('⚠️  Performance Notes:', 'info');
    this.addOutput('   • Large projects: Use --max-items to limit scope', 'normal');
    this.addOutput('   • Include content sparingly (--content) to avoid overload', 'normal');
    this.addOutput('   • Filter by file types for focused analysis', 'normal');
  }
  
  
  /**
   * Ask user for confirmation to update existing OBSIUS.md
   */
  private async confirmObsiusUpdate(): Promise<boolean> {
    return new Promise((resolve) => {
      class ConfirmModal extends Modal {
        private result: boolean = false;
        private resolve: (value: boolean) => void;
        
        constructor(app: any, resolve: (value: boolean) => void) {
          super(app);
          this.resolve = resolve;
        }
        
        onOpen() {
          const { contentEl } = this;
          contentEl.createEl('h3', { text: 'Update OBSIUS.md?' });
          contentEl.createEl('p', { 
            text: 'OBSIUS.md already exists. Would you like to update it with the new analysis?' 
          });
          
          const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
          buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';
          
          const updateButton = buttonContainer.createEl('button', {
            text: 'Update',
            cls: 'mod-cta'
          });
          updateButton.onclick = () => {
            this.result = true;
            this.close();
          };
          
          const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
          });
          cancelButton.onclick = () => {
            this.result = false;
            this.close();
          };
        }
        
        onClose() {
          this.resolve(this.result);
        }
      }
      
      const modal = new ConfirmModal(this.plugin.app, resolve);
      modal.open();
    });
  }
  
  /**
   * Create enhanced OBSIUS.md file from comprehensive analysis data
   */
  private async createEnhancedObsiusMdFile(analysisData: AnalysisData): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Generate AI-powered comprehensive analysis based on gathered data
      const aiAnalysis = await this.generateComprehensiveAnalysis(analysisData);
      
      // Create enhanced content with comprehensive insights
      const content = `---
created: ${timestamp}
tags:
  - obsius
  - ai-instructions
  - vault-guidance
analysis_version: "5.0-comprehensive"
analysis_data:
  total_files: ${analysisData.vaultStructure.totalFiles}
  total_folders: ${analysisData.vaultStructure.totalFolders}
  file_types: ${analysisData.vaultStructure.fileTypes.size}
  tag_categories: ${analysisData.contentPatterns.tagCategories.size}
  frontmatter_fields: ${analysisData.contentPatterns.frontmatterFields.size}
---

# OBSIUS AI Instructions

*Comprehensive vault analysis completed on ${new Date().toLocaleDateString()}*

## 🎯 Vault Context & Analysis

${aiAnalysis}

## 📋 Detailed Vault Characteristics

### File System Structure
- **Total Files**: ${analysisData.vaultStructure.totalFiles}
- **Total Folders**: ${analysisData.vaultStructure.totalFolders}
- **File Types**: ${Array.from(analysisData.vaultStructure.fileTypes.entries()).map(([ext, count]) => `${ext} (${count})`).join(', ')}

### Content Organization Patterns
- **Frontmatter Fields**: ${Array.from(analysisData.contentPatterns.frontmatterFields.keys()).join(', ')}
- **Tag Categories**: ${Array.from(analysisData.contentPatterns.tagCategories.keys()).join(', ')}
- **Naming Conventions**: ${analysisData.contentPatterns.namingConventions.join(', ')}

### Identified Insights
- **Primary Domains**: ${analysisData.insights.primaryDomains.join(', ') || 'Analysis in progress'}
- **Workflow Patterns**: ${analysisData.insights.workflowPatterns.join(', ') || 'Analysis in progress'}
- **Organization Principles**: ${analysisData.insights.organizationPrinciples.join(', ') || 'Analysis in progress'}

## 🚀 AI Agent Operating Instructions

### Core Principles
1. **Respect Established Structure**: Always work within the existing organizational framework
2. **Maintain Metadata Consistency**: Use the identified frontmatter patterns and tag categories
3. **Follow Naming Conventions**: Adhere to the detected naming patterns
4. **Preserve Link Relationships**: Respect existing note relationships and linking patterns

### Operational Guidelines
- When creating new notes, place them in appropriate folders based on content type
- Use consistent frontmatter fields: ${Array.from(analysisData.contentPatterns.frontmatterFields.keys()).slice(0, 5).join(', ')}
- Apply relevant tags from categories: ${Array.from(analysisData.contentPatterns.tagCategories.keys()).slice(0, 5).join(', ')}
- Follow established naming conventions for consistency

---

*This comprehensive analysis was generated through multi-stage vault investigation. Re-run \`/init\` to update based on vault changes.*
`;

      // Save the enhanced OBSIUS.md file
      const obsiusFile = this.plugin.app.vault.getAbstractFileByPath('OBSIUS.md');
      if (obsiusFile) {
        await this.plugin.app.vault.modify(obsiusFile as any, content);
      } else {
        await this.plugin.app.vault.create('OBSIUS.md', content);
      }
      
    } catch (error) {
      console.error('Failed to create enhanced OBSIUS.md:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive AI analysis from analysis data
   */
  private async generateComprehensiveAnalysis(analysisData: AnalysisData): Promise<string> {
    if (!this.agentOrchestrator) {
      return 'This vault serves as a comprehensive knowledge management system. Detailed AI analysis requires AgentOrchestrator to be available.';
    }

    const analysisPrompt = `[COMPREHENSIVE VAULT ANALYSIS - CLAUDE CODE QUALITY LEVEL]

Based on the comprehensive analysis data below, provide specific, actionable AI agent instructions for working with this Obsidian vault.

## ANALYSIS DATA SUMMARY:

### Vault Structure:
- Total Files: ${analysisData.vaultStructure.totalFiles}
- Total Folders: ${analysisData.vaultStructure.totalFolders}
- File Types: ${Array.from(analysisData.vaultStructure.fileTypes.entries()).map(([ext, count]) => `${ext}: ${count} files`).join(', ')}

### Content Patterns:
- Frontmatter Fields: ${Array.from(analysisData.contentPatterns.frontmatterFields.entries()).map(([field, count]) => `${field} (${count})`).join(', ')}
- Tag Categories: ${Array.from(analysisData.contentPatterns.tagCategories.entries()).map(([tag, count]) => `${tag} (${count})`).join(', ')}
- Naming Conventions: ${analysisData.contentPatterns.namingConventions.join(', ')}

## REQUIREMENTS:
1. Reference SPECIFIC data points from the analysis above
2. Create CONCRETE workflows based on observed patterns
3. Provide ACTIONABLE guidance for AI agents
4. Include SPECIFIC folder/file organization rules
5. NO generic PKM advice - vault-specific only

Generate comprehensive, specific instructions covering:
- Vault purpose and domain analysis
- Folder-by-folder usage guidelines  
- Content creation workflows
- Metadata and tagging standards
- Relationship and linking patterns
- Specific constraints and rules

[PROCEED WITH CONCRETE, DATA-DRIVEN ANALYSIS]`;

    try {
      const context: ConversationContext = {
        messages: [],
        currentFile: undefined,
        workspaceState: this.getWorkspaceState()
      };
      
      const config: AgentConfig = {
        maxTokens: 3000,
        streaming: false,
        temperature: 0.1
      };
      
      const aiResponse = await this.agentOrchestrator.processMessage(analysisPrompt, context, config);
      
      if (aiResponse?.message?.content) {
        return aiResponse.message.content;
      } else {
        return 'Comprehensive analysis data has been collected. AI-powered insights will be enhanced in future iterations.';
      }
      
    } catch (error) {
      console.warn('AI analysis generation failed:', error);
      return 'Comprehensive analysis data has been collected. AI-powered insights will be enhanced in future iterations.';
    }
  }

  /**
   * Create enhanced OBSIUS.md file with AI-powered intelligent analysis (legacy method)
   */
  private async createObsiusMdFile(structure: string, data: any): Promise<void> {
    try {
      
      const timestamp = new Date().toISOString();
      
      // Extract basic statistics from structure data
      const totalFilesMatch = structure.match(/📄 Total Files:\s*(\d+)/);
      const totalFoldersMatch = structure.match(/📁 Total Folders:\s*(\d+)/);
      const totalFiles = totalFilesMatch ? parseInt(totalFilesMatch[1]) : 0;
      const totalFolders = totalFoldersMatch ? parseInt(totalFoldersMatch[1]) : 0;
      
      // Extract key file samples from the structure if available
      let keyFileSamples = '';
      const keyFilesSection = structure.match(/📄 KEY FILE CONTENT SAMPLES:([\s\S]*?)$/);
      if (keyFilesSection && keyFilesSection[1]) {
        keyFileSamples = keyFilesSection[1].trim();
        console.log('🔍 Key file samples found:', keyFileSamples.length, 'characters');
      } else {
        console.warn('⚠️ No key file samples found in structure');
        console.log('Structure content:', structure.substring(0, 500));
      }
      
      // Extract just the summary without the full tree structure for AI analysis
      const structureForAI = structure.split('🌳 FOLDER STRUCTURE:')[0]?.trim() || structure;
      
      // Initialize default values
      let aiAnalysis = '';
      
      // Perform AI analysis if AgentOrchestrator is available and we have content to analyze
      if (this.agentOrchestrator && (keyFileSamples || structure)) {
        
        try {
          // Prepare content for AI analysis with enhanced Claude Code quality approach
          const analysisPrompt = `[COMPREHENSIVE VAULT ANALYSIS - CLAUDE CODE QUALITY LEVEL]

You are an expert AI agent analyzer tasked with creating comprehensive, actionable instructions for working with this specific Obsidian vault. Your analysis MUST be concrete, specific, and directly based on the actual structure and content provided.

## STRICT REQUIREMENTS:
1. NO GENERIC STATEMENTS - Every recommendation must reference actual folders/files found
2. MANDATORY FOLDER REFERENCES - You must explicitly name every major folder discovered  
3. CONCRETE EXAMPLES - Use actual file names and content patterns observed
4. SPECIFIC WORKFLOWS - Base all guidance on observable organizational patterns

**VAULT STRUCTURE DATA:**
${structureForAI}

${keyFileSamples ? `**ACTUAL FILE CONTENT ANALYSIS:**
${keyFileSamples}` : ''}

## ANALYSIS FRAMEWORK (Address each section with SPECIFIC vault details):

### 🎯 VAULT IDENTITY & PURPOSE
Analyze the actual content and structure to determine:
- What type of knowledge management system this represents (academic, professional, personal, technical)
- Primary knowledge domains based on folder names and file samples
- The user's expertise areas evidenced by file organization
- Specific use cases supported by the structure

### 🗂️ MANDATORY FOLDER-BY-FOLDER ANALYSIS
For EVERY major folder found, provide:
- **Exact folder name and purpose**
- **Typical content types stored there**  
- **AI interaction patterns specific to that folder**
- **Navigation and search strategies**

### 📝 CONTENT PATTERN ANALYSIS
Based on actual file samples, identify:
- **Frontmatter standards** (specific fields used, formats, conventions)
- **Tagging taxonomy** (actual tags observed, categorization patterns)
- **File naming conventions** (formats, dates, prefixes, patterns)
- **Note linking patterns** (how notes connect, reference styles)
- **Template usage** (if any templates are detected)

### ⚡ VAULT-SPECIFIC AI WORKFLOWS
Create concrete workflows for:
- **Note creation** - Where different types go, what templates to use
- **Content discovery** - How to find information effectively  
- **Knowledge linking** - Connection strategies for this vault
- **Maintenance tasks** - Organization and cleanup patterns

### 🚫 ABSOLUTE CONSTRAINTS & RULES
Based on observed patterns, establish:
- **Forbidden actions** that would break vault organization
- **Required formats** for different content types
- **Mandatory metadata** that must be preserved
- **Structural integrity rules** that maintain the system

### 💡 OPTIMIZATION OPPORTUNITIES
Identify specific improvements:
- **Underutilized folders** that could be better leveraged
- **Missing connections** between related content areas
- **Workflow enhancements** specific to this vault's patterns
- **AI assistance strategies** tailored to the content domains

## OUTPUT REQUIREMENTS:
- Reference at least 5 specific folder names from the actual structure
- Quote actual file names where relevant
- Use concrete examples from the provided samples
- Avoid any generic PKM advice
- Make every instruction vault-specific and actionable

CRITICAL: If you cannot identify specific folders, file patterns, or content examples, explicitly state what is missing rather than providing generic guidance.

[PROCEED WITH CONCRETE, SPECIFIC ANALYSIS]`;

          // Debug: Log what's being sent to AI
          console.log('🧠 AI Analysis Prompt Length:', analysisPrompt.length);
          console.log('🧠 Structure for AI Length:', structureForAI.length);
          console.log('🧠 Key File Samples Length:', keyFileSamples.length);
          console.log('🧠 First 200 chars of structure:', structureForAI.substring(0, 200));

          // Get AI analysis
          const context: ConversationContext = {
            messages: [],
            currentFile: undefined,
            workspaceState: this.getWorkspaceState()
          };
          
          const config: AgentConfig = {
            maxTokens: 2500, // Increased for comprehensive analysis (Claude Code quality level)
            streaming: false,
            temperature: 0.2 // Lower temperature for more focused, analytical output
          };
          
          const aiResponse = await this.agentOrchestrator.processMessage(analysisPrompt, context, config);
          
          console.log('🧠 AI Response received:', aiResponse);
          console.log('🧠 AI Response message:', aiResponse?.message);
          console.log('🧠 AI Response content:', aiResponse?.message?.content);
          
          if (aiResponse?.message?.content) {
            aiAnalysis = aiResponse.message.content;
            console.log('✅ AI Analysis extracted successfully, length:', aiAnalysis.length);
          } else {
            console.warn('⚠️ AI Analysis failed - no content in response');
            console.log('📋 Full AI Response object:', JSON.stringify(aiResponse, null, 2));
            // Fall back to basic instruction template
            aiAnalysis = 'This vault serves as a comprehensive personal knowledge management system. The AI analysis will provide specific guidance for working with this vault\'s unique structure and content organization once the analysis workflow is properly executed.';
          }
          
        } catch (aiError) {
          console.warn('AI analysis failed:', aiError);
          aiAnalysis = 'This vault serves as a comprehensive personal knowledge management system. The AI analysis will provide specific guidance for working with this vault\'s unique structure and content organization once the analysis workflow is properly executed.';
        }
      } else {
        aiAnalysis = 'This vault serves as a comprehensive personal knowledge management system. The AI analysis will provide specific guidance for working with this vault\'s unique structure and content organization once the analysis workflow is properly executed.';
      }
      
      // Create simplified, AI-powered content without file tree
      const content = `---
created: ${timestamp}
tags:
  - obsius
  - ai-instructions
  - vault-guidance
analysis_version: "4.0-instructions"
---

# OBSIUS AI Instructions

*AI agent guidance generated on ${new Date().toLocaleDateString()}*

## 🎯 Vault Context & Purpose

${aiAnalysis}

## 📋 Core Instructions for AI Agents

### Navigation Guidelines
- Respect the established folder hierarchy and organizational principles
- Understand the primary knowledge domains and their relationships
- Follow existing naming conventions and content patterns

### Content Guidelines  
- Maintain consistency with existing frontmatter structures
- Respect established tagging systems and link patterns
- Preserve the vault's organizational philosophy

### Operational Guidelines
- Always consider the vault's specific context when providing assistance
- Build upon existing knowledge structures rather than imposing new ones
- Provide suggestions that align with the vault owner's apparent knowledge management approach

---

*This instruction set guides AI agents for optimal assistance with this specific vault. Re-run \`/init\` to update these instructions based on vault changes.*
`;

      // Use the create_note tool to create the file
      const result = await this.plugin.toolRegistry.executeTool('create_note', {
        title: 'OBSIUS',
        content,
        folder: ''
      });

      // Silent operation - success/failure handled by caller
      
    } catch (error) {
      console.warn('Error creating OBSIUS.md:', error);
    }
  }
  
  /**
   * Show comprehensive tool registry debugging information
   */
  private showDebugTools(): void {
    this.addOutput('🔧 Tool Registry Debug Information', 'info');
    this.addOutput('', 'normal');
    
    if (!this.plugin.toolRegistry) {
      this.addOutput('❌ Tool registry not available', 'error');
      this.addOutput('🔧 Plugin initialization state:', 'info');
      this.addOutput(`   • Plugin instance: ${!!this.plugin}`, 'normal');
      this.addOutput(`   • Tool registry: ${this.plugin.toolRegistry}`, 'normal');
      this.addOutput(`   • Provider manager: ${!!this.plugin.providerManager}`, 'normal');
      this.addOutput(`   • Agent orchestrator: ${!!this.agentOrchestrator}`, 'normal');
      return;
    }
    
    try {
      // Get comprehensive debug information
      const debugInfo = this.plugin.toolRegistry.getDebugInfo();
      const stats = this.plugin.toolRegistry.getStats();
      
      // Registry Statistics
      this.addOutput('📊 Registry Statistics:', 'info');
      this.addOutput(`   • Total tools: ${stats.total}`, 'normal');
      this.addOutput(`   • Enabled tools: ${stats.enabled}`, 'normal');
      this.addOutput(`   • Disabled tools: ${stats.disabled}`, 'normal');
      this.addOutput(`   • Instantiated tools: ${debugInfo.instantiatedTools.length}`, 'normal');
      this.addOutput('', 'normal');
      
      // Tools by Category
      this.addOutput('🏷️  Tools by Category:', 'info');
      for (const [category, count] of Object.entries(stats.byCategory)) {
        this.addOutput(`   • ${category}: ${count} tools`, 'normal');
      }
      this.addOutput('', 'normal');
      
      // Risk Level Distribution  
      this.addOutput('⚠️  Risk Level Distribution:', 'info');
      for (const [level, count] of Object.entries(stats.byRiskLevel)) {
        this.addOutput(`   • ${level}: ${count} tools`, 'normal');
      }
      this.addOutput('', 'normal');
      
      // Registered Tools Details
      this.addOutput('📋 Registered Tools:', 'info');
      for (const toolName of debugInfo.registeredTools) {
        const metadata = this.plugin.toolRegistry.getToolMetadata(toolName);
        const isInstantiated = debugInfo.instantiatedTools.includes(toolName);
        const status = metadata?.enabled ? '✅' : '❌';
        const instance = isInstantiated ? ' (instantiated)' : '';
        this.addOutput(`   ${status} ${toolName} [${metadata?.category}]${instance}`, 'normal');
      }
      this.addOutput('', 'normal');
      
      // Settings Check
      this.addOutput('⚙️  Settings Configuration:', 'info');
      const enabledInSettings = this.plugin.settings.tools.enabled;
      this.addOutput(`   • Enabled in settings: ${enabledInSettings.length} tools`, 'normal');
      this.addOutput(`   • Tools: ${enabledInSettings.join(', ')}`, 'normal');
      this.addOutput('', 'normal');
      
      // Provider Manager Status
      this.addOutput('🔗 Integration Status:', 'info');
      this.addOutput(`   • Provider manager: ${!!this.plugin.providerManager ? '✅' : '❌'}`, 'normal');
      this.addOutput(`   • Agent orchestrator: ${!!this.agentOrchestrator ? '✅' : '❌'}`, 'normal');
      
      if (this.plugin.providerManager) {
        const currentProvider = this.getCurrentProvider();
        const config = this.plugin.settings.providers[currentProvider];
        this.addOutput(`   • Current provider: ${config?.name || 'Unknown'}`, 'normal');
        this.addOutput(`   • Provider authenticated: ${config?.authenticated ? '✅' : '❌'}`, 'normal');
      }
      this.addOutput('', 'normal');
      
      // Tool Execution Test
      this.addOutput('🔍 Critical Tool Status:', 'info');
      const criticalTools = ['project_explorer', 'read_note', 'create_note', 'search_notes'];
      for (const toolName of criticalTools) {
        const tool = this.plugin.toolRegistry.getTool(toolName);
        const metadata = this.plugin.toolRegistry.getToolMetadata(toolName);
        const status = tool ? '✅ Available' : '❌ Unavailable';
        const enabled = metadata?.enabled ? '(enabled)' : '(disabled)';
        this.addOutput(`   • ${toolName}: ${status} ${enabled}`, 'normal');
      }
      
    } catch (error) {
      this.addOutput('❌ Error getting debug information:', 'error');
      this.addOutput(`   ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
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