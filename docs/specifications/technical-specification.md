# Technical Specification - Enhanced Implementation

This document defines the comprehensive technical architecture and implementation details for the Obsius AI assistant plugin for Obsidian, incorporating proven patterns from Gemini CLI and Obsidian Smart Composer analysis.

## Implementation Philosophy

Based on analysis of successful AI assistant implementations, Obsius adopts a pragmatic approach that combines:
- **Direct AI Provider Integration** (vs. heavy framework dependencies)
- **React-based UI Architecture** (proven in Smart Composer)
- **Streaming-First Design** (essential for responsive AI interactions)
- **Tool-Centric Architecture** (extensible and modular)
- **Local-First Approach** (minimal external dependencies)
- **Performance-Optimized** (lazy loading, resource management)
- **Type-Safe Implementation** (TypeScript + Zod validation)

## System Architecture

### Enhanced System Architecture (Proven Implementation Patterns)

```
┌─ Obsidian Plugin Host Environment ──────────────────────────────────────┐
│                                                                         │
│  ┌─ Obsius Plugin Core ──────────────────────────────────────────┐      │
│  │                                                                │      │
│  │  ┌─ React UI Layer (Smart Composer Pattern) ──────────────┐    │      │
│  │  │ • Context Providers (Settings, Database, RAG, MCP)    │    │      │
│  │  │ • CLI Interface Component                             │    │      │
│  │  │ • Chat Interface Component                            │    │      │
│  │  │ • Apply Edit Component (Diff Visualization)          │    │      │
│  │  │ • Lexical Rich Text Editor                           │    │      │
│  │  │ • Progress Tracking & Status Display                 │    │      │
│  │  │ • Settings & Configuration UI                        │    │      │
│  │  └───────────────────────────────────────────────────────    │      │
│  │                                                                │      │
│  │  ┌─ Agent Orchestrator (Hybrid Pattern) ────────────────────┐  │      │
│  │  │ • Session Management with Persistence                  │  │      │
│  │  │ • Streaming Response Coordination                      │  │      │
│  │  │ • Tool Execution Pipeline (Gemini CLI Pattern)        │  │      │
│  │  │ • User Confirmation & Risk Assessment                 │  │      │
│  │  │ • Context Management & Workspace Integration          │  │      │
│  │  │ • Error Recovery & Retry Logic                        │  │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  │  ┌─ Multi-Provider System (Direct Integration) ─────────────┐  │      │
│  │  │ • BaseAIProvider Interface                              │  │      │
│  │  │   - Anthropic Claude (claude-3-sonnet, opus, haiku)   │  │      │
│  │  │   - Google Gemini (gemini-pro, gemini-1.5-pro)        │  │      │
│  │  │   - OpenAI (gpt-4, gpt-4-turbo, gpt-4o)               │  │      │
│  │  │   - Ollama (local models)                             │  │      │
│  │  │ • Provider Manager with Fallbacks                     │  │      │
│  │  │ • Streaming Response Handler                           │  │      │
│  │  │ • Cost Tracking & Token Management                    │  │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  │  ┌─ Advanced Tool System (Gemini CLI Enhanced) ──────────────┐ │      │
│  │  │ • BaseTool Abstract Class with Validation               │ │      │
│  │  │ • Tool Registry with Dependency Injection              │ │      │
│  │  │ • Obsidian-Specific Tools (Notes, Vault, Links)        │ │      │
│  │  │ • Risk Assessment & Confirmation System                │ │      │
│  │  │ • Tool State Management & Undo/Redo                   │ │      │
│  │  │ • Performance Monitoring & Telemetry                  │ │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  │  ┌─ RAG Engine (Smart Composer Pattern) ──────────────────────┐ │      │
│  │  │ • PGlite Vector Database with pgvector                 │ │      │
│  │  │ • Embedding Provider Abstraction                       │ │      │
│  │  │ • LangChain Text Splitter Integration                  │ │      │
│  │  │ • Semantic Search with Similarity Thresholds          │ │      │
│  │  │ • Auto-Indexing with Background Processing             │ │      │
│  │  │ • Context-Aware Retrieval & Ranking                   │ │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  │  ┌─ Configuration System (Zod Schema Validation) ─────────────┐ │      │
│  │  │ • Settings Schema with TypeScript Integration          │ │      │
│  │  │ • Automatic Migrations & Version Management            │ │      │
│  │  │ • Hierarchical Configuration (Global/Vault/Note)       │ │      │
│  │  │ • Real-time Validation & Error Handling               │ │      │
│  │  │ • Secure API Key Storage with Encryption              │ │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  │  ┌─ MCP Integration (Optional Desktop Extension) ──────────────┐ │      │
│  │  │ • Model Context Protocol Server Management             │ │      │
│  │  │ • External Tool Discovery & Registration               │ │      │
│  │  │ • Subprocess Lifecycle Management                      │ │      │
│  │  │ • Conversation-Scoped Tool Permissions                 │ │      │
│  │  │ • Security Isolation & Resource Limits                │ │      │
│  │  └─────────────────────────────────────────────────────────  │      │
│  │                                                                │      │
│  └────────────────────────────────────────────────────────────────      │
│                                                                         │
│  ┌─ Obsidian API Integration Layer ────────────────────────────────┐    │
│  │ • Vault API (File Operations, Metadata)                        │    │
│  │ • Workspace API (Views, Leaves, Events)                        │    │
│  │ • Editor API (Content Manipulation, Cursors)                   │    │
│  │ • Plugin API (Commands, Settings, Ribbons)                     │    │
│  │ • Event System (File Changes, Workspace Events)                │    │
│  │ • Platform Detection (Desktop/Mobile Feature Gates)            │    │
│  └──────────────────────────────────────────────────────────────────    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Plugin Entry Point (Enhanced Service Architecture)

```typescript
// main.ts - Plugin with lazy service initialization (Smart Composer pattern)
export default class ObsiusPlugin extends Plugin {
  // Core services (lazy-loaded for performance)
  private agentOrchestrator?: AgentOrchestrator;
  private providerManager?: ProviderManager;
  private toolRegistry?: ToolRegistry;
  private ragEngine?: RAGEngine;
  private mcpManager?: McpManager;
  private streamingManager?: StreamingManager;
  
