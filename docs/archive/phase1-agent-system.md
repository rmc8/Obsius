# Phase 1: Autonomous Agent System Design Document

## Overview

Obsius is designed as **an agent that autonomously completes tasks based on user instructions**. It operates based on explicit user instructions without using automatic triggers.

## Agent Behavior Model

### 🎯 **Basic Operation Pattern**

**User Instruction → Planning → Autonomous Execution → Result Reporting**

```typescript
// Example: "Create today's meeting notes and link related past minutes"
// 
// 1. Understand user instruction
// 2. Agent creates plan:
//    - Create meeting note with today's date
//    - Search for past meeting minutes
//    - Create related links
//    - Apply appropriate template
// 3. Autonomous execution (complete without additional user instructions)
// 4. Report results
```

### 🤖 **Agent Execution Engine**

```typescript
export class AgentExecutor {
  private tools: ObsidianTools;
  private aiProvider: AIProvider;
  private maxSteps: number = 10; // Prevent infinite loops
  
  async executeTask(userInstruction: string): Promise<TaskResult> {
    const conversation: Message[] = [{
      role: 'user',
      content: userInstruction
    }];
    
    let step = 0;
    let taskCompleted = false;
    const executionLog: ExecutionStep[] = [];
    
    while (!taskCompleted && step < this.maxSteps) {
      step++;
      
      // Let AI determine the next action
      const response = await this.aiProvider.generateResponse(
        conversation,
        this.tools.getToolDefinitions(),
        {
          systemPrompt: this.getAgentSystemPrompt(),
          temperature: 0.1 // Low temperature for stable decisions
        }
      );
      
      conversation.push({
        role: 'assistant',
        content: response.content
      });
      
      // Tool execution determination
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const result = await this.executeToolCall(toolCall);
          
          // Record execution log
          executionLog.push({
            step,
            action: toolCall.function.name,
            parameters: toolCall.function.arguments,
            result,
            timestamp: new Date()
          });
          
          // Add result to conversation
          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      } else {
        // No tool execution = Possibly task completed
        taskCompleted = this.isTaskCompleted(response.content);
      }
    }
    
    return {
      completed: taskCompleted,
      steps: step,
      executionLog,
      finalMessage: conversation[conversation.length - 1].content
    };
  }
  
  private getAgentSystemPrompt(): string {
    return `You are an autonomous AI agent that assists with Obsidian knowledge management.

Roles:
- Understand user instructions and execute autonomously until completion
- Use multiple tools in combination as needed
- Execute while explaining the reason for each step
- Report clearly when the task is completed

Available tools:
${this.tools.getToolList()}

Important guidelines:
1. Accurately understand user instructions
2. Plan before executing
3. Explain the reason for each action
4. Handle errors appropriately
5. Summarize and report results upon completion

When you determine the task is complete, clearly state "Task completed." at the end.`;
  }
  
  private isTaskCompleted(content: string): boolean {
    const completionPhrases = [
      'Task completed',
      'All done',
      'Work finished',
      'Task finished',
      'タスクが完了しました',
      'すべて完了しました',
      '作業を終了します',
      'タスク終了'
    ];
    
    return completionPhrases.some(phrase => 
      content.includes(phrase)
    );
  }
}
```

### 🛠️ **Tool Definition and Execution**

