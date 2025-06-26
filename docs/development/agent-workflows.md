# Agent Workflow Definitions

This document defines specific LangGraph agent workflows for Obsidian-related tasks, providing detailed flow definitions and implementation patterns.

## Workflow Architecture Overview

### Agent Graph Structure

```typescript
interface ObsiusAgentWorkflow {
  id: string;
  name: string;
  description: string;
  graph: StateGraph;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggerPatterns: string[];
  outputSchema: JsonSchema;
}

interface WorkflowNode {
  id: string;
  type: NodeType;
  handler: NodeHandler;
  config: NodeConfig;
  memoryAccess: MemoryAccessType[];
  toolAccess: string[];
}
```

## Core Workflow Categories

### 1. Note Research & Creation Workflows
- **Research Note Creation**: Web research → synthesis → note creation → linking
- **Academic Paper Analysis**: PDF analysis → summary → citation management → integration
- **Topic Exploration**: Multi-source research → comprehensive note → concept mapping

### 2. Note Enhancement Workflows
- **Content Expansion**: Gap analysis → research → content integration → quality check
- **Link Optimization**: Link analysis → suggestion generation → implementation → validation
- **Structure Improvement**: Content analysis → reorganization → formatting → consistency

### 3. Vault Management Workflows
- **Knowledge Graph Analysis**: Vault scanning → relationship mapping → optimization suggestions
- **Content Maintenance**: Outdated content detection → update research → batch updates
- **Organization Optimization**: Structure analysis → reorganization planning → implementation

## Detailed Workflow Definitions

### 1. Research Note Creation Workflow

**Trigger Patterns**:
- "research [topic] and create a note"
- "create comprehensive note about [topic]"
- "investigate [topic] and document findings"

**Graph Definition**:

```typescript
const ResearchNoteCreationGraph = new StateGraph({
  channels: {
    userRequest: { value: null },
    researchTopic: { value: null },
    researchPlan: { value: null },
    sources: { value: [] },
    researchData: { value: [] },
    noteContent: { value: null },
    noteMetadata: { value: null },
    linkedNotes: { value: [] },
    finalNote: { value: null }
  }
});

// Node implementations
ResearchNoteCreationGraph
  .addNode('topic_analyzer', new TopicAnalyzerNode())
  .addNode('research_planner', new ResearchPlannerNode())
  .addNode('web_researcher', new WebResearcherNode())
  .addNode('content_synthesizer', new ContentSynthesizerNode())
  .addNode('note_creator', new NoteCreatorNode())
  .addNode('link_analyzer', new LinkAnalyzerNode())
  .addNode('quality_checker', new QualityCheckerNode())
  .addNode('human_reviewer', new HumanReviewerNode())
  .addNode('finalizer', new FinalizerNode());

// Edge definitions
ResearchNoteCreationGraph
  .addEdge('topic_analyzer', 'research_planner')
  .addEdge('research_planner', 'web_researcher')
  .addEdge('web_researcher', 'content_synthesizer')
  .addEdge('content_synthesizer', 'note_creator')
  .addEdge('note_creator', 'link_analyzer')
  .addEdge('link_analyzer', 'quality_checker')
  .addEdge('quality_checker', 'human_reviewer')
  .addEdge('human_reviewer', 'finalizer');

// Conditional routing
ResearchNoteCreationGraph.addConditionalEdges(
  'quality_checker',
  (state) => {
    const qualityScore = state.qualityScore;
    if (qualityScore >= 0.8) return 'human_reviewer';
    if (qualityScore >= 0.6) return 'content_synthesizer'; // Retry synthesis
    return 'research_planner'; // Retry research
  }
);
```

#### Node Implementations

##### Topic Analyzer Node

```typescript
class TopicAnalyzerNode implements WorkflowNode {
  id = 'topic_analyzer';
  type = NodeType.ANALYZER;

  async handle(state: GraphState): Promise<GraphState> {
    const { userRequest } = state;
    
    const llm = await this.getLLM();
    const analysisPrompt = this.createTopicAnalysisPrompt(userRequest);
    
    const analysis = await llm.invoke(analysisPrompt);
    const parsedAnalysis = this.parseAnalysis(analysis);
    
    return {
      ...state,
      researchTopic: parsedAnalysis.mainTopic,
      subtopics: parsedAnalysis.subtopics,
      complexity: parsedAnalysis.complexity,
      estimatedScope: parsedAnalysis.scope
    };
  }

  private createTopicAnalysisPrompt(request: string): string {
    return `