  // Always-available services
  private settingsManager!: SettingsManager;
  private uiManager!: UIManager;
  private securityManager!: SecurityManager;
  
  async onload() {
    console.log('Loading Obsius plugin...');
    
    try {
      // Initialize core services first
      await this.initializeCoreServices();
      
      // Setup UI and integrations
      await this.initializeUI();
      
      // Register with Obsidian
      await this.registerWithObsidian();
      
      // Start background services if needed
      await this.startBackgroundServices();
      
      console.log('Obsius plugin loaded successfully');
    } catch (error) {
      console.error('Failed to load Obsius plugin:', error);
      throw error;
    }
  }
  
  async onunload() {
    console.log('Unloading Obsius plugin...');
    
    // Cleanup in reverse order with timeout protection
    const cleanupTasks = [
      () => this.mcpManager?.cleanup(),
      () => this.ragEngine?.cleanup(),
      () => this.streamingManager?.cleanup(),
      () => this.agentOrchestrator?.cleanup(),
      () => this.uiManager?.cleanup()
    ];
    
    await this.executeCleanupTasks(cleanupTasks, 5000); // 5s timeout
    console.log('Obsius plugin unloaded');
  }
  
  private async initializeCoreServices(): Promise<void> {
    // Security manager (always first)
    this.securityManager = new SecurityManager();
    
    // Settings with schema validation and migrations
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    
    // UI manager with React integration
    this.uiManager = new UIManager(this.app, this.getServices.bind(this));
  }
  
  private async initializeUI(): Promise<void> {
    await this.uiManager.initialize();
  }
  
  private async registerWithObsidian(): Promise<void> {
    this.registerViews();
    this.registerCommands();
    this.setupRibbon();
    this.setupStatusBar();
    this.setupEventHandlers();
  }
  
  // Lazy service initialization for performance
  private getServices(): ObsiusServices {
    return {
      agentOrchestrator: this.getAgentOrchestrator(),
      providerManager: this.getProviderManager(),
      toolRegistry: this.getToolRegistry(),
      ragEngine: this.getRagEngine(),
      mcpManager: this.getMcpManager(),
      streamingManager: this.getStreamingManager(),
      settingsManager: this.settingsManager,
      securityManager: this.securityManager
    };
  }
  
  private getAgentOrchestrator(): AgentOrchestrator {
    if (!this.agentOrchestrator) {
      this.agentOrchestrator = new AgentOrchestrator(
        this.app,
        this.getProviderManager(),
        this.getToolRegistry(),
        this.getStreamingManager(),
        this.settingsManager
      );
    }
    return this.agentOrchestrator;
  }
  
  private getProviderManager(): ProviderManager {
    if (!this.providerManager) {
      this.providerManager = new ProviderManager(this.settingsManager);
    }
    return this.providerManager;
  }
  
  private getToolRegistry(): ToolRegistry {
    if (!this.toolRegistry) {
      this.toolRegistry = new ToolRegistry(this.app, this.settingsManager);
    }
    return this.toolRegistry;
  }
  
  private getRagEngine(): RAGEngine {
    if (!this.ragEngine) {
      const databasePath = path.join(this.app.vault.adapter.basePath, '.obsius', 'vector.db');
      this.ragEngine = new RAGEngine(databasePath, this.getProviderManager());
    }
    return this.ragEngine;
  }
  
  private getMcpManager(): McpManager {
    if (!this.mcpManager && !Platform.isMobile) {
      this.mcpManager = new McpManager(this.app, this.settingsManager);
    }
    return this.mcpManager;
  }
  
  private getStreamingManager(): StreamingManager {
    if (!this.streamingManager) {
      this.streamingManager = new StreamingManager();
    }
    return this.streamingManager;
  }
}

// Service interface for dependency injection
export interface ObsiusServices {
  agentOrchestrator: AgentOrchestrator;
  providerManager: ProviderManager;
  toolRegistry: ToolRegistry;
  ragEngine: RAGEngine;
  mcpManager?: McpManager;
  streamingManager: StreamingManager;
  settingsManager: SettingsManager;
  securityManager: SecurityManager;
}
```

### 2. Agent Orchestrator (Enhanced Coordination Layer)

```typescript
// src/core/AgentOrchestrator.ts - Central coordination with streaming support
export class AgentOrchestrator {
  private sessionManager: SessionManager;
  private contextManager: ContextManager;
  private confirmationHandler: UserConfirmationHandler;
  private errorRecovery: ErrorRecoveryManager;
  
  constructor(
    private app: App,
    private providerManager: ProviderManager,
    private toolRegistry: ToolRegistry,
    private streamingManager: StreamingManager,
    private settings: SettingsManager
  ) {
    this.sessionManager = new SessionManager(this.app, this.settings);
    this.contextManager = new ContextManager(this.app);
    this.confirmationHandler = new UserConfirmationHandler();
    this.errorRecovery = new ErrorRecoveryManager();
  }

