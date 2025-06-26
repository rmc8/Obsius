# Obsius Architecture - Enhanced Design

This document outlines the comprehensive architecture for the Obsius Obsidian plugin, incorporating best practices and patterns learned from in-depth analysis of Gemini CLI, Obsidian Smart Composer, and OpenHands projects.

## Executive Summary

Obsius adopts an event-driven hybrid architecture combining OpenHands' sophisticated agent orchestration and security framework with Gemini CLI's tool system and Smart Composer's React integration patterns. The design emphasizes real-time communication, agent specialization, and security while maintaining the CLI-style interface vision.

## High-Level Architecture

### Enhanced Core Components

1. **Plugin Core (`src/core/`)**
   - **EventSystem** - Central event-driven architecture (OpenHands pattern)
   - **AgentOrchestrator** - Multi-agent coordination and specialization
   - **ProviderManager** - Multi-AI provider management with LiteLLM integration
   - **ToolRegistry** - Action/observation pattern with comprehensive validation
   - **SessionManager** - Event-driven conversation management with memory
   - **SettingsManager** - Schema-based configuration with migrations
   - **StreamingManager** - Real-time WebSocket-based communication
   - **SecurityManager** - Risk assessment and user confirmation framework

2. **UI Layer (`src/ui/`)**
   - **React Components** - Modern React 18 with real-time context providers
   - **CLI Interface** - Terminal-style command input with event streaming
   - **Chat Interface** - Conversation view with live action/observation display
   - **Event Stream UI** - Real-time visualization of agent actions and results
   - **Rich Text Editor** - Advanced input with @mentions and autocomplete
   - **Diff Viewer** - Change visualization for apply edit functionality
   - **Settings UI** - Configuration interface with validation
   - **Progress Tracking** - Real-time operation status and feedback
   - **Security UI** - Risk assessment display and confirmation dialogs

3. **Tools System (`src/tools/`)**
   - **Base Tool Classes** - Abstract tool framework with validation
   - **Obsidian Tools** - Native vault operations (notes, links, tags)
   - **File System Tools** - Cross-platform file management
   - **RAG Tools** - Semantic search and knowledge retrieval
   - **MCP Tools** - External tool integration via Model Context Protocol
   - **Utility Tools** - Common operations and helper functions

4. **Providers (`src/providers/`)**
   - **BaseAIProvider** - Unified interface for all AI services
   - **Claude Provider** - Anthropic Claude integration with streaming
   - **Gemini Provider** - Google Gemini with function calling
   - **OpenAI Provider** - GPT models with advanced features
   - **Local Providers** - Ollama and other local model support
   - **Provider Utils** - Common functionality and error handling

5. **Data Layer (`src/data/`)**
   - **Vector Database** - PGlite-based semantic search
   - **Persistence Manager** - Session and configuration storage
   - **Embedding Engine** - Text vectorization and indexing
   - **Migration System** - Data schema versioning and upgrades
   - **Cache Manager** - Performance optimization and resource management

6. **Integration Layer (`src/integration/`)**
   - **Obsidian Bridge** - Vault API integration and event handling
   - **MCP Manager** - External tool server management
   - **Context Providers** - Workspace state and file context
   - **Event System** - Plugin-wide event coordination
   - **Security Manager** - Permission control and API key management

## Core Architecture Principles

### 0. Event-Driven Architecture (OpenHands Pattern)

```typescript
// Central event system for all Obsidian interactions
interface ObsidianEvent {
  id: string;
  timestamp: string;
  source: string;
  vaultPath: string;
  notePath?: string;
}

interface ObsidianAction extends ObsidianEvent {
  type: 'note_edit' | 'vault_search' | 'link_creation' | 'tag_management' | 'knowledge_query';
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
}

interface ObsidianObservation extends ObsidianEvent {
  actionId: string;
  result: any;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Event stream manager for real-time communication
export class EventStreamManager {
  private eventBus = new EventTarget();
  private eventHistory: ObsidianEvent[] = [];
  private subscribers = new Map<string, Set<EventListener>>();
  
  async addEvent(event: ObsidianEvent): Promise<void> {
    // Store in history
    this.eventHistory.push(event);
    
    // Broadcast to subscribers
    this.eventBus.dispatchEvent(new CustomEvent('obsidian_event', {
      detail: event
    }));
    
    // Update UI in real-time
    await this.updateUI(event);
  }
  
  subscribe(eventType: string, callback: EventListener): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
  }
}

// Agent controller with event-driven execution
export class ObsidianAgentController {
  constructor(
    private agent: ObsidianAgent,
    private runtime: ObsidianRuntime,
    private eventStream: EventStreamManager,
    private maxIterations: number = 50
  ) {}
  
  async run(task: string): Promise<AgentResult> {
    let iterations = 0;
    
    while (iterations < this.maxIterations && !this.isComplete()) {
      // Generate next action from agent
      const action = await this.agent.step(this.state);
      await this.eventStream.addEvent(action);
      
      // Execute action in Obsidian runtime
      const observation = await this.runtime.executeAction(action);
      await this.eventStream.addEvent(observation);
      
      // Update agent state
      this.state.update(action, observation);
      iterations++;
    }
    
    return this.generateResult();
  }
}
```

### 1. Service-Oriented Architecture (Smart Composer Pattern)

```typescript
// Plugin main class with lazy service initialization
export default class ObsiusPlugin extends Plugin {
  private agentOrchestrator?: AgentOrchestrator;
  private providerManager?: ProviderManager;
  private toolRegistry?: ToolRegistry;
  private ragEngine?: RAGEngine;
  private settingsManager: SettingsManager;
  private uiManager?: UIManager;

  async onload() {
    // Initialize core services first
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    
    // Register UI components
    this.uiManager = new UIManager(this.app, this.getAgentOrchestrator.bind(this));
    await this.uiManager.initialize();
    
    // Register commands and views
    this.registerCommands();
    this.registerViews();
  }

  // Lazy initialization for heavy services
  private getAgentOrchestrator(): AgentOrchestrator {
    if (!this.agentOrchestrator) {
      this.agentOrchestrator = new AgentOrchestrator(
        this.app,
        this.getProviderManager(),
        this.getToolRegistry(),
        this.settingsManager
      );
    }
    return this.agentOrchestrator;
  }
}
```

### 2. React Integration Architecture (Smart Composer Pattern)

```typescript
// Modern React integration with context providers
export class ObsiusView extends ItemView {
  private root?: Root;

  async onOpen() {
    const container = this.containerEl.createDiv('obsius-container');
    this.root = createRoot(container);
    
    this.root.render(
      <StrictMode>
        <ErrorBoundary>
          <ObsiusContextProviders>
            <ObsiusApplication />
          </ObsiusContextProviders>
        </ErrorBoundary>
      </StrictMode>
    );
  }
}

// Hierarchical context system
const ObsiusContextProviders: React.FC<{children: ReactNode}> = ({children}) => (
  <PluginContextProvider>
    <SettingsContextProvider>
      <AgentContextProvider>
        <SessionContextProvider>
          <ToolContextProvider>
            <RAGContextProvider>
              {children}
            </RAGContextProvider>
          </ToolContextProvider>
        </SessionContextProvider>
      </AgentContextProvider>
    </SettingsContextProvider>
  </PluginContextProvider>
);
```

### 3. Advanced Tool System (OpenHands + Gemini CLI + Smart Composer Hybrid)