Analyze the following research request and break it down:

User Request: "${request}"

Provide a structured analysis including:
1. Main topic (single clear focus)
2. Subtopics (2-5 key areas to explore)
3. Complexity level (beginner/intermediate/advanced)
4. Estimated scope (small/medium/large research project)
5. Suggested research approaches
6. Key questions to answer

Format as JSON:
{
  "mainTopic": "...",
  "subtopics": ["...", "..."],
  "complexity": "...",
  "scope": "...",
  "approaches": ["..."],
  "keyQuestions": ["..."]
}
`;
  }
}
```

##### Research Planner Node

```typescript
class ResearchPlannerNode implements WorkflowNode {
  id = 'research_planner';
  type = NodeType.PLANNER;

  async handle(state: GraphState): Promise<GraphState> {
    const { researchTopic, subtopics, complexity } = state;
    
    const llm = await this.getLLM();
    const planningPrompt = this.createPlanningPrompt(researchTopic, subtopics, complexity);
    
    const plan = await llm.invoke(planningPrompt);
    const parsedPlan = this.parsePlan(plan);
    
    return {
      ...state,
      researchPlan: parsedPlan,
      searchQueries: parsedPlan.searchQueries,
      sourceTypes: parsedPlan.sourceTypes,
      estimatedSources: parsedPlan.estimatedSources
    };
  }

  private createPlanningPrompt(topic: string, subtopics: string[], complexity: string): string {
    return `
Create a comprehensive research plan for: "${topic}"

Subtopics to cover: ${subtopics.join(', ')}
Complexity level: ${complexity}

Plan should include:
1. Specific search queries (5-10 targeted searches)
2. Source types to prioritize (academic, news, documentation, etc.)
3. Information gathering strategy
4. Quality criteria for sources
5. Synthesis approach

Consider the current knowledge context and aim for authoritative, recent sources.

Format as JSON:
{
  "searchQueries": ["..."],
  "sourceTypes": ["academic", "news", "documentation"],
  "strategy": "...",
  "qualityCriteria": ["..."],
  "synthesisApproach": "...",
  "estimatedSources": 10
}
`;
  }
}
```

##### Web Researcher Node

```typescript
class WebResearcherNode implements WorkflowNode {
  id = 'web_researcher';
  type = NodeType.TOOL_EXECUTOR;

  async handle(state: GraphState): Promise<GraphState> {
    const { searchQueries, sourceTypes } = state;
    const sources = [];
    const researchData = [];
    
    for (const query of searchQueries) {
      try {
        // Execute web search
        const searchResults = await this.executeWebSearch(query, {
          sourceTypes,
          maxResults: 5
        });
        
        // Fetch and process content
        for (const result of searchResults) {
          const content = await this.fetchContent(result.url);
          if (content && this.validateContent(content)) {
            sources.push(result);
            researchData.push({
              query,
              source: result,
              content: content,
              extractedInfo: await this.extractKeyInfo(content, query)
            });
          }
        }
        
        // Rate limiting
        await this.delay(1000);
      } catch (error) {
        console.warn(`Research failed for query: ${query}`, error);
      }
    }
    
    return {
      ...state,
      sources,
      researchData,
      researchComplete: true
    };
  }

  private async executeWebSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // Use web search tool
    const webSearchTool = this.getWebSearchTool();
    return await webSearchTool.execute({
      query,
      num_results: options.maxResults,
      source_types: options.sourceTypes
    });
  }

  private async extractKeyInfo(content: string, query: string): Promise<ExtractedInfo> {
    const llm = await this.getLLM();
    const extractionPrompt = `
Extract key information relevant to the research query from this content:

Query: "${query}"
Content: "${content.substring(0, 3000)}..."

Extract:
1. Main claims or findings
2. Key statistics or data points
3. Important quotes or statements
4. Relevant examples or case studies
5. Source credibility indicators

Format as JSON:
{
  "mainClaims": ["..."],
  "keyData": ["..."],
  "importantQuotes": ["..."],
  "examples": ["..."],
  "credibilityIndicators": ["..."]
}
`;
    
    const extraction = await llm.invoke(extractionPrompt);
    return this.parseExtraction(extraction);
  }
}
```

