# LangChain/LangGraph Architecture Specification

This document defines the architecture for integrating LangChain and LangGraph into the Obsius plugin to create sophisticated AI agents for Obsidian-specific workflows.

## Overview

### Why LangChain/LangGraph?

- **Multi-Provider Support**: Unified interface for OpenAI, Gemini, and Claude
- **Agent Capabilities**: Complex task decomposition and autonomous execution
- **Tool Integration**: Seamless integration with Obsidian-specific tools
- **Memory Management**: Persistent context and conversation history
- **Workflow Orchestration**: Graph-based task execution with LangGraph

### Architecture Goals

1. **Modularity**: Clean separation between LangChain agents and Obsidian integration
2. **Extensibility**: Easy addition of new providers and tools
3. **Performance**: Optimized for browser environment
4. **Reliability**: Robust error handling and graceful degradation
5. **User Experience**: Transparent agent operations with user control

## System Architecture

### High-Level Component Structure

```
┌─ Obsidian Plugin Host ────────────────────────────────────────┐
│                                                               │
│  ┌─ Obsius Plugin ───────────────────────────────────────┐    │
│  │                                                       │    │
│  │  ┌─ UI Layer ───────────────────────────────────┐     │    │
│  │  │ • React Components                           │     │    │
│  │  │ • Agent Status Display                       │     │    │
│  │  │ • Task Progress Visualization                │     │    │
│  │  │ • User Confirmation Dialogs                  │     │    │
│  │  └───────────────────────────────────────────────     │    │
│  │                                                       │    │
│  │  ┌─ Agent Orchestrator ─────────────────────────┐     │    │
│  │  │ • Session Management                         │     │    │
│  │  │ • Task Queue Management                      │     │    │
│  │  │ • User Confirmation Handler                  │     │    │
│  │  │ • Progress Tracking                          │     │    │
│  │  └───────────────────────────────────────────────     │    │
│  │                                                       │    │
│  │  ┌─ LangGraph Agent System ──────────────────────┐     │    │
│  │  │ • Graph Definition & Execution               │     │    │
│  │  │ • Node Implementations                       │     │    │
│  │  │ • State Management                           │     │    │
│  │  │ • Flow Control                               │     │    │
│  │  └───────────────────────────────────────────────     │    │
│  │                                                       │    │
│  │  ┌─ LangChain Core ───────────────────────────────┐     │    │
│  │  │ • LLM Providers (OpenAI, Gemini, Claude)     │     │    │
│  │  │ • Tool Definitions                           │     │    │
│  │  │ • Memory Systems                             │     │    │
│  │  │ • Prompt Templates                           │     │    │
│  │  └───────────────────────────────────────────────     │    │
│  │                                                       │    │
│  │  ┌─ Obsidian Tools ───────────────────────────────┐     │    │
│  │  │ • Note Operations                            │     │    │
│  │  │ • Link Management                            │     │    │
│  │  │ • Vault Operations                           │     │    │
│  │  │ • Search & Analysis                          │     │    │
│  │  └───────────────────────────────────────────────     │    │
│  │                                                       │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## LangGraph Agent System

### Graph-Based Workflow Architecture

```typescript
interface ObsiusAgentGraph {
  nodes: Map<string, AgentNode>;
  edges: Map<string, AgentEdge[]>;
  startNode: string;
  endNodes: string[];
  state: GraphState;
}

interface AgentNode {
  id: string;
  type: NodeType;
  handler: NodeHandler;
  config: NodeConfig;
}

enum NodeType {
  PLANNER = 'planner',
  TOOL_EXECUTOR = 'tool_executor', 
  HUMAN_APPROVAL = 'human_approval',
  RESEARCHER = 'researcher',
  NOTE_CREATOR = 'note_creator',
  LINK_ANALYZER = 'link_analyzer',
  CONTENT_ENHANCER = 'content_enhancer',
  SUMMARIZER = 'summarizer'
}
```

### Core Agent Workflows

#### 1. Research and Note Creation Workflow

```
┌─ Start ────┐
│            │
▼            │
┌─ Plan Research ─┐
│ • Analyze topic │
│ • Plan sources  │
│ • Set scope     │
└─────────────────┘
         │
         ▼
┌─ Web Research ──┐
│ • Search web    │
│ • Fetch content │
│ • Validate info │
└─────────────────┘
         │
         ▼
┌─ Human Approval ┐
│ • Show sources  │
│ • Confirm usage │
│ • Allow edits   │
└─────────────────┘
         │
         ▼
┌─ Create Note ───┐
│ • Generate text │
│ • Apply template│
│ • Add metadata  │
└─────────────────┘
         │
         ▼
┌─ Link Creation ─┐
│ • Find related  │
│ • Create links  │
│ • Update graph  │
└─────────────────┘
         │
         ▼