```typescript
// Enhanced tool interface combining all three patterns
export abstract class BaseTool<TParams, TResult extends ToolResult> {
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string,
    public readonly schema: FunctionDeclaration,
    public readonly metadata: ToolMetadata = {}
  ) {}

  // Gemini CLI patterns
  abstract validateParams(params: TParams): ValidationResult;
  abstract shouldConfirmExecute(params: TParams): boolean;
  abstract getRiskLevel(params: TParams): RiskLevel;
  
  // Smart Composer patterns
  abstract isAvailable(context?: ObsidianContext): Promise<boolean>;
  
  // OpenHands patterns
  abstract toAction(params: TParams): ObsidianAction;
  abstract parseObservation(observation: ObsidianObservation): TResult;
  
  // Enhanced execution combining all patterns
  async execute(
    params: TParams,
    context: ExecutionContext,
    updateCallback?: ToolUpdateCallback
  ): Promise<TResult> {
    // 1. Validate parameters (Gemini CLI)
    const validation = this.validateParams(params);
    if (!validation.valid) throw new ValidationError(validation.message);
    
    // 2. Check availability (Smart Composer)
    if (!(await this.isAvailable(context.obsidianContext))) {
      throw new ToolUnavailableError(`Tool ${this.name} is not available`);
    }
    
    // 3. Assess security risk (OpenHands + Gemini CLI)
    const risk = this.getRiskLevel(params);
    if (this.shouldConfirmExecute(params)) {
      const confirmed = await context.requestConfirmation({
        tool: this.displayName,
        parameters: params,
        riskLevel: risk,
        estimatedImpact: await this.estimateImpact(params)
      });
      if (!confirmed) throw new UserCancelledError();
    }
    
    // 4. Convert to action/observation pattern (OpenHands)
    const action = this.toAction(params);
    const observation = await context.executeAction(action);
    
    // 5. Parse and return result
    return this.parseObservation(observation);
  }
  
  // Optional lifecycle hooks
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  
  // State management for stateful tools
  getState?(): ToolState;
  setState?(state: ToolState): void;
}

// Enhanced tool execution pipeline with event-driven monitoring
export class ToolExecutionPipeline {
  constructor(
    private eventStream: EventStreamManager,
    private securityAnalyzer: SecurityAnalyzer
  ) {}
  
  async executeTool(
    toolCall: ToolCall,
    tool: BaseTool,
    context: ExecutionContext
  ): Promise<ToolResult> {
    // 1. Parameter validation (Gemini CLI)
    const validation = tool.validateParams(toolCall.parameters);
    if (!validation.valid) {
      throw new ToolValidationError(validation.errors);
    }
    
    // 2. Security analysis (OpenHands)
    const action = tool.toAction(toolCall.parameters);
    const securityRisk = await this.securityAnalyzer.assessRisk(action);
    
    // 3. Risk assessment and confirmation (All three patterns)
    const riskLevel = tool.getRiskLevel(toolCall.parameters);
    if (riskLevel !== 'low' || tool.shouldConfirmExecute(toolCall.parameters) || securityRisk.requiresConfirmation) {
      const confirmed = await this.requestUserConfirmation({
        tool: tool.displayName,
        parameters: toolCall.parameters,
        riskLevel,
        securityRisk,
        estimatedImpact: await this.estimateImpact(tool, toolCall.parameters)
      });
      
      if (!confirmed) {
        const observation: ObsidianObservation = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          source: 'tool_pipeline',
          vaultPath: context.vaultPath,
          actionId: action.id,
          result: null,
          success: false,
          error: 'User cancelled operation'
        };
        await this.eventStream.addEvent(observation);
        return { success: false, message: 'User cancelled operation', userCancelled: true };
      }
    }
    
    // 4. Execute with real-time monitoring (OpenHands + Gemini CLI)
    return await this.executeWithEventMonitoring(tool, action, context);
  }
  
  private async executeWithEventMonitoring(
    tool: BaseTool,
    action: ObsidianAction,
    context: ExecutionContext
  ): Promise<ToolResult> {
    try {
      // Emit action event
      await this.eventStream.addEvent(action);
      
      // Execute action in runtime
      const observation = await context.runtime.executeAction(action);
      
      // Emit observation event
      await this.eventStream.addEvent(observation);
      
      // Parse result using tool
      return tool.parseObservation(observation);
      
    } catch (error) {
      const errorObservation: ObsidianObservation = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: 'tool_pipeline',
        vaultPath: context.vaultPath,
        actionId: action.id,
        result: null,
        success: false,
        error: error.message
      };
      
      await this.eventStream.addEvent(errorObservation);
      throw error;
    }
  }
}
```

### 4. Real-time Communication Architecture (OpenHands + Gemini CLI Pattern)

```typescript
// Real-time communication system with event streaming and WebSocket-like patterns
export class RealTimeCommunicationManager {
  private activeStreams = new Map<string, AbortController>();
  private eventStream: EventStreamManager;
  private subscribers = new Map<string, Set<EventCallback>>();
  
  constructor(eventStream: EventStreamManager) {
    this.eventStream = eventStream;
  }
  
  async streamResponse(
    requestId: string,
    generator: AsyncGenerator<ResponseChunk>,
    handlers: StreamingHandlers
  ): Promise<StreamingResult> {
    const controller = new AbortController();
    this.activeStreams.set(requestId, controller);
    
    try {
      let fullResponse = '';
      const toolCalls: ToolCall[] = [];
      const events: ObsidianEvent[] = [];
      
      for await (const chunk of generator) {
        if (controller.signal.aborted) {
          handlers.onCancelled?.();
          break;
        }
        
        // Create event for each chunk
        const chunkEvent: ObsidianEvent = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          source: 'streaming_manager',
          vaultPath: handlers.vaultPath || '',
          type: chunk.type,
          data: chunk
        };
        
        // Emit event for real-time UI updates
        await this.eventStream.addEvent(chunkEvent);
        events.push(chunkEvent);
        
        switch (chunk.type) {
          case 'text':
            fullResponse += chunk.content;
            handlers.onTextChunk?.(chunk.content, fullResponse);
            break;
            
          case 'tool_call':
            toolCalls.push(chunk);
            handlers.onToolCall?.(chunk);
            break;
            
          case 'action':
            // OpenHands-style action event
            const action = chunk as ObsidianAction;
            await this.eventStream.addEvent(action);
            handlers.onAction?.(action);
            break;
            
          case 'observation':
            // OpenHands-style observation event
            const observation = chunk as ObsidianObservation;
            await this.eventStream.addEvent(observation);
            handlers.onObservation?.(observation);
            break;
            
          case 'progress':
            handlers.onProgress?.(chunk.progress);
            break;
            
          case 'error':
            handlers.onError?.(new Error(chunk.message));
            break;
        }
      }
      
      handlers.onComplete?.(fullResponse, toolCalls, events);
      return { success: true, response: fullResponse, toolCalls, events };
      
    } catch (error) {
      handlers.onError?.(error as Error);
      return { success: false, error: error as Error };
    } finally {
      this.activeStreams.delete(requestId);
    }
  }
  
  // Real-time event subscription (OpenHands pattern)
  subscribeToEvents(eventType: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }
  
  // Broadcast events to subscribers
  private async broadcastEvent(event: ObsidianEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.type) || new Set();
    for (const callback of subscribers) {
      try {
        await callback(event);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    }
  }
  
  cancelStream(requestId: string): void {
    const controller = this.activeStreams.get(requestId);
    controller?.abort();
  }
}
```

### 5. Enhanced AI Provider System (OpenHands + Multi-Provider Architecture)