##### Content Synthesizer Node

```typescript
class ContentSynthesizerNode implements WorkflowNode {
  id = 'content_synthesizer';
  type = NodeType.SYNTHESIZER;

  async handle(state: GraphState): Promise<GraphState> {
    const { researchTopic, researchData, subtopics } = state;
    
    const llm = await this.getLLM();
    const synthesisPrompt = this.createSynthesisPrompt(researchTopic, researchData, subtopics);
    
    const synthesizedContent = await llm.invoke(synthesisPrompt);
    const parsedContent = this.parseContent(synthesizedContent);
    
    return {
      ...state,
      noteContent: parsedContent.content,
      noteStructure: parsedContent.structure,
      citations: parsedContent.citations,
      confidence: parsedContent.confidence
    };
  }

  private createSynthesisPrompt(topic: string, researchData: any[], subtopics: string[]): string {
    const researchSummary = researchData.map(item => ({
      source: item.source.title,
      url: item.source.url,
      keyInfo: item.extractedInfo.mainClaims
    }));

    return `
Synthesize comprehensive note content about: "${topic}"

Research Data:
${JSON.stringify(researchSummary, null, 2)}

Subtopics to cover: ${subtopics.join(', ')}

Create a well-structured, comprehensive note that:
1. Provides a clear introduction to the topic
2. Covers all relevant subtopics systematically
3. Integrates information from multiple sources
4. Maintains objectivity and accuracy
5. Includes proper citations
6. Ends with key takeaways or conclusions

Structure the content with clear headings and subheadings.
Use markdown formatting.
Include inline citations as [Source Name](URL).

Output format:
{
  "content": "# Topic Title\\n\\nContent here...",
  "structure": {
    "sections": ["Introduction", "Section1", "Section2", "Conclusions"],
    "wordCount": 1500
  },
  "citations": [
    {"source": "Source Name", "url": "URL", "used_for": "Specific claim"}
  ],
  "confidence": 0.85
}
`;
  }
}
```

### 2. Note Enhancement Workflow

**Trigger Patterns**:
- "enhance this note with recent research"
- "improve the content quality of [note]"
- "update [note] with current information"

**Graph Definition**:

```typescript
const NoteEnhancementGraph = new StateGraph({
  channels: {
    targetNote: { value: null },
    currentContent: { value: null },
    analysisResult: { value: null },
    enhancementPlan: { value: null },
    newResearch: { value: null },
    enhancedContent: { value: null },
    qualityMetrics: { value: null }
  }
});

NoteEnhancementGraph
  .addNode('note_analyzer', new NoteAnalyzerNode())
  .addNode('gap_identifier', new GapIdentifierNode())
  .addNode('enhancement_planner', new EnhancementPlannerNode())
  .addNode('content_researcher', new ContentResearcherNode())
  .addNode('content_integrator', new ContentIntegratorNode())
  .addNode('quality_assessor', new QualityAssessorNode())
  .addNode('human_approver', new HumanApproverNode())
  .addNode('content_updater', new ContentUpdaterNode());
```

#### Note Analyzer Node

```typescript
class NoteAnalyzerNode implements WorkflowNode {
  id = 'note_analyzer';
  type = NodeType.ANALYZER;

  async handle(state: GraphState): Promise<GraphState> {
    const { targetNote } = state;
    
    // Read current note content
    const content = await this.readNote(targetNote);
    
    // Analyze content structure and quality
    const analysis = await this.analyzeContent(content);
    
    return {
      ...state,
      currentContent: content,
      analysisResult: analysis,
      contentStructure: analysis.structure,
      qualityScore: analysis.qualityScore,
      lastUpdated: analysis.lastUpdated
    };
  }

  private async analyzeContent(content: string): Promise<ContentAnalysis> {
    const llm = await this.getLLM();
    const analysisPrompt = `
Analyze this note content for enhancement opportunities:

Content:
${content}

Analyze for:
1. Content structure and organization
2. Information gaps or missing details
3. Outdated information indicators
4. Quality of writing and clarity
5. Citation and source needs
6. Link opportunities to other notes