┌─ End ───────────┘
```

#### 2. Note Enhancement Workflow

```
┌─ Start ────┐
│            │
▼            │
┌─ Analyze Note ──┐
│ • Read content  │
│ • Check quality │
│ • Find gaps     │
└─────────────────┘
         │
         ▼
┌─ Plan Enhancement ┐
│ • Identify needs  │
│ • Prioritize      │
│ • Set strategy    │
└───────────────────┘
         │
         ▼
┌─ Research Updates ┐
│ • Find new info   │
│ • Verify facts    │
│ • Gather examples │
└───────────────────┘
         │
         ▼
┌─ Human Approval ──┐
│ • Show changes    │
│ • Confirm updates │
│ • Allow rollback  │
└───────────────────┘
         │
         ▼
┌─ Apply Changes ───┐
│ • Update content  │
│ • Preserve style  │
│ • Maintain links  │
└───────────────────┘
         │
         ▼
┌─ End ─────────────┘
```

### Agent Node Implementations

#### Planning Node

```typescript
class PlanningNode implements AgentNode {
  id = 'planner';
  type = NodeType.PLANNER;

  async handle(state: GraphState): Promise<GraphState> {
    const { userRequest, context } = state;
    
    // Use LLM to analyze request and create plan
    const llm = await this.getLLM();
    const planningPrompt = this.createPlanningPrompt(userRequest, context);
    
    const plan = await llm.invoke(planningPrompt);
    
    return {
      ...state,
      plan: this.parsePlan(plan),
      nextNode: this.determineNextNode(plan)
    };
  }

  private createPlanningPrompt(request: string, context: ObsidianContext): string {
    return `
You are an AI assistant helping with Obsidian note management.

User Request: ${request}

Current Context:
- Active Note: ${context.activeNote?.title || 'None'}
- Vault Size: ${context.vault.noteCount} notes
- Recent Activity: ${context.recentActivity?.join(', ') || 'None'}

Available Tools:
- create_note: Create new notes with content
- read_note: Read existing note content
- update_note: Modify note content
- create_link: Create links between notes
- search_notes: Search vault content
- web_search: Search web for information
- web_fetch: Fetch content from URLs

Create a detailed plan to fulfill the user's request. Break it down into specific steps using the available tools.

Plan:
`;
  }
}
```

#### Tool Execution Node

```typescript
class ToolExecutorNode implements AgentNode {
  id = 'tool_executor';
  type = NodeType.TOOL_EXECUTOR;

  async handle(state: GraphState): Promise<GraphState> {
    const { currentStep, tools } = state;
    
    if (!currentStep) {
      return { ...state, error: 'No current step to execute' };
    }

    try {
      // Check if tool requires human approval
      if (this.requiresApproval(currentStep.tool)) {
        return {
          ...state,
          nextNode: 'human_approval',
          pendingStep: currentStep
        };
      }

      // Execute tool directly
      const result = await this.executeTool(currentStep, tools);
      
      return {
        ...state,
        stepResults: [...(state.stepResults || []), result],
        currentStepIndex: (state.currentStepIndex || 0) + 1,
        nextNode: this.getNextNode(state)
      };
    } catch (error) {
      return {
        ...state,
        error: error.message,
        nextNode: 'error_handler'
      };
    }
  }

  private async executeTool(
    step: PlanStep, 
    tools: ObsidianToolRegistry
  ): Promise<ToolResult> {
    const tool = tools.getTool(step.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }

    return await tool.execute(step.parameters);
  }
}
```

#### Human Approval Node

```typescript
class HumanApprovalNode implements AgentNode {
  id = 'human_approval';
  type = NodeType.HUMAN_APPROVAL;

  async handle(state: GraphState): Promise<GraphState> {
    const { pendingStep } = state;
    
    // Show approval UI to user
    const approval = await this.requestUserApproval(pendingStep);
    
    if (approval.approved) {
      // Execute the approved step
      const result = await this.executeTool(
        approval.modifiedStep || pendingStep, 
        state.tools
      );
      
      return {
        ...state,
        stepResults: [...(state.stepResults || []), result],
        currentStepIndex: (state.currentStepIndex || 0) + 1,
        nextNode: this.getNextNode(state),
        pendingStep: undefined
      };
    } else {
      return {
        ...state,
        cancelled: true,
        nextNode: 'end'
      };
    }
  }

  private async requestUserApproval(step: PlanStep): Promise<ApprovalResult> {
    return new Promise((resolve) => {
      // Show modal dialog with step details
      const modal = new ApprovalModal(
        step,
        (result) => resolve(result)
      );
      modal.open();
    });
  }
}
```

## LangChain Provider Integration

### Multi-Provider Architecture

```typescript
interface LLMProvider {
  name: string;
  create(config: ProviderConfig): BaseLLM;
  isAvailable(): Promise<boolean>;
  getModels(): string[];
}