```typescript
// Enhanced unified provider interface with OpenHands LiteLLM integration
export abstract class BaseAIProvider {
  abstract name: string;
  abstract supportedModels: string[];
  
  abstract authenticate(): Promise<void>;
  abstract isAuthenticated(): Promise<boolean>;
  
  // Enhanced to support OpenHands-style tool integration
  abstract generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk>;
  
  // OpenHands-style tool support
  abstract completion(
    messages: ChatMessage[],
    model?: string,
    tools?: ToolDefinition[],
    **kwargs
  ): Promise<ModelResponse>;
  
  abstract supportsFunctionCalling(): boolean;
  abstract getMaxTokens(model: string): number;
  abstract estimateCost(tokens: number, model: string): number;
  
  // Enhanced capabilities
  supportsStreaming(): boolean { return true; }
  supportsImages(): boolean { return false; }
  supportsDocuments(): boolean { return false; }
  supportsTools(): boolean { return false; }
  supportsAgents(): boolean { return false; }
}

// LiteLLM integration for universal provider compatibility (OpenHands pattern)
export class LiteLLMProvider extends BaseAIProvider {
  name = 'litellm';
  supportedModels = ['*']; // Supports all models through LiteLLM
  
  async completion(
    messages: ChatMessage[],
    model?: string,
    tools?: ToolDefinition[],
    ...kwargs
  ): Promise<ModelResponse> {
    // Convert tools to OpenAI function format
    const functions = tools?.map(tool => tool.toOpenAIFunction()) || [];
    
    const response = await litellm.completion({
      model: model || this.defaultModel,
      messages,
      functions: functions.length > 0 ? functions : undefined,
      ...kwargs
    });
    
    return ModelResponse.fromLiteLLM(response);
  }
  
  async *generateResponse(
    messages: ChatMessage[],
    options: GenerationOptions
  ): AsyncGenerator<ResponseChunk> {
    const stream = await litellm.completion({
      model: options.model || this.defaultModel,
      messages,
      stream: true,
      tools: options.tools,
      ...options
    });
    
    for await (const chunk of stream) {
      yield this.transformChunk(chunk);
    }
  }
}

// Enhanced provider manager with LiteLLM integration and event-driven fallbacks
export class ProviderManager {
  private providers = new Map<string, BaseAIProvider>();
  private liteLLMProvider: LiteLLMProvider;
  private defaultProvider: string;
  private fallbackProviders: string[] = [];
  private eventStream: EventStreamManager;
  
  constructor(eventStream: EventStreamManager) {
    this.eventStream = eventStream;
    this.liteLLMProvider = new LiteLLMProvider();
  }
  
  async generateResponse(
    request: GenerationRequest,
    options: GenerationOptions = {}
  ): Promise<AsyncGenerator<ResponseChunk>> {
    const provider = options.provider || this.defaultProvider;
    
    // Emit provider selection event
    await this.eventStream.addEvent({
      id: generateId(),
      timestamp: new Date().toISOString(),
      source: 'provider_manager',
      vaultPath: options.vaultPath || '',
      type: 'provider_selected',
      data: { provider, model: options.model }
    });
    
    try {
      // Try primary provider
      return await this.executeWithProvider(provider, request, options);
    } catch (error) {
      // Emit provider error event
      await this.eventStream.addEvent({
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: 'provider_manager',
        vaultPath: options.vaultPath || '',
        type: 'provider_error',
        data: { provider, error: error.message }
      });
      
      // Try LiteLLM as universal fallback
      if (provider !== 'litellm') {
        try {
          console.warn(`Provider ${provider} failed, trying LiteLLM fallback`);
          return await this.executeWithProvider('litellm', request, {
            ...options,
            model: this.mapToLiteLLMModel(options.model || this.getDefaultModel(provider))
          });
        } catch (liteLLMError) {
          console.error('LiteLLM fallback also failed:', liteLLMError);
        }
      }
      
      // Attempt other fallback providers
      for (const fallbackProvider of this.fallbackProviders) {
        if (fallbackProvider !== provider && fallbackProvider !== 'litellm') {
          try {
            console.warn(`Trying fallback provider ${fallbackProvider}`);
            return await this.executeWithProvider(fallbackProvider, request, options);
          } catch (fallbackError) {
            console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
          }
        }
      }
      
      // All providers failed
      await this.eventStream.addEvent({
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: 'provider_manager',
        vaultPath: options.vaultPath || '',
        type: 'all_providers_failed',
        data: { originalError: error.message }
      });
      
      throw error;
    }
  }
  
  // OpenHands-style completion method
  async completion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<ModelResponse> {
    const provider = this.providers.get(options.provider || this.defaultProvider);
    if (!provider) {
      throw new Error(`Provider not found: ${options.provider}`);
    }
    
    return await provider.completion(
      messages,
      options.model,
      options.tools,
      options
    );
  }
}
```

## Deep Obsidian Integration Patterns

### Enhanced Plugin Architecture

#### Core Plugin Structure

```typescript
// Main plugin class with sophisticated lifecycle management
export default class ObsiusPlugin extends Plugin {
  // Core services (lazy-loaded)
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
  
  // Plugin lifecycle
  async onload() {
    console.log('Loading Obsius plugin...');
    
    // Initialize core services first
    await this.initializeCoreServices();
    
    // Setup UI and integrations
    await this.initializeUI();
    
    // Register with Obsidian
    await this.registerWithObsidian();
    
    // Start background services
    await this.startBackgroundServices();
    
    console.log('Obsius plugin loaded successfully');
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
    
    await this.executeCleanupTasks(cleanupTasks);
    console.log('Obsius plugin unloaded');
  }
  
  private async initializeCoreServices(): Promise<void> {
    // Security manager (always first)
    this.securityManager = new SecurityManager();
    
    // Settings with migration support
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();
    
    // UI manager
    this.uiManager = new UIManager(this.app, this.getServices.bind(this));
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
}
```

#### Integration Points

1. **Command Palette Registration**
   ```typescript
   private registerCommands(): void {
     // Main interface commands
     this.addCommand({
       id: 'open-chat',
       name: 'Open AI Chat',
       callback: () => this.uiManager.openChatView()
     });
     
     this.addCommand({
       id: 'new-session',
       name: 'Start New Session',
       callback: () => this.getAgentOrchestrator().createSession()
     });
     
     // Provider switching
     this.addCommand({
       id: 'switch-provider',
       name: 'Switch AI Provider',
       callback: () => this.uiManager.showProviderSelector()
     });
   }
   ```

2. **View System Integration**
   ```typescript
   private registerViews(): void {
     // Register multiple view types
     this.registerView('obsius-chat', (leaf) => 
       new ChatView(leaf, this.getServices())
     );
     
     this.registerView('obsius-apply', (leaf) => 
       new ApplyView(leaf, this.getServices())
     );
     
     this.registerView('obsius-settings', (leaf) => 
       new SettingsView(leaf, this.settingsManager)
     );
   }
   ```

3. **Event System Integration**
   ```typescript
   private setupEventHandlers(): void {
     // File system events
     this.registerEvent(
       this.app.vault.on('create', (file) => {
         this.getRagEngine().scheduleIndexing(file);
       })
     );
     
     this.registerEvent(
       this.app.vault.on('modify', (file) => {
         this.getRagEngine().updateIndex(file);
       })
     );
     
     // Workspace events
     this.registerEvent(
       this.app.workspace.on('active-leaf-change', (leaf) => {
         this.getAgentOrchestrator().updateContext({ activeFile: leaf?.view.file });
       })
     );
   }
   ```

4. **Settings Tab Integration**
   ```typescript
   private setupSettings(): void {
     this.addSettingTab(new ObsiusSettingTab(this.app, this));
   }
   ```

5. **Ribbon Integration**
   ```typescript
   private setupRibbon(): void {
     // Main access point
     this.addRibbonIcon('bot', 'Open Obsius AI', () => {
       this.uiManager.toggleMainInterface();
     });
     
     // Quick actions
     this.addRibbonIcon('search', 'Search Knowledge', () => {
       this.uiManager.openKnowledgeSearch();
     });
   }
   ```

#### Performance Optimizations

1. **Lazy Loading Strategy**
   - Heavy services initialized only when needed
   - Provider loading deferred until first use
   - RAG engine started on background thread
   - MCP servers connected on demand

2. **Resource Management**
   - Automatic cleanup with timeout protection
   - Memory monitoring and garbage collection hints
   - Connection pooling for external services
   - Intelligent caching with TTL

3. **Error Recovery**
   - Service isolation prevents cascading failures
   - Automatic restart for failed background services
   - Graceful degradation when optional features fail
   - User notification for critical errors

#### Platform Compatibility