  async processCommand(
    command: string,
    options: ProcessingOptions = {}
  ): Promise<AsyncGenerator<AgentResponseChunk>> {
    const requestId = generateUUID();
    const session = await this.getOrCreateSession(options.sessionId);
    
    try {
      // Gather context
      const context = await this.contextManager.getCurrentContext();
      
      // Enhance with RAG if enabled
      let enhancedContext = context;
      if (this.settings.get('rag.enabled')) {
        const ragResults = await this.performRAGSearch(command, context);
        enhancedContext = { ...context, ragResults };
      }
      
      // Prepare messages for AI provider
      const messages = this.prepareMessages(command, session, enhancedContext);
      
      // Get available tools
      const availableTools = await this.toolRegistry.getAvailableTools(context);
      
      // Start streaming generation
      const provider = await this.providerManager.getProvider(
        options.provider || this.settings.get('defaultProvider')
      );
      
      const responseGenerator = provider.generateResponse(messages, {
        tools: availableTools.map(tool => tool.schema),
        stream: true,
        model: options.model || this.settings.get(`providers.${provider.name}.model`),
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });
      
      // Process streaming response with tool execution
      return this.processStreamingResponse(
        requestId,
        responseGenerator,
        session,
        enhancedContext,
        availableTools
      );
      
    } catch (error) {
      console.error('Error processing command:', error);
      throw await this.errorRecovery.handleError(error, { command, session });
    }
  }
  
  private async *processStreamingResponse(
    requestId: string,
    responseGenerator: AsyncGenerator<ResponseChunk>,
    session: Session,
    context: ObsidianContext,
    availableTools: Tool[]
  ): AsyncGenerator<AgentResponseChunk> {
    let fullResponse = '';
    const toolCalls: ToolCall[] = [];
    
    try {
      for await (const chunk of responseGenerator) {
        switch (chunk.type) {
          case 'text':
            fullResponse += chunk.content;
            yield {
              type: 'text',
              content: chunk.content,
              requestId
            };
            break;
            
          case 'tool_call':
            toolCalls.push(chunk);
            yield {
              type: 'tool_call_start',
              toolCall: chunk,
              requestId
            };
            
            // Execute tool
            try {
              const tool = availableTools.find(t => t.name === chunk.name);
              if (!tool) {
                throw new Error(`Tool not found: ${chunk.name}`);
              }
              
              const toolResult = await this.executeTool(
                tool,
                chunk,
                context,
                (progress) => {
                  // Stream tool progress
                  this.streamingManager.emitProgress(requestId, {
                    type: 'tool_progress',
                    toolName: chunk.name,
                    progress
                  });
                }
              );
              
              yield {
                type: 'tool_call_result',
                toolCall: chunk,
                result: toolResult,
                requestId
              };
              
            } catch (toolError) {
              yield {
                type: 'tool_call_error',
                toolCall: chunk,
                error: toolError as Error,
                requestId
              };
            }
            break;
            
          case 'error':
            yield {
              type: 'error',
              error: new Error(chunk.message),
              requestId
            };
            break;
        }
      }
      
      // Save to session history
      await this.sessionManager.addMessage(session.id, {
        role: 'user',
        content: session.lastUserMessage || '',
        timestamp: new Date()
      });
      
      await this.sessionManager.addMessage(session.id, {
        role: 'assistant',
        content: fullResponse,
        toolCalls,
        timestamp: new Date()
      });
      
      yield {
        type: 'complete',
        fullResponse,
        toolCalls,
        requestId
      };
      
    } catch (error) {
      yield {
        type: 'error',
        error: error as Error,
        requestId
      };
    }
  }
  
  private async executeTool(
    tool: Tool,
    toolCall: ToolCall,
    context: ObsidianContext,
    progressCallback?: (progress: ToolProgress) => void
  ): Promise<ToolResult> {
    // Use Gemini CLI pattern for tool execution
    const pipeline = new ToolExecutionPipeline(
      this.confirmationHandler,
      this.settings
    );
    
    return await pipeline.executeTool(tool, toolCall, {
      ...context,
      progressCallback
    });
  }
  
  async createSession(config: SessionConfig = {}): Promise<Session> {
    return await this.sessionManager.createSession(config);
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    return await this.sessionManager.getSession(sessionId);
  }
  
  async cleanup(): Promise<void> {
    await this.sessionManager.cleanup();
    this.streamingManager.cancelAllStreams();
  }
}

// Enhanced types for agent processing
export interface ProcessingOptions {
  sessionId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableRAG?: boolean;
}

export interface AgentResponseChunk {
  type: 'text' | 'tool_call_start' | 'tool_call_result' | 'tool_call_error' | 'complete' | 'error';
  content?: string;
  toolCall?: ToolCall;
  result?: ToolResult;
  error?: Error;
  fullResponse?: string;
  toolCalls?: ToolCall[];
  requestId: string;
}
```

### 3. Multi-Provider System (Direct Integration)

```typescript
// src/core/ProviderManager.ts - Direct AI provider integration
export class ProviderManager {
  private providers = new Map<string, BaseAIProvider>();
  private defaultProvider: string;
  private fallbackProviders: string[] = [];
  
  constructor(private settings: SettingsManager) {
    this.defaultProvider = settings.get('defaultProvider');
    this.fallbackProviders = settings.get('fallbackProviders');
  }
  
  async initialize(): Promise<void> {
    const providersConfig = this.settings.get('providers');
    
    // Initialize enabled providers
    for (const [name, config] of Object.entries(providersConfig)) {
      if (config.enabled) {
        await this.initializeProvider(name, config);
      }
    }
  }
  