Provide scores (0-1) for:
- Completeness
- Currency (how up-to-date)
- Clarity
- Structure
- Citation quality

Format as JSON:
{
  "structure": {
    "sections": ["..."],
    "organization": "good/fair/poor",
    "flow": "good/fair/poor"
  },
  "gaps": ["Missing recent developments", "Lacks examples"],
  "outdatedIndicators": ["References from 2020", "Deprecated terminology"],
  "qualityScore": {
    "completeness": 0.7,
    "currency": 0.4,
    "clarity": 0.8,
    "structure": 0.9,
    "citations": 0.3,
    "overall": 0.64
  },
  "recommendations": ["Update with 2024 research", "Add more examples"]
}
`;
    
    const analysis = await llm.invoke(analysisPrompt);
    return this.parseAnalysis(analysis);
  }
}
```

### 3. Knowledge Graph Analysis Workflow

**Trigger Patterns**:
- "analyze my knowledge graph"
- "find connections between notes"
- "optimize my vault structure"

**Graph Definition**:

```typescript
const KnowledgeGraphAnalysisGraph = new StateGraph({
  channels: {
    vaultStructure: { value: null },
    linkGraph: { value: null },
    clusterAnalysis: { value: null },
    optimizations: { value: null },
    recommendations: { value: null }
  }
});

KnowledgeGraphAnalysisGraph
  .addNode('vault_scanner', new VaultScannerNode())
  .addNode('graph_builder', new GraphBuilderNode())
  .addNode('cluster_analyzer', new ClusterAnalyzerNode())
  .addNode('optimization_finder', new OptimizationFinderNode())
  .addNode('recommendation_generator', new RecommendationGeneratorNode())
  .addNode('visualization_creator', new VisualizationCreatorNode());
```

## Workflow Execution Patterns

### Sequential Execution

```typescript
class SequentialWorkflowExecutor {
  async execute(workflow: ObsiusAgentWorkflow, initialState: GraphState): Promise<WorkflowResult> {
    const graph = workflow.graph;
    let currentState = initialState;
    
    try {
      const result = await graph.invoke(currentState);
      return {
        success: true,
        finalState: result,
        executionPath: result._executionPath,
        duration: result._duration
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        partialState: currentState
      };
    }
  }
}
```

### Parallel Execution

```typescript
class ParallelWorkflowExecutor {
  async executeParallel(
    workflows: ObsiusAgentWorkflow[], 
    initialState: GraphState
  ): Promise<ParallelWorkflowResult> {
    const results = await Promise.allSettled(
      workflows.map(workflow => this.execute(workflow, initialState))
    );
    
    const successful = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => (result as PromiseFulfilledResult<WorkflowResult>).value);
    
    const failed = results
      .filter(result => result.status === 'rejected' || !result.value.success);
    
    return {
      successful,
      failed,
      totalExecuted: workflows.length,
      successRate: successful.length / workflows.length
    };
  }
}
```

### Conditional Workflow Routing

```typescript
class WorkflowRouter {
  async routeWorkflow(userRequest: string, context: ObsidianContext): Promise<ObsiusAgentWorkflow> {
    const llm = await this.getLLM();
    const routingPrompt = this.createRoutingPrompt(userRequest, context);
    
    const decision = await llm.invoke(routingPrompt);
    const workflowId = this.parseRoutingDecision(decision);
    
    return this.getWorkflow(workflowId);
  }

  private createRoutingPrompt(request: string, context: ObsidianContext): string {
    return `
Analyze this user request and determine the most appropriate workflow:

User Request: "${request}"

Context:
- Current Note: ${context.currentNote?.title || 'None'}
- Vault Size: ${context.vault.totalNotes} notes
- Recent Activity: ${context.recentActivity.join(', ')}

Available Workflows:
1. research_note_creation - For creating new notes with research
2. note_enhancement - For improving existing notes
3. knowledge_graph_analysis - For analyzing vault structure
4. content_maintenance - For updating outdated content
5. link_optimization - For improving note connections

Choose the most appropriate workflow ID based on the request intent.

Response format: {"workflowId": "workflow_name", "confidence": 0.95, "reasoning": "..."}
`;
  }
}
```

## Error Handling and Recovery

### Workflow Error Recovery