```typescript
// Platform-specific feature enablement
class PlatformManager {
  static isDesktop(): boolean {
    return !Platform.isMobile;
  }
  
  static enableFeatureForPlatform<T>(feature: T): T | null {
    // MCP only on desktop
    if (feature instanceof McpManager && Platform.isMobile) {
      return null;
    }
    
    // Full file system access only on desktop
    if (feature instanceof FileSystemTool && Platform.isMobile) {
      return new RestrictedFileSystemTool() as T;
    }
    
    return feature;
  }
}
```

### Comprehensive UI Integration with Real-time Events

#### 1. Event-Driven Multi-Modal Interface System

```typescript
// Event-driven adaptive UI with real-time updates
export class UIManager {
  private currentMode: UIMode = 'hybrid';
  private views = new Map<string, ObsiusView>();
  private eventStream: EventStreamManager;
  private eventSubscriptions: (() => void)[] = [];
  
  constructor(eventStream: EventStreamManager) {
    this.eventStream = eventStream;
  }
  
  async initializeUI(): Promise<void> {
    // Register multiple view types
    this.registerView('obsius-chat', ChatView);
    this.registerView('obsius-cli', CLIView);
    this.registerView('obsius-apply', ApplyView);
    this.registerView('obsius-events', EventStreamView);
    
    // Setup real-time event subscriptions
    this.setupEventSubscriptions();
    
    // Setup command palette integration
    this.registerCommands();
    
    // Initialize ribbon and status bar
    this.setupRibbonIcons();
    this.setupStatusBar();
  }
  
  private setupEventSubscriptions(): void {
    // Subscribe to agent actions for real-time UI updates
    this.eventSubscriptions.push(
      this.eventStream.subscribeToEvents('action', (event) => {
        this.updateUIForAction(event as ObsidianAction);
      })
    );
    
    // Subscribe to observations for result display
    this.eventSubscriptions.push(
      this.eventStream.subscribeToEvents('observation', (event) => {
        this.updateUIForObservation(event as ObsidianObservation);
      })
    );
    
    // Subscribe to provider events for status updates
    this.eventSubscriptions.push(
      this.eventStream.subscribeToEvents('provider_selected', (event) => {
        this.updateProviderStatus(event.data);
      })
    );
  }
  
  switchMode(mode: UIMode): void {
    this.currentMode = mode;
    this.updateActiveViews();
    
    // Emit mode change event
    this.eventStream.addEvent({
      id: generateId(),
      timestamp: new Date().toISOString(),
      source: 'ui_manager',
      vaultPath: '',
      type: 'ui_mode_changed',
      data: { oldMode: this.currentMode, newMode: mode }
    });
  }
  
  cleanup(): void {
    // Unsubscribe from all events
    this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
    this.eventSubscriptions = [];
  }
}

// Event-driven CLI-style interface component
const CLIInterface: React.FC = () => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CLIEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { events, sendAction } = useEventStream();
  const { session } = useSession();
  
  // Real-time updates from event stream
  useEffect(() => {
    const latestEvent = events[events.length - 1];
    if (latestEvent) {
      updateHistoryFromEvent(latestEvent);
    }
  }, [events]);
  
  const handleCommand = async (cmd: string) => {
    setIsProcessing(true);
    
    // Convert command to action
    const action: ObsidianAction = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      source: 'cli_interface',
      vaultPath: session.vaultPath,
      type: parseCommandType(cmd),
      parameters: parseCommandParameters(cmd),
      riskLevel: assessCommandRisk(cmd),
      requiresConfirmation: shouldConfirmCommand(cmd)
    };
    
    try {
      await sendAction(action);
    } finally {
      setIsProcessing(false);
      setCommand('');
    }
  };
  
  return (
    <div className="obsius-cli">
      <CLIHistory entries={history} events={events} />
      <CLIInput 
        value={command}
        onChange={setCommand}
        onSubmit={handleCommand}
        disabled={isProcessing}
        autoComplete={getAutoCompleteOptions()}
      />
      <CLIStatus 
        isProcessing={isProcessing}
        currentSession={session}
        latestEvent={events[events.length - 1]}
      />
      <EventStreamIndicator events={events} />
    </div>
  );
};

// Event-driven chat-style interface component
const ChatInterface: React.FC = () => {
  const { events, sendAction } = useEventStream();
  const { session, messages } = useSession();
  const { provider } = useProvider();
  
  // Convert events to chat messages in real-time
  const chatMessages = useMemo(() => {
    return convertEventsToMessages(events, messages);
  }, [events, messages]);
  
  const handleMessage = async (content: string, files?: File[]) => {
    const action: ObsidianAction = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      source: 'chat_interface',
      vaultPath: session.vaultPath,
      type: 'chat_message',
      parameters: { content, files },
      riskLevel: 'low',
      requiresConfirmation: false
    };
    
    await sendAction(action);
  };
  
  return (
    <div className="obsius-chat">
      <ChatHeader session={session} provider={provider} />
      <ChatMessages 
        messages={chatMessages}
        events={events}
        onActionRetry={(action) => sendAction(action)}
      />
      <ChatInput 
        onSubmit={handleMessage}
        supportsMentions={true}
        supportsFiles={true}
        disabled={session.isProcessing}
      />
      <ChatStatus 
        provider={provider}
        latestEvent={events[events.length - 1]}
        session={session}
      />
      <ActionProgressBar events={events} />
    </div>
  );
};
```

#### 2. Advanced Input Components

```typescript
// Rich text input with @mentions and file support
const AdvancedChatInput: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  
  return (
    <div className="obsius-input">
      <LexicalComposer initialConfig={editorConfig}>
        <RichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={<InputPlaceholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MentionPlugin 
          onMention={handleFileMention}
          triggerChar="@"
        />
        <ImagePastePlugin 
          onImagePaste={handleImagePaste}
        />
        <CommandSuggestionPlugin 
          commands={availableCommands}
        />
      </LexicalComposer>
      <InputToolbar 
        onSubmit={handleSubmit}
        onClear={handleClear}
        onToggleMode={handleModeToggle}
      />
    </div>
  );
};
```

#### 3. Integration Points

1. **Command Palette Integration**
   - "Obsius: Start New Session" - Quick session creation
   - "Obsius: Switch Provider" - Change AI provider
   - "Obsius: Toggle Interface Mode" - Switch between CLI/Chat
   - "Obsius: Open Settings" - Configuration access
   - "Obsius: Search Knowledge" - RAG-based search

2. **Multi-View System**
   - **Chat View** - Conversation-style interface
   - **CLI View** - Terminal-style command interface  
   - **Apply View** - Diff visualization and change application
   - **Settings View** - Configuration and provider management
   - **Knowledge View** - RAG search and exploration

3. **Context Menu Integration**
   - **File Context Menu** - "Ask Obsius about this file"
   - **Selection Context Menu** - "Explain selected text"
   - **Note Context Menu** - "Summarize this note"

4. **Ribbon and Status Integration**
   - **Ribbon Icons** - Quick access to main functions
   - **Status Bar** - Session status, provider info, token usage
   - **Progress Indicators** - Real-time operation feedback

5. **Editor Integration**
   - **Code Lens** - Inline AI suggestions and actions
   - **Hover Providers** - Context-aware information display
   - **Quick Actions** - Floating action buttons for common tasks

6. **Workspace Integration**
   - **File Explorer** - Knowledge graph visualization
   - **Graph View** - AI-enhanced relationship mapping
   - **Search Integration** - Semantic search in Obsidian's search

#### 4. Responsive Design Patterns

```typescript
// Adaptive UI based on screen size and platform
const ResponsiveLayout: React.FC = () => {
  const { screenSize, platform } = useObsidianContext();
  
  if (platform === 'mobile') {
    return <MobileOptimizedInterface />;
  }
  
  return (
    <div className={`obsius-layout obsius-${screenSize}`}>
      {screenSize === 'large' ? (
        <TwoColumnLayout />
      ) : (
        <SingleColumnLayout />
      )}
    </div>
  );
};
```