class OpenAIProvider implements LLMProvider {
  name = 'openai';

  create(config: OpenAIConfig): ChatOpenAI {
    return new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      streaming: config.streaming ?? true
    });
  }

  async isAvailable(): Promise<boolean> {
    // Check API key validity
    try {
      const testLLM = this.create({ apiKey: 'test' });
      await testLLM.invoke('test', { maxTokens: 1 });
      return true;
    } catch {
      return false;
    }
  }

  getModels(): string[] {
    return [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-4o'
    ];
  }
}

class ClaudeProvider implements LLMProvider {
  name = 'claude';

  create(config: ClaudeConfig): ChatAnthropic {
    return new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      modelName: config.model || 'claude-3-sonnet-20240229',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      streaming: config.streaming ?? true
    });
  }

  getModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }
}

class GeminiProvider implements LLMProvider {
  name = 'gemini';

  create(config: GeminiConfig): ChatGoogleGenerativeAI {
    return new ChatGoogleGenerativeAI({
      apiKey: config.apiKey,
      modelName: config.model || 'gemini-pro',
      temperature: config.temperature || 0.7,
      maxOutputTokens: config.maxTokens || 4096,
      streaming: config.streaming ?? true
    });
  }

  getModels(): string[] {
    return [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
  }
}
```

### Provider Manager

```typescript
class LLMProviderManager {
  private providers = new Map<string, LLMProvider>();
  private currentProvider: string;

  constructor() {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new ClaudeProvider());
    this.registerProvider(new GeminiProvider());
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  async createLLM(
    providerName?: string, 
    config?: ProviderConfig
  ): Promise<BaseLLM> {
    const provider = this.providers.get(
      providerName || this.currentProvider
    );
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      throw new Error(`Provider not available: ${providerName}`);
    }

    return provider.create(config);
  }

  setDefaultProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider not registered: ${providerName}`);
    }
    this.currentProvider = providerName;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

## Memory Management

### LangChain Memory Integration

```typescript
interface ObsiusMemory {
  conversationHistory: ConversationBufferMemory;
  vectorMemory: VectorStoreMemory;
  entityMemory: EntityMemory;
  obsidianContext: ObsidianContextMemory;
}

class ObsidianContextMemory extends BaseMemory {
  constructor(private app: App) {
    super();
  }

  async loadMemoryVariables(): Promise<Record<string, any>> {
    const activeFile = this.app.workspace.getActiveFile();
    const vault = this.app.vault;
    
    return {
      currentNote: activeFile ? {
        title: activeFile.basename,
        path: activeFile.path,
        content: await vault.read(activeFile),
        links: this.getFileLinks(activeFile),
        backlinks: this.getBacklinks(activeFile)
      } : null,
      
      vaultStats: {
        totalNotes: vault.getMarkdownFiles().length,
        totalAttachments: vault.getFiles().length - vault.getMarkdownFiles().length,
        recentFiles: this.getRecentFiles(10)
      },
      
      workspace: {
        openFiles: this.getOpenFiles(),
        layout: this.app.workspace.getLayout()
      }
    };
  }

  async saveContext(): Promise<void> {
    // Save context to memory store
    // This could be used for learning user patterns
  }
}

class VectorMemoryManager {
  private vectorStore: VectorStore;

  constructor() {
    // Initialize with local vector store (could use WebAssembly embeddings)
    this.vectorStore = new MemoryVectorStore();
  }

  async addDocument(doc: Document): Promise<void> {
    await this.vectorStore.addDocuments([doc]);
  }

  async similaritySearch(
    query: string, 
    k: number = 5
  ): Promise<Document[]> {
    return await this.vectorStore.similaritySearch(query, k);
  }

  async addNoteToMemory(note: TFile, content: string): Promise<void> {
    const doc = new Document({
      pageContent: content,
      metadata: {
        title: note.basename,
        path: note.path,
        created: note.stat.ctime,
        modified: note.stat.mtime
      }
    });
    
    await this.addDocument(doc);
  }
}
```

## Tool Integration

### LangChain Tool Wrappers

```typescript
class ObsidianToolWrapper extends Tool {
  constructor(
    private obsidianTool: ObsidianTool,
    private app: App
  ) {
    super();
    this.name = obsidianTool.name;
    this.description = obsidianTool.description;
  }