```typescript
class WorkflowErrorRecovery {
  async handleNodeError(
    error: Error,
    node: WorkflowNode,
    state: GraphState,
    workflow: ObsiusAgentWorkflow
  ): Promise<RecoveryAction> {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'LLM_RATE_LIMIT':
        return this.handleRateLimit(node, state);
      case 'NETWORK_ERROR':
        return this.handleNetworkError(node, state);
      case 'CONTENT_QUALITY_ERROR':
        return this.handleQualityError(node, state);
      case 'USER_CANCELLATION':
        return this.handleCancellation(node, state);
      default:
        return this.handleGenericError(error, node, state);
    }
  }

  private async handleRateLimit(node: WorkflowNode, state: GraphState): Promise<RecoveryAction> {
    // Switch to alternative provider or wait
    const alternativeProvider = await this.getAlternativeProvider();
    if (alternativeProvider) {
      return {
        action: 'retry_with_alternative',
        provider: alternativeProvider,
        delay: 0
      };
    }
    
    return {
      action: 'retry_with_delay',
      delay: 60000, // 1 minute
      maxRetries: 3
    };
  }
}
```

## Workflow Monitoring and Analytics

### Execution Metrics

```typescript
interface WorkflowMetrics {
  workflowId: string;
  executionTime: number;
  nodeExecutionTimes: Record<string, number>;
  successRate: number;
  errorRate: number;
  userSatisfactionScore?: number;
  resourceUsage: {
    llmTokens: number;
    webRequests: number;
    memoryUsage: number;
  };
}

class WorkflowMonitor {
  private metrics: Map<string, WorkflowMetrics[]> = new Map();

  recordExecution(workflowId: string, metrics: WorkflowMetrics): void {
    if (!this.metrics.has(workflowId)) {
      this.metrics.set(workflowId, []);
    }
    this.metrics.get(workflowId)!.push(metrics);
  }

  getAverageExecutionTime(workflowId: string): number {
    const workflowMetrics = this.metrics.get(workflowId) || [];
    if (workflowMetrics.length === 0) return 0;
    
    const totalTime = workflowMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return totalTime / workflowMetrics.length;
  }

  getSuccessRate(workflowId: string): number {
    const workflowMetrics = this.metrics.get(workflowId) || [];
    if (workflowMetrics.length === 0) return 0;
    
    const successfulExecutions = workflowMetrics.filter(m => m.successRate > 0.8).length;
    return successfulExecutions / workflowMetrics.length;
  }
}
```

## Custom Workflow Creation

### Workflow Builder API

```typescript
class WorkflowBuilder {
  private workflow: Partial<ObsiusAgentWorkflow> = {};

  create(id: string, name: string, description: string): WorkflowBuilder {
    this.workflow = { id, name, description, nodes: [], edges: [] };
    return this;
  }

  addNode(nodeDefinition: WorkflowNodeDefinition): WorkflowBuilder {
    this.workflow.nodes!.push(this.createNode(nodeDefinition));
    return this;
  }

  addEdge(from: string, to: string, condition?: EdgeCondition): WorkflowBuilder {
    this.workflow.edges!.push({ from, to, condition });
    return this;
  }

  addTriggerPattern(pattern: string): WorkflowBuilder {
    if (!this.workflow.triggerPatterns) {
      this.workflow.triggerPatterns = [];
    }
    this.workflow.triggerPatterns.push(pattern);
    return this;
  }

  build(): ObsiusAgentWorkflow {
    this.validateWorkflow();
    return this.workflow as ObsiusAgentWorkflow;
  }

  private validateWorkflow(): void {
    // Validate that all nodes have valid connections
    // Check for cycles, unreachable nodes, etc.
  }
}

// Usage example
const customWorkflow = new WorkflowBuilder()
  .create('custom_research', 'Custom Research Workflow', 'User-defined research workflow')
  .addNode({
    id: 'start',
    type: NodeType.INPUT_PROCESSOR,
    handler: CustomInputProcessorNode
  })
  .addNode({
    id: 'research',
    type: NodeType.RESEARCHER,
    handler: WebResearcherNode
  })
  .addEdge('start', 'research')
  .addTriggerPattern('custom research for *')
  .build();
```

This comprehensive workflow system provides the foundation for sophisticated AI agent behaviors while maintaining flexibility and extensibility for future enhancements.