### Comprehensive Tool Ecosystem

#### 1. Core Note Operations

```typescript
// Advanced note creation with templates and context
export class CreateNoteTool extends BaseTool<CreateNoteParams, CreateNoteResult> {
  async execute(
    params: CreateNoteParams,
    context: ExecutionContext
  ): Promise<CreateNoteResult> {
    // Validate parameters
    const validation = this.validateParams(params);
    if (!validation.valid) {
      throw new ToolValidationError(validation.errors);
    }
    
    // Generate file path with conflict resolution
    const filePath = await this.generateFilePath(params.title, params.folder);
    
    // Apply template if specified
    let content = params.content;
    if (params.template) {
      content = await this.applyTemplate(params.template, params.templateVars);
    }
    
    // Add metadata and frontmatter
    content = this.addFrontmatter(content, {
      created: new Date(),
      tags: params.tags,
      ...params.metadata
    });
    
    // Create the file
    const file = await this.app.vault.create(filePath, content);
    
    // Update graph and links if needed
    if (params.createLinks) {
      await this.createAutoLinks(file, context.currentFile);
    }
    
    return {
      success: true,
      message: `Created note: ${params.title}`,
      file: file,
      path: filePath
    };
  }
}

// Semantic note search with RAG integration
export class SemanticSearchTool extends BaseTool<SearchParams, SearchResult> {
  async execute(
    params: SearchParams,
    context: ExecutionContext
  ): Promise<SearchResult> {
    const ragEngine = context.services.ragEngine;
    
    // Perform semantic search
    const semanticResults = await ragEngine.searchSimilar(params.query, {
      limit: params.limit || 10,
      threshold: params.threshold || 0.7,
      includeFiles: params.includeFiles,
      excludeFiles: params.excludeFiles
    });
    
    // Enhance with traditional keyword search
    const keywordResults = await this.keywordSearch(params.query);
    
    // Merge and rank results
    const combinedResults = this.mergeSearchResults(
      semanticResults,
      keywordResults,
      params.query
    );
    
    return {
      success: true,
      results: combinedResults,
      totalFound: combinedResults.length,
      searchType: 'semantic+keyword'
    };
  }
}
```

#### 2. Advanced Vault Operations

```typescript
// Intelligent note organization
export class OrganizeVaultTool extends BaseTool {
  async execute(params: OrganizeParams): Promise<OrganizeResult> {
    const operations: OrganizationOperation[] = [];
    
    // Analyze vault structure
    const analysis = await this.analyzeVaultStructure();
    
    // Suggest folder reorganization
    if (params.reorganizeFolders) {
      const folderSuggestions = await this.suggestFolderStructure(analysis);
      operations.push(...folderSuggestions);
    }
    
    // Suggest tag cleanup
    if (params.cleanupTags) {
      const tagSuggestions = await this.suggestTagCleanup(analysis);
      operations.push(...tagSuggestions);
    }
    
    // Create missing links
    if (params.createMissingLinks) {
      const linkSuggestions = await this.suggestMissingLinks(analysis);
      operations.push(...linkSuggestions);
    }
    
    return {
      success: true,
      operations,
      estimatedImpact: this.calculateImpact(operations)
    };
  }
}

// Knowledge graph analysis
export class AnalyzeKnowledgeGraphTool extends BaseTool {
  async execute(params: AnalysisParams): Promise<AnalysisResult> {
    const graph = await this.buildKnowledgeGraph();
    
    const insights = {
      centralNodes: this.findCentralNodes(graph),
      clusters: this.identifyClusters(graph),
      gaps: this.identifyKnowledgeGaps(graph),
      recommendations: await this.generateRecommendations(graph)
    };
    
    return {
      success: true,
      insights,
      graphMetrics: this.calculateGraphMetrics(graph)
    };
  }
}
```

#### 3. Content Enhancement Tools

```typescript
// AI-powered content improvement
export class EnhanceContentTool extends BaseTool {
  async execute(params: EnhanceParams): Promise<EnhanceResult> {
    const content = params.content || await this.getCurrentNoteContent();
    
    const enhancements: ContentEnhancement[] = [];
    
    // Grammar and style improvements
    if (params.improveWriting) {
      const writingEnhancements = await this.improveWriting(content);
      enhancements.push(...writingEnhancements);
    }
    
    // Add missing citations and references
    if (params.addReferences) {
      const references = await this.findReferences(content);
      enhancements.push(...references);
    }
    
    // Suggest internal links
    if (params.addInternalLinks) {
      const linkSuggestions = await this.suggestInternalLinks(content);
      enhancements.push(...linkSuggestions);
    }
    
    // Generate summary and outline
    if (params.addStructure) {
      const structure = await this.improveStructure(content);
      enhancements.push(...structure);
    }
    
    return {
      success: true,
      enhancements,
      preview: this.generatePreview(content, enhancements)
    };
  }
}

// Automated tagging and categorization
export class AutoTagTool extends BaseTool {
  async execute(params: AutoTagParams): Promise<AutoTagResult> {
    const content = params.content || await this.getCurrentNoteContent();
    
    // Extract entities and concepts
    const entities = await this.extractEntities(content);
    const concepts = await this.extractConcepts(content);
    
    // Generate tag suggestions
    const suggestions = await this.generateTagSuggestions(
      entities,
      concepts,
      this.getExistingTags()
    );
    
    // Apply confidence filtering
    const filteredSuggestions = suggestions.filter(
      tag => tag.confidence > (params.confidenceThreshold || 0.7)
    );
    
    return {
      success: true,
      suggestions: filteredSuggestions,
      entities,
      concepts
    };
  }
}
```

#### 4. Research and Analysis Tools

```typescript
// Web research integration
export class WebResearchTool extends BaseTool {
  async execute(params: ResearchParams): Promise<ResearchResult> {
    const searchResults = await this.performWebSearch(params.query);
    
    const analysis = {
      sources: await this.analyzeSources(searchResults),
      keyFindings: await this.extractKeyFindings(searchResults),
      citations: this.generateCitations(searchResults),
      summary: await this.generateSummary(searchResults)
    };
    
    // Create research note if requested
    if (params.createNote) {
      const note = await this.createResearchNote(analysis, params.query);
      return { ...analysis, note };
    }
    
    return { success: true, ...analysis };
  }
}

// Literature review and synthesis
export class SynthesizeTool extends BaseTool {
  async execute(params: SynthesisParams): Promise<SynthesisResult> {
    // Gather related notes
    const relatedNotes = await this.findRelatedNotes(params.topic);
    
    // Extract key themes and concepts
    const themes = await this.extractThemes(relatedNotes);
    const concepts = await this.mapConcepts(relatedNotes);
    
    // Generate synthesis
    const synthesis = await this.generateSynthesis(themes, concepts, params.format);
    
    return {
      success: true,
      synthesis,
      sources: relatedNotes,
      themes,
      concepts
    };
  }
}
```

#### 5. Collaboration and Sharing Tools

```typescript
// Export and sharing utilities
export class ExportTool extends BaseTool {
  async execute(params: ExportParams): Promise<ExportResult> {
    const content = await this.gatherContent(params.scope);
    
    const exportData = await this.formatForExport(content, params.format);
    
    if (params.destination === 'file') {
      const filePath = await this.saveToFile(exportData, params.filename);
      return { success: true, filePath };
    } else if (params.destination === 'clipboard') {
      await navigator.clipboard.writeText(exportData);
      return { success: true, message: 'Copied to clipboard' };
    }
    
    return { success: true, data: exportData };
  }
}

// Team collaboration features
export class CollaborationTool extends BaseTool {
  async execute(params: CollabParams): Promise<CollabResult> {
    // Generate shareable summaries
    if (params.action === 'summarize') {
      const summary = await this.generateSummary(params.content);
      return { success: true, summary };
    }
    
    // Create discussion points
    if (params.action === 'discuss') {
      const points = await this.generateDiscussionPoints(params.content);
      return { success: true, discussionPoints: points };
    }
    
    // Generate action items
    if (params.action === 'actionItems') {
      const items = await this.extractActionItems(params.content);
      return { success: true, actionItems: items };
    }
  }
}
```

