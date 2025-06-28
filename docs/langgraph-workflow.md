# LangGraph-Style Workflow System

## Overview

Obsius implements a state-driven workflow system inspired by LangGraph. This system processes complex tasks step by step, making appropriate decisions at each stage while aiming for completion within a maximum of 24 iterations.

## Overall Workflow Diagram

```mermaid
graph TB
    Start([User Input]) --> Assess{Task Complexity<br/>Assessment}
    
    Assess -->|Simple| SimplePath[Simple Task Execution]
    Assess -->|Complex| ComplexPath[StateGraph Workflow]
    
    SimplePath --> DirectAI[Direct AI Response]
    DirectAI --> ExecuteTools[Tool Execution]
    ExecuteTools --> Complete1([Complete])
    
    ComplexPath --> Initialize[Initialization Phase]
    Initialize --> Analyze[Analysis Node]
    
    Analyze --> AnalyzeDecision{Next Step}
    AnalyzeDecision -->|Search Needed| Search[Search Node]
    AnalyzeDecision -->|No Search Needed| Execute[Execution Node]
    
    Search --> Execute
    Execute --> CheckComplete{Completion Check}
    
    CheckComplete -->|Incomplete| NextIteration{Iteration<br/>Check}
    CheckComplete -->|Complete| Complete2([Complete])
    
    NextIteration -->|Can Continue| Analyze
    NextIteration -->|Limit Reached| Complete2
    
    style Start fill:#e1f5fe
    style Complete1 fill:#c8e6c9
    style Complete2 fill:#c8e6c9
    style SimplePath fill:#fff3e0
    style ComplexPath fill:#f3e5f5
```

## State Management System

```mermaid
graph LR
    subgraph WorkflowState
        SessionInfo[Session Information]
        TaskPlan[Task Plan]
        WorkingMemory[Working Memory]
        ExecutedActions[Executed Actions]
        Metrics[Execution Metrics]
    end
    
    subgraph StateManager
        NextIteration[Iteration Management]
        PhaseTransition[Phase Transition]
        MemoryManagement[Memory Management]
        Checkpoint[Checkpointing]
    end
    
    WorkflowState <--> StateManager
    StateManager --> Persistence[Persistence System]
```

## Phase Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> Initialize: Workflow Start
    
    Initialize --> Analyze: Initialization Complete
    
    Analyze --> Search: Search Required
    Analyze --> Execute: Direct Execution Possible
    Analyze --> Complete: Simple Task Complete
    
    Search --> Execute: Information Gathering Complete
    
    Execute --> Reflect: Execution Complete, Evaluation Needed
    Execute --> Analyze: Additional Analysis Needed
    Execute --> Complete: Task Complete
    
    Reflect --> Analyze: Re-analysis Needed
    Reflect --> Complete: Completion Confirmed
    
    Complete --> [*]: Workflow End
    
    Error --> [*]: Error Termination
    
    note right of Initialize: State Initialization\nLoad Configuration
    note right of Analyze: Task Decomposition\nComplexity Evaluation
    note right of Search: Information Gathering\nContext Building
    note right of Execute: Tool Execution\nAction Performance
    note right of Reflect: Result Evaluation\nNext Step Decision
```

## Node Architecture

```mermaid
classDiagram
    class BaseNode {
        <<abstract>>
        #config: NodeConfig
        #status: NodeStatus
        +execute(context): NodeExecutionResult
        #executeInternal(context)*
        #checkTaskCompletion(context): boolean
    }
    
    class AnalyzeNode {
        -analyzeRequest(request): AnalysisResult
        -createTaskPlan(request): TaskPlan
        -decomposeTask(request): string[]
        -determineNextNodes(): string[]
    }
    
    class SearchNode {
        -planSearchStrategies(): SearchStrategy[]
        -executeSearches(): SearchResults
        -analyzeSearchResults(): ContextualInfo
        -updateStateWithFindings(): void
    }
    
    class ExecuteNode {
        -planExecution(): ExecutionPlan
        -executeActions(): ExecutionResults
        -evaluateExecution(): ExecutionEvaluation
        -determineNextNodes(): string[]
    }
    
    BaseNode <|-- AnalyzeNode
    BaseNode <|-- SearchNode
    BaseNode <|-- ExecuteNode
    
    class NodeExecutionResult {
        +success: boolean
        +message: string
        +data?: any
        +nextNodes?: string[]
        +shouldContinue: boolean
    }
    
    BaseNode ..> NodeExecutionResult