  private async initializeProvider(name: string, config: ProviderConfig): Promise<void> {
    let provider: BaseAIProvider;
    
    switch (config.type) {
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'google':
        provider = new GeminiProvider(config);
        break;
      case 'ollama':
        provider = new OllamaProvider(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
    
    // Test authentication
    try {
      await provider.authenticate();
      this.providers.set(name, provider);
      console.log(`Provider ${name} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize provider ${name}:`, error);
      throw error;
    }
  }
  
  async getProvider(name?: string): Promise<BaseAIProvider> {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    
    // Test if provider is still authenticated
    if (!(await provider.isAuthenticated())) {
      await provider.authenticate();
    }
    
    return provider;
  }
  
  async generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<AsyncGenerator<ResponseChunk>> {
    const providerName = options.provider || this.defaultProvider;
    
    try {
      const provider = await this.getProvider(providerName);
      return provider.generateResponse(messages, options);
    } catch (error) {
      // Try fallback providers
      for (const fallbackName of this.fallbackProviders) {
        if (fallbackName !== providerName) {
          try {
            console.warn(`Primary provider ${providerName} failed, trying fallback ${fallbackName}`);
            const fallbackProvider = await this.getProvider(fallbackName);
            return fallbackProvider.generateResponse(messages, {
              ...options,
              provider: fallbackName
            });
          } catch (fallbackError) {
            console.error(`Fallback provider ${fallbackName} also failed:`, fallbackError);
          }
        }
      }
      throw error; // All providers failed
    }
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      if (provider.cleanup) {
        await provider.cleanup();
      }
    }
    this.providers.clear();
  }
}

// Base provider interface (Smart Composer pattern)
export abstract class BaseAIProvider {
  abstract name: string;
  abstract supportedModels: string[];
  
  constructor(protected config: ProviderConfig) {}
  
  abstract authenticate(): Promise<void>;
  abstract isAuthenticated(): Promise<boolean>;
  
  abstract generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk>;
  
  abstract supportsFunctionCalling(): boolean;
  abstract getMaxTokens(model: string): number;
  abstract estimateCost(tokens: number, model: string): number;
  
  // Optional capabilities
  supportsStreaming(): boolean { return true; }
  supportsImages(): boolean { return false; }
  supportsDocuments(): boolean { return false; }
  
  // Optional cleanup
  cleanup?(): Promise<void>;
}

// Anthropic Claude provider implementation
export class AnthropicProvider extends BaseAIProvider {
  name = 'anthropic';
  supportedModels = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet'];
  
  private client: Anthropic;
  
  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }
  
  async authenticate(): Promise<void> {
    try {
      // Test with a minimal request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
    } catch (error) {
      throw new Error(`Anthropic authentication failed: ${error.message}`);
    }
  }
  
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
  
  async *generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk> {
    const stream = await this.client.messages.create({
      model: options.model || this.config.model,
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      messages: this.formatMessages(messages),
      tools: options.tools,
      stream: options.stream !== false
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield {
          type: 'text',
          content: chunk.delta.text || ''
        };
      } else if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
        yield {
          type: 'tool_call',
          name: chunk.content_block.name,
          parameters: chunk.content_block.input
        };
      } else if (chunk.type === 'message_stop') {
        yield {
          type: 'stop',
          content: ''
        };
      }
    }
  }
  
  supportsFunctionCalling(): boolean {
    return true;
  }
  
  getMaxTokens(model: string): number {
    const tokenLimits: Record<string, number> = {
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
      'claude-3-5-sonnet': 200000
    };
    return tokenLimits[model] || 200000;
  }
  
  estimateCost(tokens: number, model: string): number {
    // Anthropic pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 15, output: 75 },
      'claude-3-sonnet': { input: 3, output: 15 },
      'claude-3-haiku': { input: 0.25, output: 1.25 }
    };
    
    const modelPricing = pricing[model] || pricing['claude-3-sonnet'];
    // Rough estimate assuming 50/50 input/output split
    return (tokens * (modelPricing.input + modelPricing.output) / 2) / 1000000;
  }
  
  private formatMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }
}
```
    await this.initializeProviders();
    
    // Register tools
    await this.registerTools();
    
    // Setup memory systems
    await this.setupMemory();
    
    // Build agent graphs
    await this.buildAgentGraphs();
  }

  private async initializeProviders(): Promise<void> {
    const providersConfig = this.settings.getProvidersConfig();
    
    if (providersConfig.openai.enabled) {
      const openaiProvider = new OpenAIProvider();
      this.providerManager.registerProvider(openaiProvider);
    }
    
    if (providersConfig.claude.enabled) {
      const claudeProvider = new ClaudeProvider();
      this.providerManager.registerProvider(claudeProvider);
    }
    
    if (providersConfig.gemini.enabled) {
      const geminiProvider = new GeminiProvider();
      this.providerManager.registerProvider(geminiProvider);
    }
    
    // Set default provider
    this.providerManager.setDefaultProvider(providersConfig.defaultProvider);
  }

  async createLLM(providerName?: string): Promise<BaseLLM> {
    return await this.providerManager.createLLM(providerName);
  }

  getToolRegistry(): LangChainToolRegistry {
    return this.toolRegistry;
  }

  getMemoryManager(): ObsiusMemoryManager {
    return this.memoryManager;
  }
}
```

### 4. UI Manager (Updated for Agent Integration)