#### Tool Categories Summary

1. **Core Operations** - Basic CRUD operations for notes and vault management
2. **Content Enhancement** - AI-powered writing improvement and structure optimization
3. **Knowledge Management** - Graph analysis, organization, and relationship discovery
4. **Research Tools** - Web research, synthesis, and literature review assistance
5. **Collaboration** - Sharing, export, and team collaboration features
6. **Automation** - Batch operations, workflow automation, and intelligent suggestions
7. **Integration** - External service connections and data import/export
8. **Analysis** - Content analysis, metrics, and insight generation

## Enhanced Event-Driven Data Flow

### Primary Interaction Flow (Event-Driven)
1. **User Input** → CLI/Chat interface captures command with rich text support
2. **Action Creation** → Convert user input to structured ObsidianAction event
3. **Event Emission** → Broadcast action event to all subscribers
4. **Context Gathering** → Collect current file, selection, workspace state, and @mentions
5. **RAG Enhancement** → Semantic search for relevant vault content based on action
6. **Agent Processing** → Agent generates response using context and retrieved knowledge
7. **Tool Execution** → Execute required tools with real-time progress events
8. **Observation Events** → Emit observation events for each tool result
9. **Response Streaming** → Real-time response with event-driven UI updates
10. **State Updates** → Update session state and emit state change events
11. **UI Synchronization** → All UI components update based on event stream
12. **Session Persistence** → Save conversation history and events

### Primary Interaction Flow
1. **User Input** → CLI-style interface captures command with rich text support
2. **Context Gathering** → Collect current file, selection, workspace state, and @mentions
3. **RAG Enhancement** → Semantic search for relevant vault content based on query
4. **Request Formation** → Combine user input, context, and retrieved knowledge
5. **Provider Selection** → Choose AI provider based on capability requirements
6. **Streaming Generation** → Real-time response with tool call detection
7. **Tool Execution Pipeline** → Validate, confirm, and execute tools with progress tracking
8. **Response Integration** → Merge AI response with tool results and context
9. **UI Updates** → Stream display with syntax highlighting and interactive elements
10. **Session Persistence** → Save conversation history and update context

### Enhanced Tool Execution Sub-Flow (Action/Observation)
1. **Action Creation** → Convert tool call to structured ObsidianAction
2. **Action Event** → Emit action event for real-time UI feedback
3. **Security Analysis** → Comprehensive risk assessment (OpenHands pattern)
4. **Parameter Validation** → Schema-based validation of tool parameters
5. **User Confirmation** → Present confirmation dialog for risky operations
6. **Execution Monitoring** → Track progress with real-time event updates
7. **Observation Creation** → Generate structured ObsidianObservation
8. **Observation Event** → Emit observation event with results
9. **State Updates** → Update tool state and session context
10. **UI Updates** → Real-time display of action progress and results
1. **Tool Discovery** → AI identifies required tools from registry
2. **Parameter Validation** → Schema-based validation of tool parameters
3. **Risk Assessment** → Evaluate potential impact and security implications
4. **User Confirmation** → Present confirmation dialog for risky operations
5. **Execution Monitoring** → Track progress and handle errors gracefully
6. **Result Processing** → Format and integrate tool outputs
7. **State Updates** → Update tool state and session context

### RAG Integration Flow
1. **Query Analysis** → Extract semantic meaning from user input
2. **Embedding Generation** → Convert query to vector representation
3. **Similarity Search** → Find relevant content in vector database
4. **Context Ranking** → Score and prioritize retrieved information
5. **Context Integration** → Merge retrieved content with user query
6. **Response Enhancement** → Use retrieved context to improve AI responses

### Event-Driven Session Management Flow
1. **Session Creation** → Initialize with event stream and configuration
2. **Event Subscription** → Subscribe to relevant event types
3. **Context Preservation** → Maintain workspace state through events
4. **Event History** → Store all events for session replay and analysis
5. **Memory Management** → Intelligent event pruning and compression
6. **State Synchronization** → Keep all components in sync via events
7. **Persistence** → Auto-save events and session state
8. **Recovery** → Restore sessions by replaying event history
1. **Session Creation** → Initialize new conversation with configuration
2. **Context Preservation** → Maintain workspace state and file references
3. **History Management** → Intelligent pruning and compression of conversation history
4. **State Synchronization** → Keep UI in sync with session state changes
5. **Persistence** → Auto-save sessions with configurable frequency
6. **Recovery** → Restore sessions after plugin restart or Obsidian reload

## Configuration System

### Hierarchical Configuration System

```typescript
// Multi-level configuration with precedence and inheritance
export class ConfigurationManager {
  private globalConfig: ObsiusConfig;
  private vaultConfigs = new Map<string, Partial<ObsiusConfig>>();
  private noteConfigs = new Map<string, Partial<ObsiusConfig>>();
  
  async loadConfiguration(vaultPath: string): Promise<ObsiusConfig> {
    // Load configuration hierarchy with precedence:
    // Note-level > Vault-level > Global > Defaults
    
    const configs = [
      this.getDefaultConfig(),           // Base defaults
      await this.loadGlobalConfig(),     // Global plugin settings
      await this.loadVaultConfig(vaultPath), // Vault-specific settings
      await this.loadNoteConfig()        // Current note frontmatter
    ];
    
    return this.mergeConfigs(configs);
  }
  
  private async loadGlobalConfig(): Promise<Partial<ObsiusConfig>> {
    const data = await this.plugin.loadData();
    return data?.config || {};
  }
  
  private async loadVaultConfig(vaultPath: string): Promise<Partial<ObsiusConfig>> {
    const configPath = path.join(vaultPath, '.obsius', 'config.json');
    if (await this.fileExists(configPath)) {
      const configData = await this.readJsonFile(configPath);
      return configData;
    }
    return {};
  }
  
  private async loadNoteConfig(): Promise<Partial<ObsiusConfig>> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return {};
    
    const cache = this.app.metadataCache.getFileCache(activeFile);
    if (cache?.frontmatter?.obsius) {
      return cache.frontmatter.obsius;
    }
    return {};
  }
}

// Configuration inheritance and merging
class ConfigMerger {
  static mergeConfigs(configs: Partial<ObsiusConfig>[]): ObsiusConfig {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {}) as ObsiusConfig;
  }
  
  private static deepMerge(
    target: Record<string, any>, 
    source: Record<string, any>
  ): Record<string, any> {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}
```

### Configuration Levels

1. **Default Configuration** - Built-in sensible defaults
2. **Global Settings** - Stored in Obsidian's plugin data
3. **Vault Configuration** - Per-vault settings in `.obsius/config.json`
4. **Note-level Settings** - Frontmatter-based configuration

### Configuration Examples

```yaml
# Global config (plugin settings)
providers:
  claude:
    apiKey: "sk-..."
    model: "claude-3-sonnet"
  gemini:
    apiKey: "AI..."
    model: "gemini-pro"
defaultProvider: "claude"
```

```yaml
# Vault config (.obsius/config.json)
{
  "rag": {
    "enabled": true,
    "similarityThreshold": 0.8
  },
  "tools": {
    "enabled": ["create_note", "update_note", "search_notes"]
  }
}
```

```yaml
# Note-level config (frontmatter)
---
obsius:
  provider: "gemini"
  temperature: 0.3
  tools:
    confirmationRequired: []
---
```

### Enhanced Configuration Schema