```typescript
export class ObsidianTools {
  private app: App;
  
  getToolDefinitions(): FunctionDefinition[] {
    return [
      {
        name: 'create_note',
        description: 'Create a new note',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Note title' },
            content: { type: 'string', description: 'Note content' },
            folder: { type: 'string', description: 'Folder to create in (optional)' },
            template: { type: 'string', description: 'Template to use (optional)' }
          },
          required: ['title']
        }
      },
      {
        name: 'search_notes',
        description: 'Search notes',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum search results', default: 10 },
            include_content: { type: 'boolean', description: 'Include content in search', default: true }
          },
          required: ['query']
        }
      },
      {
        name: 'read_note',
        description: 'Read the content of a specified note',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Note path' }
          },
          required: ['path']
        }
      },
      {
        name: 'update_note',
        description: 'Update note content',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Note path' },
            content: { type: 'string', description: 'New content' },
            append: { type: 'boolean', description: 'Append to existing content', default: false }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'create_link',
        description: 'Create links between notes',
        parameters: {
          type: 'object',
          properties: {
            source_note: { type: 'string', description: 'Source note path' },
            target_note: { type: 'string', description: 'Target note path' },
            link_text: { type: 'string', description: 'Link text (optional)' },
            context: { type: 'string', description: 'Context to insert link (optional)' }
          },
          required: ['source_note', 'target_note']
        }
      },
      {
        name: 'get_vault_structure',
        description: 'Get vault structure (folder and file list)',
        parameters: {
          type: 'object',
          properties: {
            max_depth: { type: 'number', description: 'Maximum search depth', default: 3 },
            include_content_summary: { type: 'boolean', description: 'Include file summaries', default: false }
          }
        }
      },
      {
        name: 'apply_template',
        description: 'Apply template to create or update note',
        parameters: {
          type: 'object',
          properties: {
            template_name: { type: 'string', description: 'Template name' },
            variables: { type: 'object', description: 'Template variables' },
            target_note: { type: 'string', description: 'Target note path (omit for new creation)' }
          },
          required: ['template_name']
        }
      }
    ];
  }
  
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const { name, arguments: args } = toolCall.function;
    
    try {
      switch (name) {
        case 'create_note':
          return await this.createNote(args);
        case 'search_notes':
          return await this.searchNotes(args);
        case 'read_note':
          return await this.readNote(args);
        case 'update_note':
          return await this.updateNote(args);
        case 'create_link':
          return await this.createLink(args);
        case 'get_vault_structure':
          return await this.getVaultStructure(args);
        case 'apply_template':
          return await this.applyTemplate(args);
        default:
          return {
            success: false,
            message: `Unknown tool: ${name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Tool execution error (${name}): ${error.message}`
      };
    }
  }
  
  // Individual tool implementations...
  private async createNote(args: any): Promise<ToolResult> {
    // Implementation details
  }
  
  private async searchNotes(args: any): Promise<ToolResult> {
    // Implementation details
  }
  
  // ... Other tool implementations
}
```

### 💬 **Agent Execution Visualization**

```typescript
const AgentExecutionView: React.FC<{
  execution: TaskExecution;
  onCancel: () => void;
}> = ({ execution, onCancel }) => {
  return (
    <div className="agent-execution">
      <div className="execution-header">
        <h3>🤖 Agent executing...</h3>
        <button onClick={onCancel} className="cancel-btn">
          Cancel
        </button>
      </div>
      
      <div className="execution-progress">
        <div className="current-step">
          Step {execution.currentStep} / {execution.maxSteps}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(execution.currentStep / execution.maxSteps) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="execution-log">
        {execution.steps.map((step, index) => (
          <ExecutionStepDisplay key={index} step={step} />
        ))}
      </div>
      
      {execution.currentThinking && (
        <div className="thinking">
          <div className="thinking-header">
            <Icon name="brain" />
            Thinking...
          </div>
          <div className="thinking-content">
            {execution.currentThinking}
          </div>
        </div>
      )}
    </div>
  );
};

const ExecutionStepDisplay: React.FC<{ step: ExecutionStep }> = ({ step }) => {
  return (
    <div className="execution-step">
      <div className="step-header">
        <Icon name={getToolIcon(step.action)} />
        <span className="step-number">Step {step.step}</span>
        <span className="step-action">{step.action}</span>
        <span className="step-status">
          {step.result.success ? '✅' : '❌'}
        </span>
      </div>
      
      <div className="step-details">
        <div className="step-description">
          {getToolDescription(step.action, step.parameters)}
        </div>
        
        {step.result.message && (
          <div className="step-result">
            <strong>Result:</strong> {step.result.message}
          </div>
        )}
        
        {step.result.data && (
          <details className="step-data">
            <summary>Detailed Data</summary>
            <pre>{JSON.stringify(step.result.data, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};
```

### 🎯 **Usage Example Scenarios**

#### Scenario 1: Research Note Organization

```
User: "Organize notes about machine learning and create a learning map"

Agent execution:
1. 🔍 search_notes("machine learning") → Found 15 related notes
2. 📖 read_note() → Analyze content of each note
3. 🗂️ create_note("Machine_Learning_Map", template="mindmap") → Create map note
4. 🔗 create_link() → Link related notes to map
5. 📝 update_note() → Add learning progress and relationships to map

Result report: "Organized 15 notes about machine learning and created a learning map."
```

#### Scenario 2: Daily Review Preparation

```
User: "Summarize notes created today and extract tomorrow's tasks"

Agent execution:
1. 🗂️ get_vault_structure() → Identify today's updated files
2. 📖 read_note() → Check content of each file
3. 📝 create_note("Daily_Review_2024-06-26") → Create review note
4. 📝 update_note() → Add summary of created notes
5. 🔍 search_notes("TODO|task|tomorrow") → Search task keywords
6. 📝 update_note() → Add tomorrow's task list

Result report: "Summarized 5 notes created today and extracted 3 tasks for tomorrow."
```

### 📋 **Implementation Priority**

#### Phase 1-1 (Highest Priority - 1 week)
1. ✅ **Basic agent execution engine**
2. ✅ **Main tool implementation (create, read, search, update)**
3. ✅ **Simple execution visualization**
4. ✅ **Error handling**

#### Phase 1-2 (Important - 2 weeks)
1. 📋 **Advanced planning (multi-step tasks)**
2. 📋 **Execution pause/resume functionality**
3. 📋 **Execution history saving**
4. 📋 **Additional tools (link creation, templates)**

#### Phase 1-3 (Extension - 3-4 weeks)
1. 📋 **Enhanced context understanding**
2. 📋 **Custom tool creation capability**
3. 📋 **Execution efficiency optimization**
4. 📋 **User feedback learning**

## Summary

This design enables:

- **Autonomy**: Automatic execution from user instruction to completion
- **Transparency**: Visualization of each step
- **Control**: Interruption and modification when needed
- **Extensibility**: Addition of new tools and tasks

We can realize an agent system that combines the ease of use of ClaudeCode with the autonomy of OpenHands.