```typescript
// src/ui/UIManager.ts
export class UIManager {
  private sidebarView: ObsiusSidebarView;
  private reactRoot: Root;

  constructor(
    private app: App,
    private agentOrchestrator: AgentOrchestrator
  ) {}

  async initialize(): Promise<void> {
    // Register sidebar view
    this.app.workspace.registerHoverLinkSource(OBSIUS_VIEW_TYPE, {
      display: 'Obsius AI',
      defaultMod: true,
    });

    this.registerView(OBSIUS_VIEW_TYPE, (leaf) => 
      new ObsiusSidebarView(leaf, this.agentOrchestrator)
    );

    // Add ribbon icon
    this.addRibbonIcon('bot', 'Open Obsius AI', () => {
      this.activateView();
    });
  }

  private async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(OBSIUS_VIEW_TYPE);
    
    if (leaves.length === 0) {
      // Create new leaf in right sidebar
      const leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({
        type: OBSIUS_VIEW_TYPE,
        active: true
      });
    } else {
      // Activate existing view
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }
}
```

## Right Sidebar Integration

### Sidebar View Implementation

```typescript
// src/ui/ObsiusSidebarView.ts
export class ObsiusSidebarView extends ItemView {
  private reactComponent: React.ComponentType;
  private reactRoot: Root;

  constructor(leaf: WorkspaceLeaf, private agentOrchestrator: AgentOrchestrator) {
    super(leaf);
  }

  getViewType(): string {
    return OBSIUS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Obsius AI';
  }

  getIcon(): string {
    return 'bot';
  }

  async onOpen(): Promise<void> {
    // Clear existing content
    this.containerEl.empty();

    // Create React root
    const container = this.containerEl.createDiv();
    container.addClass('obsius-sidebar-container');
    
    this.reactRoot = createRoot(container);
    
    // Render React app
    this.reactRoot.render(
      <ObsiusSidebarApp 
        agentOrchestrator={this.agentOrchestrator}
        obsidianApp={this.app}
      />
    );
  }

  async onClose(): Promise<void> {
    this.reactRoot?.unmount();
  }
}
```

### React App Structure

```typescript
// src/ui/components/ObsiusSidebarApp.tsx
export const ObsiusSidebarApp: React.FC<Props> = ({ 
  agentOrchestrator, 
  obsidianApp 
}) => {
  return (
    <div className="obsius-app">
      <AgentContextProvider agentOrchestrator={agentOrchestrator}>
        <Header />
        <AgentStatusDisplay />
        <ChatHistory />
        <CommandInput />
        <TaskProgressVisualization />
        <ContextDisplay />
        <QuickActions />
      </AgentContextProvider>
    </div>
  );
};

// Agent Context Provider for state management
const AgentContextProvider: React.FC<Props> = ({ children, agentOrchestrator }) => {
  const [currentTask, setCurrentTask] = useState<AgentTask>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskProgress, setTaskProgress] = useState<TaskProgress>();
  const [agentGraph, setAgentGraph] = useState<AgentGraphState>();

  useEffect(() => {
    // Subscribe to agent events
    const unsubscribe = agentOrchestrator.subscribe({
      onTaskStart: (task) => {
        setCurrentTask(task);
        setIsProcessing(true);
      },
      onTaskProgress: (progress) => {
        setTaskProgress(progress);
      },
      onTaskComplete: (result) => {
        setIsProcessing(false);
        setCurrentTask(undefined);
      },
      onGraphStateChange: (state) => {
        setAgentGraph(state);
      }
    });

    return unsubscribe;
  }, [agentOrchestrator]);

  return (
    <ObsiusContext.Provider value={{
      currentTask,
      setCurrentTask,
      isProcessing,
      setIsProcessing,
      taskProgress,
      agentGraph,
      agentOrchestrator
    }}>
      {children}
    </ObsiusContext.Provider>
  );
};
```

## AI Provider Integration

### Provider Interface

```typescript
// src/providers/AIProvider.ts
export interface AIProvider {
  name: string;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  
  generateResponse(
    prompt: string,
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk>;
  
  executeToolCall(
    toolCall: ToolCall,
    tools: Tool[]
  ): Promise<ToolResult>;
}

export interface GenerationOptions {
  tools: ToolDefinition[];
  context: Context;
  stream: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

### Claude Provider Implementation

```typescript
// src/providers/ClaudeProvider.ts
export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: AnthropicClient;

  constructor(private apiKey: string) {
    this.client = new AnthropicClient({
      apiKey: this.apiKey
    });
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Test API key with a simple request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch {
      return false;
    }
  }

  async* generateResponse(
    prompt: string, 
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk> {
    const stream = await this.client.messages.create({
      model: options.model || 'claude-3-sonnet-20240229',
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }],
      tools: options.tools,
      stream: options.stream
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        yield {
          type: 'text',
          content: chunk.delta.text || ''
        };
      } else if (chunk.type === 'message_stop') {
        yield {
          type: 'stop',
          content: ''
        };
      }
    }
  }
}
```

## Tools System

### Tool Registry

```typescript
// src/tools/ToolRegistry.ts
export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private obsidianTools: ObsidianToolCollection;

  constructor(
    private app: App,
    private contextManager: ContextManager
  ) {
    this.obsidianTools = new ObsidianToolCollection(app);
    this.registerBuiltinTools();
  }

  private registerBuiltinTools(): void {
    // Obsidian-specific tools
    this.register(this.obsidianTools.createNoteTool);
    this.register(this.obsidianTools.readNoteTool);
    this.register(this.obsidianTools.updateNoteTool);
    this.register(this.obsidianTools.createLinkTool);
    this.register(this.obsidianTools.searchNotesTool);
    
    // Web research tools
    this.register(new WebSearchTool());
    this.register(new WebFetchTool());
    
    // File system tools
    this.register(new ListFilesTool(app));
    this.register(new ReadFileTool(app));
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameterSchema
    }));
  }

  async executeTool(
    name: string, 
    parameters: unknown
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate parameters
    const validationResult = tool.validateParameters(parameters);
    if (!validationResult.valid) {
      throw new Error(`Invalid parameters: ${validationResult.error}`);
    }

    // Check if confirmation required
    if (tool.requiresConfirmation(parameters)) {
      const confirmed = await this.requestConfirmation(tool, parameters);
      if (!confirmed) {
        return { success: false, message: 'Operation cancelled by user' };
      }
    }

    // Execute tool
    return await tool.execute(parameters, this.contextManager.getCurrentContext());
  }
}
```

### Obsidian-Specific Tools

```typescript
// src/tools/obsidian/CreateNoteTool.ts
export class CreateNoteTool extends Tool {
  name = 'create_note';
  description = 'Create a new note in the Obsidian vault';
  