```typescript
// Comprehensive configuration with validation and migrations
export const ObsiusConfigSchema = z.object({
  version: z.number().default(1),
  
  // AI Provider Configuration
  providers: z.record(z.object({
    name: z.string(),
    type: z.enum(['openai', 'anthropic', 'google', 'ollama', 'custom']),
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
    model: z.string(),
    maxTokens: z.number().min(1).max(100000).default(4096),
    temperature: z.number().min(0).max(2).default(0.7),
    enabled: z.boolean().default(true),
    capabilities: z.object({
      streaming: z.boolean().default(true),
      functionCalling: z.boolean().default(true),
      images: z.boolean().default(false),
      documents: z.boolean().default(false)
    }).default({})
  })).default({}),
  
  defaultProvider: z.string().default('claude'),
  fallbackProviders: z.array(z.string()).default([]),
  
  // Tool System Configuration
  tools: z.object({
    enabled: z.array(z.string()).default([]),
    disabled: z.array(z.string()).default([]),
    confirmationRequired: z.array(z.string()).default(['delete_note', 'move_note']),
    riskLevels: z.object({
      low: z.array(z.string()).default(['read_note', 'search_notes']),
      medium: z.array(z.string()).default(['create_note', 'update_note']),
      high: z.array(z.string()).default(['delete_note', 'move_note'])
    }).default({}),
    timeout: z.number().min(1000).max(300000).default(30000)
  }).default({}),
  
  // RAG System Configuration
  rag: z.object({
    enabled: z.boolean().default(true),
    embeddingProvider: z.string().default('openai'),
    embeddingModel: z.string().default('text-embedding-ada-002'),
    vectorDatabase: z.string().default('pglite'),
    chunkSize: z.number().min(100).max(2000).default(1000),
    chunkOverlap: z.number().min(0).max(500).default(200),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    maxResults: z.number().min(1).max(100).default(10),
    autoIndex: z.boolean().default(true),
    indexingSchedule: z.enum(['manual', 'startup', 'realtime']).default('startup')
  }).default({}),
  
  // UI and UX Configuration
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    interface: z.enum(['cli', 'chat', 'hybrid']).default('hybrid'),
    showTimestamps: z.boolean().default(true),
    showTokenCount: z.boolean().default(false),
    enableStreaming: z.boolean().default(true),
    autoScroll: z.boolean().default(true),
    enableAnimations: z.boolean().default(true),
    confirmDestructiveActions: z.boolean().default(true),
    showToolDetails: z.boolean().default(true),
    enableSyntaxHighlighting: z.boolean().default(true)
  }).default({}),
  
  // Session Management
  sessions: z.object({
    maxHistorySize: z.number().min(10).max(1000).default(100),
    autoSave: z.boolean().default(true),
    saveInterval: z.number().min(1000).max(60000).default(5000),
    persistAcrossReloads: z.boolean().default(true),
    maxSessions: z.number().min(1).max(100).default(10)
  }).default({}),
  
  // MCP Integration
  mcp: z.object({
    enabled: z.boolean().default(false),
    servers: z.array(z.object({
      name: z.string(),
      command: z.string(),
      args: z.array(z.string()).default([]),
      env: z.record(z.string()).default({}),
      enabled: z.boolean().default(true),
      autoStart: z.boolean().default(false),
      timeout: z.number().min(1000).max(60000).default(10000)
    })).default([]),
    globalTimeout: z.number().min(1000).max(300000).default(30000)
  }).default({}),
  
  // Performance and Resource Management
  performance: z.object({
    maxConcurrentRequests: z.number().min(1).max(10).default(3),
    requestTimeout: z.number().min(5000).max(300000).default(60000),
    enableCaching: z.boolean().default(true),
    cacheSize: z.number().min(10).max(1000).default(100),
    enableTelemetry: z.boolean().default(false)
  }).default({})
});

export type ObsiusConfig = z.infer<typeof ObsiusConfigSchema>;
```

## Comprehensive Security Framework

### 1. API Key and Credential Security
- **Encrypted Storage** - API keys encrypted using Web Crypto API
- **Environment Variables** - Support for environment-based configuration
- **Key Rotation** - Automated key expiration and renewal prompts
- **Secure Transmission** - HTTPS enforcement for all API communications
- **Local Storage Only** - No credentials transmitted to external services

### 2. Tool Execution Security
- **Risk-Based Confirmation** - Multi-level approval system based on operation impact
- **Sandbox Isolation** - Restrict tool operations to vault boundaries
- **Permission Matrix** - Granular control over tool access per session
- **Audit Logging** - Comprehensive logging of all tool executions
- **Rollback Capability** - Undo functionality for destructive operations

### 3. MCP Security Model
- **Conversation Allowlists** - Tool permissions scoped to individual conversations
- **Subprocess Isolation** - MCP servers run in isolated processes
- **Timeout Protection** - Automatic termination of long-running operations
- **Resource Limits** - CPU and memory constraints for external tools
- **Communication Encryption** - Secure channels for MCP protocol

### 4. Data Privacy and Protection
- **Local Processing** - All sensitive operations performed locally
- **Anonymization** - Optional anonymization of data sent to AI providers
- **Consent Management** - Clear opt-in for data sharing features
- **Vault Isolation** - Cross-vault data leakage prevention
- **Secure Cleanup** - Proper disposal of sensitive data in memory

### 5. Input Validation and Sanitization
- **Schema Validation** - All inputs validated against JSON schemas
- **Path Traversal Protection** - Prevent access outside vault boundaries
- **Command Injection Prevention** - Sanitize all shell commands and parameters
- **XSS Protection** - Sanitize user content in React components
- **Rate Limiting** - Prevent abuse of API endpoints and tools

## Advanced System Components

### 1. RAG Engine Integration (Smart Composer Pattern)

```typescript
// Local vector database with semantic search
export class RAGEngine {
  private vectorRepo: VectorRepository;
  private embeddingProvider: EmbeddingProvider;
  private indexingQueue: IndexingQueue;
  
  constructor(
    databasePath: string,
    embeddingProvider: EmbeddingProvider
  ) {
    this.vectorRepo = new VectorRepository(databasePath);
    this.embeddingProvider = embeddingProvider;
    this.indexingQueue = new IndexingQueue();
  }
  
  async searchSimilar(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingProvider.embed(query);
    
    return await this.vectorRepo.similaritySearch(queryEmbedding, {
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
      fileFilter: options.includeFiles,
      excludeFiles: options.excludeFiles
    });
  }
  
  async indexVault(vault: Vault, progressCallback?: ProgressCallback): Promise<void> {
    const files = vault.getMarkdownFiles();
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.indexingQueue.add(() => this.indexFile(file));
      progressCallback?.({ current: i + 1, total: files.length });
    }
  }
}
```

### 2. Session Management with Persistence

```typescript
// Advanced session management with context preservation
export class SessionManager {
  private sessions = new Map<string, Session>();
  private currentSessionId: string | null = null;
  private persistenceManager: PersistenceManager;
  
  async createSession(config: SessionConfig = {}): Promise<Session> {
    const session: Session = {
      id: generateUUID(),
      title: config.title || `Session ${new Date().toLocaleString()}`,
      created: new Date(),
      lastActive: new Date(),
      provider: config.provider || 'claude',
      model: config.model || 'claude-3-sonnet',
      systemPrompt: config.systemPrompt,
      tools: config.enabledTools || this.getDefaultTools(),
      history: [],
      context: {
        currentFile: config.context?.currentFile,
        selectedText: config.context?.selectedText,
        workspaceState: await this.captureWorkspaceState()
      },
      settings: { ...config.settings }
    };
    
    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    
    await this.persistenceManager.saveSession(session);
    return session;
  }
  
  async addMessage(
    sessionId: string,
    message: Message
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    session.history.push(message);
    session.lastActive = new Date();
    
    // Maintain history size limits with intelligent pruning
    if (session.history.length > MAX_HISTORY_SIZE) {
      session.history = this.pruneHistory(session.history);
    }
    
    await this.persistenceManager.saveSession(session);
  }
}
```

### 3. Configuration System with Migrations (Smart Composer Pattern)