```

## Task Complexity Assessment Flow

```mermaid
flowchart TD
    Input[User Input] --> CheckLength{Check Word Count}
    
    CheckLength -->|20+ words| Complex[Complex Task]
    CheckLength -->|<20 words| CheckIndicators
    
    CheckIndicators{Check Complexity<br/>Indicators}
    CheckIndicators -->|Present| Complex
    CheckIndicators -->|Absent| CheckMultiple
    
    CheckMultiple{Check Multiple<br/>Actions}
    CheckMultiple -->|Present| Complex
    CheckMultiple -->|Absent| Simple[Simple Task]
    
    Simple --> DirectExecution[Direct Execution Path]
    Complex --> WorkflowExecution[Workflow Execution Path]
    
    subgraph Complexity Indicators
        Indicators[organize, analyze, research,<br/>comprehensive, detailed,<br/>multiple, all, every]
    end
```

## Memory Management System

```mermaid
graph TD
    subgraph WorkingMemory
        Entry1[Thought Entry]
        Entry2[Action Entry]
        Entry3[Observation Entry]
        Entry4[Plan Entry]
        Entry5[Reflection Entry]
    end
    
    Entry1 -->|Importance: 0.8| ImportanceSort[Importance Sort]
    Entry2 -->|Importance: 0.7| ImportanceSort
    Entry3 -->|Importance: 0.9| ImportanceSort
    Entry4 -->|Importance: 0.8| ImportanceSort
    Entry5 -->|Importance: 0.9| ImportanceSort
    
    ImportanceSort --> LimitCheck{Entry Count<br/>Check}
    LimitCheck -->|≤50| Keep[Keep]
    LimitCheck -->|>50| Prune[Remove Old/Low Importance]
```

## Persistence and Recovery

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant WorkflowState
    participant Persistence
    participant Storage
    
    User->>Orchestrator: Task Execution Request
    Orchestrator->>WorkflowState: Create/Restore State
    
    alt Check Existing Workflow
        Orchestrator->>Persistence: Search Incomplete Workflows
        Persistence->>Storage: Search by Session
        Storage-->>Persistence: Incomplete Workflows
        Persistence-->>Orchestrator: Workflow State
        Orchestrator->>WorkflowState: Restore State
    else New Workflow
        Orchestrator->>WorkflowState: Create New State
    end
    
    loop Execution Loop
        Orchestrator->>WorkflowState: Update State
        
        alt Checkpoint
            Orchestrator->>Persistence: Save State
            Persistence->>Storage: Persist as JSON
        end
    end
    
    Orchestrator->>Persistence: Save Final State
    Persistence->>Storage: Persist Completion State
```

## Completion Detection Logic

```mermaid
flowchart TD
    Start[Start Completion Check] --> SimpleCheck{Simple Task<br/>1 Iteration?}
    
    SimpleCheck -->|Yes| AllSuccess{All Actions<br/>Successful?}
    SimpleCheck -->|No| ObjectiveCheck
    
    AllSuccess -->|Yes| MarkComplete1[Complete]
    AllSuccess -->|No| ObjectiveCheck
    
    ObjectiveCheck{Sub-objectives<br/>Check}
    ObjectiveCheck -->|All Complete| MarkComplete2[Complete]
    ObjectiveCheck -->|Incomplete| ConfidenceCheck
    
    ConfidenceCheck{Confidence<br/>Check}
    ConfidenceCheck -->|≥0.85| MarkComplete3[Complete]
    ConfidenceCheck -->|<0.85| MemoryCheck
    
    MemoryCheck{Memory<br/>Completion Signal}
    MemoryCheck -->|Present| MarkComplete4[Complete]
    MemoryCheck -->|Absent| Continue[Continue]
    
    MarkComplete1 --> End[Complete State]
    MarkComplete2 --> End
    MarkComplete3 --> End
    MarkComplete4 --> End
    Continue --> NextIteration[Next Iteration]
```

## Configurable Parameters

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| MAX_ITERATIONS | 24 | Maximum number of iterations |
| ITERATION_TIMEOUT_MS | 30000 | Timeout per iteration |
| MAX_WORKING_MEMORY_ENTRIES | 50 | Maximum entries in working memory |
| PERSISTENCE_INTERVAL_MS | 5000 | Auto-persistence interval |
| MAX_STATE_SIZE | 1MB | Maximum size of persisted state |

## Usage Examples

### Simple Task Processing Flow
```
User: "Create a note about AI"
↓
Complexity Assessment: Simple
↓
Direct Execution Path
↓
AI Response Generation + Tool Execution
↓
Complete
```

### Complex Task Processing Flow
```
User: "Organize all my machine learning notes and create a comprehensive index"
↓
Complexity Assessment: Complex
↓
StateGraph Workflow Start
↓
Analysis Node: Task Decomposition (8 subtasks)
↓
Search Node: Related Notes Search
↓
Execution Node: Note Organization & Index Creation
↓
Completion Check → Continue Decision
↓
(Repeat as needed)
↓
Complete
```

## Summary

This LangGraph-style workflow system selects the appropriate processing path based on task complexity, ensuring robust execution through state management and persistence. Simple tasks are processed immediately, while complex tasks are decomposed and executed step by step, achieving efficient and reliable task completion.