  parameterSchema = {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Note title' },
      content: { type: 'string', description: 'Note content' },
      path: { type: 'string', description: 'File path (optional)' },
      tags: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Tags to add to the note' 
      },
      template: { type: 'string', description: 'Template to use (optional)' }
    },
    required: ['title', 'content']
  };

  constructor(private app: App) {
    super();
  }

  validateParameters(params: unknown): ValidationResult {
    // JSON schema validation
    return validateAgainstSchema(params, this.parameterSchema);
  }

  requiresConfirmation(params: CreateNoteParams): boolean {
    // Check if file already exists
    const filePath = this.generateFilePath(params.title, params.path);
    return this.app.vault.getAbstractFileByPath(filePath) !== null;
  }

  async execute(
    params: CreateNoteParams, 
    context: Context
  ): Promise<ToolResult> {
    try {
      const filePath = this.generateFilePath(params.title, params.path);
      
      // Generate content with frontmatter
      const fullContent = this.generateContent(params, context);
      
      // Create the file
      const file = await this.app.vault.create(filePath, fullContent);
      
      // Add tags if specified
      if (params.tags?.length) {
        await this.addTagsToFile(file, params.tags);
      }

      return {
        success: true,
        message: `Created note: "${params.title}"`,
        data: {
          path: filePath,
          file: file
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create note: ${error.message}`
      };
    }
  }

  private generateFilePath(title: string, customPath?: string): string {
    if (customPath) {
      return customPath.endsWith('.md') ? customPath : `${customPath}.md`;
    }
    
    // Sanitize title for filename
    const sanitized = title
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return `${sanitized}.md`;
  }

  private generateContent(params: CreateNoteParams, context: Context): string {
    let content = '';
    
    // Add frontmatter if tags specified
    if (params.tags?.length) {
      content += '---\n';
      content += `tags: [${params.tags.map(tag => `"${tag}"`).join(', ')}]\n`;
      content += `created: ${new Date().toISOString()}\n`;
      content += '---\n\n';
    }
    
    // Add title as H1
    content += `# ${params.title}\n\n`;
    
    // Add content
    content += params.content;
    
    // Add automatic backlink to current note if in context
    if (context.currentNote) {
      content += `\n\n## Related\n- [[${context.currentNote.basename}]]\n`;
    }
    
    return content;
  }
}

// src/tools/obsidian/CreateLinkTool.ts
export class CreateLinkTool extends Tool {
  name = 'create_link';
  description = 'Create links between notes in the vault';
  
  parameterSchema = {
    type: 'object',
    properties: {
      sourceNote: { type: 'string', description: 'Source note path or title' },
      targetNote: { type: 'string', description: 'Target note path or title' },
      linkText: { type: 'string', description: 'Custom link text (optional)' },
      bidirectional: { 
        type: 'boolean', 
        description: 'Create bidirectional link',
        default: true 
      },
      section: { type: 'string', description: 'Section to add link to (optional)' }
    },
    required: ['sourceNote', 'targetNote']
  };

  async execute(
    params: CreateLinkParams, 
    context: Context
  ): Promise<ToolResult> {
    try {
      const sourceFile = await this.findNoteFile(params.sourceNote);
      const targetFile = await this.findNoteFile(params.targetNote);
      
      if (!sourceFile || !targetFile) {
        return {
          success: false,
          message: 'One or both notes not found'
        };
      }

      // Create link in source note
      await this.addLinkToNote(sourceFile, targetFile, params);
      
      // Create bidirectional link if requested
      if (params.bidirectional) {
        await this.addLinkToNote(targetFile, sourceFile, {
          ...params,
          bidirectional: false // Prevent infinite recursion
        });
      }

      return {
        success: true,
        message: `Created ${params.bidirectional ? 'bidirectional ' : ''}link between "${sourceFile.basename}" and "${targetFile.basename}"`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create link: ${error.message}`
      };
    }
  }

  private async findNoteFile(identifier: string): Promise<TFile | null> {
    // Try exact path match first
    const byPath = this.app.vault.getAbstractFileByPath(identifier);
    if (byPath instanceof TFile) return byPath;
    
    // Try with .md extension
    const withExtension = this.app.vault.getAbstractFileByPath(`${identifier}.md`);
    if (withExtension instanceof TFile) return withExtension;
    
    // Search by title
    const allFiles = this.app.vault.getMarkdownFiles();
    return allFiles.find(file => 
      file.basename.toLowerCase() === identifier.toLowerCase()
    ) || null;
  }

  private async addLinkToNote(
    sourceFile: TFile, 
    targetFile: TFile, 
    params: CreateLinkParams
  ): Promise<void> {
    const content = await this.app.vault.read(sourceFile);
    const linkText = params.linkText || targetFile.basename;
    const link = `[[${targetFile.path}|${linkText}]]`;
    
    let newContent: string;
    
    if (params.section) {
      // Add to specific section
      newContent = this.addLinkToSection(content, link, params.section);
    } else {
      // Add to end of file
      newContent = content + `\n\n${link}`;
    }
    
    await this.app.vault.modify(sourceFile, newContent);
  }
}
```

## Data Management

### Session Management

```typescript
// src/core/SessionManager.ts
export class SessionManager {
  private currentSession: Session | null = null;
  private sessions = new Map<string, Session>();

  constructor(private coreEngine: CoreEngine) {}

  getCurrentSession(): Session {
    if (!this.currentSession) {
      this.currentSession = this.createNewSession();
    }
    return this.currentSession;
  }

  createNewSession(): Session {
    const session = new Session({
      id: generateUUID(),
      createdAt: new Date(),
      history: [],
      context: {}
    });
    
    this.sessions.set(session.id, session);
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    // Persist to Obsidian's data storage
    const plugin = this.coreEngine.plugin;
    const data = await plugin.loadData() || {};
    
    if (!data.sessions) data.sessions = {};
    data.sessions[session.id] = session.serialize();
    
    await plugin.saveData(data);
  }

  async loadSessions(): Promise<Session[]> {
    const plugin = this.coreEngine.plugin;
    const data = await plugin.loadData();
    
    if (!data?.sessions) return [];
    
    return Object.values(data.sessions).map(sessionData => 
      Session.deserialize(sessionData)
    );
  }
}

export class Session {
  constructor(
    public id: string,
    public createdAt: Date,
    public history: Message[],
    public context: SessionContext
  ) {}

  addMessage(message: Message): void {
    this.history.push(message);
    
    // Trim history if too long
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  serialize(): SerializedSession {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      history: this.history,
      context: this.context
    };
  }

  static deserialize(data: SerializedSession): Session {
    return new Session(
      data.id,
      new Date(data.createdAt),
      data.history,
      data.context
    );
  }
}
```

### Context Management

```typescript
// src/core/ContextManager.ts
export class ContextManager {
  constructor(private app: App) {}

  async getCurrentContext(): Promise<Context> {
    const activeFile = this.app.workspace.getActiveFile();
    const workspaceLayout = this.app.workspace.getLayout();
    
    return {
      currentNote: activeFile ? {
        path: activeFile.path,
        basename: activeFile.basename,
        content: await this.app.vault.read(activeFile),
        metadata: this.app.metadataCache.getFileCache(activeFile)
      } : null,
      
      vault: {
        name: this.app.vault.getName(),
        totalNotes: this.app.vault.getMarkdownFiles().length,
        totalAttachments: this.app.vault.getFiles().length - this.app.vault.getMarkdownFiles().length
      },
      
      workspace: {
        layout: workspaceLayout,
        openTabs: this.getOpenTabs(),
        focusedPane: this.getFocusedPane()
      },
      
      selection: this.getSelection(),
      timestamp: new Date()
    };
  }

  private getOpenTabs(): TabInfo[] {
    const leaves = this.app.workspace.getLeavesOfType('markdown');
    return leaves.map(leaf => ({
      file: leaf.view.file?.path || '',
      isActive: leaf === this.app.workspace.activeLeaf
    }));
  }

  private getSelection(): string | null {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.editor) {
      return activeView.editor.getSelection() || null;
    }
    return null;
  }
}
```

## Error Handling and Resilience

### Error Management

```typescript
// src/core/ErrorManager.ts
export class ErrorManager {
  private errorQueue: ObsiusError[] = [];
  
  handleError(error: Error, context?: ErrorContext): ObsiusError {
    const obsiusError = new ObsiusError(error, context);
    this.errorQueue.push(obsiusError);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Obsius Error:', obsiusError);
    }
    
    // Show user-friendly message
    this.showUserError(obsiusError);
    
    return obsiusError;
  }

  private showUserError(error: ObsiusError): void {
    const message = this.getUserFriendlyMessage(error);
    new Notice(message, 5000);
  }

  private getUserFriendlyMessage(error: ObsiusError): string {
    switch (error.type) {
      case ErrorType.API_ERROR:
        return 'AI service temporarily unavailable. Please try again.';
      case ErrorType.NETWORK_ERROR:
        return 'Network connection issue. Check your internet connection.';
      case ErrorType.TOOL_EXECUTION_ERROR:
        return `Tool operation failed: ${error.userMessage}`;
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export class ObsiusError extends Error {
  constructor(
    originalError: Error,
    public context?: ErrorContext,
    public type: ErrorType = ErrorType.UNKNOWN,
    public userMessage?: string
  ) {
    super(originalError.message);
    this.name = 'ObsiusError';
    this.stack = originalError.stack;
  }
}
```

### Retry Logic

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts || !shouldRetry(error as Error)) {
        throw lastError;
      }
      
      const delay = delayMs * Math.pow(backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

## Performance Optimization

### Lazy Loading

```typescript
// src/utils/LazyLoader.ts
export class LazyLoader {
  private loadedModules = new Map<string, Promise<any>>();
  
  async loadProvider(providerName: string): Promise<AIProvider> {
    if (!this.loadedModules.has(providerName)) {
      this.loadedModules.set(
        providerName,
        this.dynamicImport(providerName)
      );
    }
    
    const module = await this.loadedModules.get(providerName);
    return new module.default();
  }
  
  private async dynamicImport(providerName: string): Promise<any> {
    switch (providerName) {
      case 'claude':
        return await import('../providers/ClaudeProvider');
      case 'gemini':
        return await import('../providers/GeminiProvider');
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }
}
```

### Memory Management

```typescript
// src/core/MemoryManager.ts
export class MemoryManager {
  private static readonly MAX_HISTORY_ITEMS = 100;
  private static readonly MAX_CACHE_SIZE = 50;
  
  static pruneSessionHistory(session: Session): void {
    if (session.history.length > this.MAX_HISTORY_ITEMS) {
      // Keep recent messages and system messages
      const systemMessages = session.history.filter(m => m.role === 'system');
      const recentMessages = session.history
        .filter(m => m.role !== 'system')
        .slice(-this.MAX_HISTORY_ITEMS + systemMessages.length);
      
      session.history = [...systemMessages, ...recentMessages];
    }
  }
  
  static clearCaches(): void {
    // Clear tool result caches
    ToolCache.clear();
    
    // Clear provider response caches
    ProviderCache.clear();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```

## Security Considerations

### API Key Management

```typescript
// src/security/SecureStorage.ts
export class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'obsius-encryption-key';
  
  static async storeApiKey(provider: string, apiKey: string): Promise<void> {
    const encrypted = await this.encrypt(apiKey);
    localStorage.setItem(`obsius-${provider}-key`, encrypted);
  }
  
  static async getApiKey(provider: string): Promise<string | null> {
    const encrypted = localStorage.getItem(`obsius-${provider}-key`);
    return encrypted ? await this.decrypt(encrypted) : null;
  }
  
  private static async encrypt(data: string): Promise<string> {
    // Use Web Crypto API for proper encryption
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private static async decrypt(encryptedData: string): Promise<string> {
    const decoder = new TextDecoder();
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// __tests__/tools/CreateNoteTool.test.ts
describe('CreateNoteTool', () => {
  let mockApp: MockApp;
  let tool: CreateNoteTool;
  
  beforeEach(() => {
    mockApp = new MockApp();
    tool = new CreateNoteTool(mockApp);
  });
  
  it('should create a note with valid parameters', async () => {
    const params = {
      title: 'Test Note',
      content: 'This is a test note'
    };
    
    const result = await tool.execute(params, mockContext);
    
    expect(result.success).toBe(true);
    expect(mockApp.vault.create).toHaveBeenCalledWith(
      'Test Note.md',
      expect.stringContaining('# Test Note')
    );
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/CoreEngine.test.ts
describe('CoreEngine Integration', () => {
  let coreEngine: CoreEngine;
  let mockProvider: MockAIProvider;
  
  beforeEach(async () => {
    const mockApp = new MockApp();
    const mockSettings = new MockSettingsManager();
    coreEngine = new CoreEngine(mockApp, mockSettings);
    
    mockProvider = new MockAIProvider();
    await coreEngine.providerManager.registerProvider(mockProvider);
  });
  
  it('should process commands end-to-end', async () => {
    const command = 'create a note about TypeScript';
    const result = await coreEngine.processCommand(command);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Created note');
  });
});
```

## Build and Deployment

### Build Configuration

```typescript
// esbuild.config.mjs
import esbuild from 'esbuild';
import process from 'process';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
  entryPoints: ['main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/*',
    '@lezer/*'
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
  define: {
    'process.env.NODE_ENV': prod ? '"production"' : '"development"'
  }
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### Development Scripts

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src/**/*.{ts,tsx}"
  }
}
```

This technical specification provides a comprehensive blueprint for implementing the Obsius plugin based on proven patterns from successful AI assistant implementations, incorporating proper architecture, error handling, performance optimization, and security considerations.

## Implementation Priorities

### Phase 1: Foundation (Weeks 1-4)
1. **Core Plugin Architecture** - Service-oriented design with lazy initialization
2. **Settings System** - Zod-based configuration with migrations
3. **Provider Framework** - Multi-AI provider support with unified interface
4. **Basic UI** - React integration with context providers

### Phase 2: Core Features (Weeks 5-8)
1. **Streaming Responses** - Real-time AI interaction with cancellation
2. **Tool System** - Extensible tool registry with validation
3. **Session Management** - Persistent conversations with context preservation
4. **Basic Tools** - Essential Obsidian operations (CRUD, search)

### Phase 3: Advanced Features (Weeks 9-12)
1. **RAG Integration** - Local vector database with semantic search
2. **Advanced Tools** - Complex operations (analysis, enhancement, research)
3. **Apply Edits** - Diff visualization and file modification
4. **CLI Interface** - Terminal-style interaction mode

### Phase 4: Polish and Optimization (Weeks 13-16)
1. **MCP Integration** - External tool support for extensibility
2. **Performance Optimization** - Lazy loading, caching, resource management
3. **Error Handling** - Comprehensive error recovery and user feedback
4. **Testing and Documentation** - Quality assurance and user guides

## Key Implementation Decisions

### Architectural Choices
1. **Direct Provider Integration** over framework dependencies (LangChain optional)
2. **React + TypeScript** for robust UI development
3. **Local-First Design** to minimize external dependencies
4. **Streaming-First** for responsive AI interactions
5. **Schema-Based Configuration** for type safety and validation

### Technology Stack
1. **Frontend**: React 18, TypeScript, Zod, Lexical Editor
2. **Backend**: Direct AI provider SDKs, PGlite for vector storage
3. **Build**: esbuild, ESLint, Prettier, Jest
4. **Development**: Hot reload, source maps, type checking

### Performance Strategies
1. **Lazy Loading** for heavy services and components
2. **Code Splitting** for optimal bundle sizes
3. **Request Deduplication** to prevent redundant API calls
4. **Intelligent Caching** with appropriate TTLs
5. **Resource Monitoring** and automatic cleanup

This specification serves as the definitive technical guide for implementing Obsius as a production-ready AI assistant plugin for Obsidian.