```typescript
// Schema-based configuration with automatic migrations
export const ObsiusSettingsSchema = z.object({
  version: z.number().default(CURRENT_VERSION),
  
  providers: z.record(z.object({
    name: z.string(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string(),
    maxTokens: z.number().min(1).max(32000).default(4096),
    temperature: z.number().min(0).max(2).default(0.7),
    enabled: z.boolean().default(true)
  })).default({}),
  
  tools: z.object({
    enabled: z.array(z.string()).default([]),
    confirmationRequired: z.array(z.string()).default(['delete_note', 'move_note']),
    riskThresholds: z.object({
      low: z.array(z.string()),
      medium: z.array(z.string()),
      high: z.array(z.string())
    }).default({ low: [], medium: [], high: [] })
  }).default({}),
  
  rag: z.object({
    enabled: z.boolean().default(true),
    embeddingModel: z.string().default('text-embedding-ada-002'),
    chunkSize: z.number().min(100).max(2000).default(1000),
    chunkOverlap: z.number().min(0).max(500).default(200),
    similarityThreshold: z.number().min(0).max(1).default(0.7),
    maxResults: z.number().min(1).max(50).default(10),
    autoIndex: z.boolean().default(true)
  }).default({}),
  
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    cliStyle: z.boolean().default(true),
    showTimestamps: z.boolean().default(true),
    enableStreaming: z.boolean().default(true),
    autoScroll: z.boolean().default(true)
  }).default({}),
  
  mcp: z.object({
    enabled: z.boolean().default(false),
    servers: z.array(z.object({
      name: z.string(),
      command: z.string(),
      args: z.array(z.string()).default([]),
      env: z.record(z.string()).default({}),
      enabled: z.boolean().default(true)
    })).default([])
  }).default({})
});

export type ObsiusSettings = z.infer<typeof ObsiusSettingsSchema>;
```

### 4. MCP Integration for Extensibility

```typescript
// Model Context Protocol integration for external tools
export class McpManager {
  private servers = new Map<string, McpServer>();
  private tools = new Map<string, McpTool>();
  private conversationAllowlists = new Map<string, Set<string>>();
  
  async addServer(config: McpServerConfig): Promise<void> {
    if (Platform.isMobile) {
      throw new Error('MCP servers are not supported on mobile platforms');
    }
    
    const server = new McpServer(config);
    await server.start();
    
    this.servers.set(config.name, server);
    
    // Discover available tools
    const tools = await server.listTools();
    tools.forEach(tool => {
      this.tools.set(`${config.name}:${tool.name}`, tool);
    });
    
    console.log(`MCP server '${config.name}' started with ${tools.length} tools`);
  }
  
  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    conversationId: string
  ): Promise<McpToolResult> {
    // Security: Check conversation allowlist
    const allowedTools = this.conversationAllowlists.get(conversationId) || new Set();
    if (!allowedTools.has(toolName)) {
      throw new Error(`Tool '${toolName}' not allowed in this conversation`);
    }
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Execute with timeout and error handling
    return await Promise.race([
      tool.execute(parameters),
      this.createTimeout(30000, `Tool execution timeout: ${toolName}`)
    ]);
  }
}
```

## Enhanced Implementation Roadmap with Three-Project Synthesis

### Phase 0: Event-Driven Foundation (OpenHands Patterns)
1. **Event System Architecture** - Core event-driven communication system
2. **Action/Observation Framework** - Basic action and observation types
3. **Real-time Communication** - Event streaming and subscription system
4. **Security Framework Foundation** - Basic risk assessment and confirmation

### Phase 1: Core Foundation (Smart Composer + Gemini CLI)
1. **Plugin Architecture Setup** - Service-oriented design with lazy initialization
2. **React Integration** - Context providers and component architecture
3. **Settings System** - Schema-based configuration with migrations
4. **Provider Framework** - Multi-AI provider support with LiteLLM integration

### Phase 2: Enhanced Core Features (All Three Projects)
1. **Agent System** - OpenHands-style agent orchestration and specialization
2. **Advanced Tool System** - Enhanced validation, risk assessment, and action/observation
3. **Streaming Responses** - Real-time AI interaction with event-driven updates
4. **Session Management** - Event-driven conversations with memory and context
5. **Security Integration** - Comprehensive risk assessment and user confirmation

### Phase 3: Advanced Features (Three-Way Integration)
1. **RAG Integration** - Local vector database with semantic search
2. **MCP Support** - External tool integration for extensibility
3. **Agent Specialization** - Multi-agent system for different task types
4. **Advanced Tools** - Obsidian-specific operations and file management
5. **Enhanced UI** - Real-time event visualization, diff display, apply edits

### Phase 4: Polish and Advanced Capabilities
1. **Performance Optimization** - Event stream optimization, caching, resource management
2. **Advanced Agent Features** - Agent composition, delegation, and coordination
3. **Comprehensive Security** - Advanced risk analysis and sandboxed execution
4. **Testing Framework** - Event-driven testing, agent evaluation, quality assurance
5. **Documentation** - User guides, API documentation, and examples

### Phase 1: Core Foundation
1. **Plugin Architecture Setup** - Service-oriented design with lazy initialization
2. **React Integration** - Context providers and component architecture
3. **Settings System** - Schema-based configuration with migrations
4. **Provider Framework** - Multi-AI provider support with unified interface

### Phase 2: Core Features
1. **Tool System** - Extensible tool registry with validation and confirmation
2. **Streaming Responses** - Real-time AI interaction with cancellation
3. **Session Management** - Persistent conversations with context preservation
4. **Basic UI** - CLI-style interface within Obsidian

### Phase 3: Advanced Features
1. **RAG Integration** - Local vector database with semantic search
2. **MCP Support** - External tool integration for extensibility
3. **Advanced Tools** - Obsidian-specific operations and file management
4. **Enhanced UI** - Rich text input, diff visualization, apply edits

### Phase 4: Polish and Optimization
1. **Performance Optimization** - Lazy loading, caching, resource management
2. **Error Handling** - Comprehensive error recovery and user feedback
3. **Testing** - Unit tests, integration tests, and quality assurance
4. **Documentation** - User guides, API documentation, and examples

## Future Extensibility with Multi-Project Insights

### Near-term Extensions (6-12 months)
1. **Advanced Agent Types** - Specialized agents for research, writing, coding, organization
2. **Multi-Agent Coordination** - Agent delegation and collaborative task execution
3. **Enhanced Security** - Sandboxed execution environment similar to OpenHands
4. **Workflow Automation** - Event-driven scheduled and triggered AI operations
5. **Advanced RAG** - Multi-modal embeddings, knowledge graph integration

### Medium-term Extensions (1-2 years)
1. **Plugin Ecosystem** - Third-party agents, tools, and providers
2. **Multi-vault Support** - Work across multiple Obsidian vaults with unified sessions
3. **Collaborative Features** - Shared sessions, team workspaces, real-time collaboration
4. **Integration Ecosystem** - Connectors for external services, APIs, and databases
5. **Advanced Memory** - Long-term memory systems, context compression, knowledge persistence

### Long-term Vision (2+ years)
1. **AI-Native Knowledge Management** - Fully integrated AI-driven knowledge work
2. **Autonomous Research Assistant** - Self-directed research and analysis capabilities
3. **Cross-Platform Synchronization** - Cloud-based session and knowledge sync
4. **Enterprise Features** - Team management, audit logging, compliance tools
5. **AI Model Training** - Custom model fine-tuning on vault-specific knowledge

1. **Plugin API** - Allow third-party tools and providers
2. **Workflow Automation** - Scheduled and triggered AI operations
3. **Multi-vault Support** - Work across multiple Obsidian vaults
4. **Advanced RAG** - Multi-modal embeddings, knowledge graphs
5. **Collaborative Features** - Shared sessions and team workspaces
6. **Integration Ecosystem** - Connectors for external services and APIs