  async _call(arg: string): Promise<string> {
    try {
      const params = JSON.parse(arg);
      const result = await this.obsidianTool.execute(params);
      
      return JSON.stringify({
        success: result.success,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  }
}

class LangChainToolRegistry {
  private tools: Tool[] = [];

  registerObsidianTool(obsidianTool: ObsidianTool, app: App): void {
    const wrapper = new ObsidianToolWrapper(obsidianTool, app);
    this.tools.push(wrapper);
  }

  registerWebTools(): void {
    // Add web search and fetch tools
    this.tools.push(new SerpAPIWrapper());
    this.tools.push(new WebBrowser());
  }

  getTools(): Tool[] {
    return this.tools;
  }
}
```

## Agent Execution Engine

### Graph Executor

```typescript
class ObsiusGraphExecutor {
  private graph: StateGraph;
  private memory: ObsiusMemory;
  private tools: LangChainToolRegistry;
  private llmManager: LLMProviderManager;

  constructor(
    memory: ObsiusMemory,
    tools: LangChainToolRegistry,
    llmManager: LLMProviderManager
  ) {
    this.memory = memory;
    this.tools = tools;
    this.llmManager = llmManager;
    this.buildGraph();
  }

  private buildGraph(): void {
    this.graph = new StateGraph({
      channels: {
        userRequest: { value: null },
        plan: { value: null },
        currentStep: { value: null },
        stepResults: { value: [] },
        context: { value: null },
        error: { value: null }
      }
    });

    // Add nodes
    this.graph.addNode('planner', new PlanningNode());
    this.graph.addNode('tool_executor', new ToolExecutorNode());
    this.graph.addNode('human_approval', new HumanApprovalNode());
    this.graph.addNode('researcher', new ResearchNode());
    this.graph.addNode('note_creator', new NoteCreatorNode());

    // Add edges
    this.graph.addEdge('planner', 'tool_executor');
    this.graph.addEdge('tool_executor', 'human_approval');
    this.graph.addEdge('human_approval', 'tool_executor');
    
    // Set entry point
    this.graph.setEntryPoint('planner');
  }

  async execute(userRequest: string): Promise<ExecutionResult> {
    const initialState = {
      userRequest,
      context: await this.memory.obsidianContext.loadMemoryVariables(),
      tools: this.tools.getTools()
    };

    try {
      const result = await this.graph.invoke(initialState);
      return {
        success: true,
        result: result.stepResults,
        finalState: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## Performance Optimizations

### Browser Environment Considerations

```typescript
// Lazy loading for LangChain components
class LazyLangChainLoader {
  private static cache = new Map<string, Promise<any>>();

  static async loadLLM(provider: string): Promise<any> {
    if (!this.cache.has(provider)) {
      const promise = this.loadProvider(provider);
      this.cache.set(provider, promise);
    }
    return await this.cache.get(provider);
  }

  private static async loadProvider(provider: string): Promise<any> {
    switch (provider) {
      case 'openai':
        return (await import('@langchain/openai')).ChatOpenAI;
      case 'anthropic':
        return (await import('@langchain/anthropic')).ChatAnthropic;
      case 'google-genai':
        return (await import('@langchain/google-genai')).ChatGoogleGenerativeAI;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

// Streaming response handler
class StreamingResponseHandler {
  private onChunk: (chunk: string) => void;
  private onComplete: (response: string) => void;

  constructor(
    onChunk: (chunk: string) => void,
    onComplete: (response: string) => void
  ) {
    this.onChunk = onChunk;
    this.onComplete = onComplete;
  }

  async handleStream(llm: BaseLLM, input: string): Promise<void> {
    let fullResponse = '';
    
    const stream = await llm.stream(input);
    
    for await (const chunk of stream) {
      const content = chunk.content.toString();
      fullResponse += content;
      this.onChunk(content);
    }
    
    this.onComplete(fullResponse);
  }
}
```

## Error Handling and Resilience

### Agent Error Recovery

```typescript
class AgentErrorHandler {
  async handleNodeError(
    error: Error, 
    state: GraphState, 
    node: AgentNode
  ): Promise<GraphState> {
    switch (error.type) {
      case 'LLM_ERROR':
        return this.handleLLMError(error, state);
      case 'TOOL_ERROR':
        return this.handleToolError(error, state);
      case 'NETWORK_ERROR':
        return this.handleNetworkError(error, state);
      default:
        return this.handleGenericError(error, state);
    }
  }

  private async handleLLMError(
    error: Error, 
    state: GraphState
  ): Promise<GraphState> {
    // Try different provider or retry with backoff
    const alternativeProvider = this.getAlternativeProvider(state.provider);
    
    if (alternativeProvider) {
      return {
        ...state,
        provider: alternativeProvider,
        retryCount: (state.retryCount || 0) + 1,
        nextNode: state.currentNode // Retry same node
      };
    }
    
    return {
      ...state,
      error: 'All LLM providers failed',
      nextNode: 'error_recovery'
    };
  }
}
```

This LangChain/LangGraph architecture provides a sophisticated foundation for building AI agents that can handle complex Obsidian workflows while maintaining user control and providing robust error handling.