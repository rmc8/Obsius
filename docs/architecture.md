# Obsius Architecture Documentation

## Overview

Obsius follows a **simple, chat-first architecture** designed to provide efficient AI-powered interactions with Obsidian vaults while maintaining security and extensibility.

## Core System Design

```typescript
// Simple Processing Flow
User Message → AI Provider → Tool Execution → Result Display

// Key Components
┌─ Chat Interface (CLI-style)
├─ Agent Orchestrator (Coordination)
├─ Provider Manager (AI APIs)
├─ Tool Registry (Obsidian Operations)
├─ Session Manager (History & Context)
└─ Security Manager (Risk Assessment)
```

## Current Implementation Status

### ✅ Completed Components

#### Chat Interface (ChatView)
- **Location**: `src/ui/views/ChatView.ts`
- **Purpose**: CLI-style terminal interface in Obsidian sidebar
- **Features**:
  - Terminal-like command processing
  - Command history with arrow key navigation
  - Tab completion for system commands
  - Provider status integration
  - Context-aware welcome messages

#### Provider Management
- **Location**: `src/core/providers/ProviderManager.ts`
- **Purpose**: Secure API key management and provider authentication
- **Features**:
  - Multi-provider support (OpenAI, Anthropic, Google)
  - Secure API key storage
  - Authentication state persistence
  - Real-time provider status updates

#### Tool System
- **Location**: `src/tools/`
- **Purpose**: Obsidian-specific operations
- **Current Tools**:
  - CreateNoteTool - Create new notes
  - ReadNoteTool - Read existing notes
  - SearchNotesTool - Search vault content
  - UpdateNoteTool - Modify note content

### 🔄 In Progress

#### Agent Orchestrator
- **Status**: Architecture defined, implementation pending
- **Purpose**: Coordinate AI responses with tool execution
- **Dependencies**: AI provider integration completion

#### Session Manager
- **Status**: Basic structure in place, full implementation pending
- **Purpose**: Manage chat history and context persistence

### ⏳ Planned Components

#### Security Manager
- **Purpose**: Risk assessment and user confirmation
- **Features**: Operation risk levels, confirmation dialogs

#### Streaming Support
- **Purpose**: Real-time AI response streaming
- **Integration**: Provider-agnostic streaming interface

## File Structure

### Current Structure
```
src/
├── core/
│   ├── providers/
│   │   ├── ProviderManager.ts       # ✅ Implemented
│   │   ├── BaseAIProvider.ts        # ✅ Implemented
│   │   ├── OpenAIProvider.ts        # ✅ Implemented
│   │   ├── AnthropicProvider.ts     # ✅ Implemented
│   │   └── GoogleProvider.ts        # ✅ Implemented
│   ├── AgentOrchestrator.ts         # ⏳ Planned
│   ├── SessionManager.ts            # 🔄 Basic structure
│   └── SecurityManager.ts           # ⏳ Planned
├── tools/
│   ├── BaseTool.ts                  # ✅ Implemented
│   ├── ToolRegistry.ts              # ✅ Implemented
│   └── obsidian/
│       ├── CreateNoteTool.ts        # ✅ Implemented
│       ├── ReadNoteTool.ts          # ✅ Implemented
│       ├── SearchNotesTool.ts       # ✅ Implemented
│       └── UpdateNoteTool.ts        # ✅ Implemented
├── ui/
│   ├── components/
│   │   └── ApiKeyInput.tsx          # ✅ Implemented
│   └── views/
│       └── ChatView.ts              # ✅ Implemented
└── utils/
    ├── types.ts                     # ✅ Implemented
    ├── constants.ts                 # ✅ Implemented
    └── helpers.ts                   # ✅ Implemented
```

## Message Flow Architecture

### Chat Message Processing

```typescript
interface ChatMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ObsidianAction[];
}

interface ObsidianAction {
  type: string;
  description: string;
  parameters: Record<string, any>;
  result?: ActionResult;
  riskLevel?: RiskLevel;
  requiresConfirmation?: boolean;
}
```

### Command Processing Flow

1. **User Input** → ChatView receives command
2. **Command Classification** → System command vs. AI chat
3. **Execution** → Built-in command or AI provider call
4. **Tool Integration** → AI response triggers tool execution
5. **Result Display** → Terminal output with formatting

## CLI Interface Design

### Command System

#### Built-in Commands
- `/help` - Show available commands
- `/clear` - Clear terminal output
- `/provider [id]` - Show provider information
- `/settings` - Open plugin settings
- `/status` - Show system status

#### Chat Integration
- Natural language input → AI provider
- Tool execution based on AI responses
- Real-time feedback and confirmation

### User Experience Patterns

```
$ create a note about machine learning
🤔 Thinking...
✅ Created note: "Machine Learning Basics.md"
   Location: /Notes/Machine Learning Basics.md
   Content: Comprehensive introduction to ML concepts...

$ /status
System Status:
Current provider: OpenAI (gpt-4)
Authentication: ✅ Connected
Command history: 5 entries
Tools available: 4
```

## Security Framework

### Risk Assessment Levels

- **Low Risk**: Read operations, searches, note creation
- **Medium Risk**: Note modifications, bulk operations
- **High Risk**: Vault-wide changes, deletions

### Confirmation Strategy

```typescript
interface SecurityAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  rationale: string;
  affectedFiles?: string[];
}
```

## Provider Integration

### Multi-Provider Support

- **OpenAI**: GPT-3.5/GPT-4 integration
- **Anthropic**: Claude integration
- **Google**: Gemini integration
- **Extensible**: Easy addition of new providers

### Authentication Flow

1. User provides API key in settings
2. ProviderManager validates and stores securely
3. Provider availability shown in CLI placeholder
4. Chat requests routed to active provider

## Performance Considerations

### Optimization Strategies

- **Lazy Loading**: Components loaded on demand
- **Command History Limits**: Prevent memory leaks
- **Efficient DOM Updates**: Minimal re-rendering
- **Resource Cleanup**: Proper event listener management

### Memory Management

- Command history limits (configurable)
- Automatic cleanup on view close
- Provider connection pooling
- Tool registry optimization

## Extension Points

### Adding New Tools

```typescript
export class CustomTool extends BaseTool<CustomParams, CustomResult> {
  name = 'custom_tool';
  description = 'Performs custom operation';
  
  async execute(params: CustomParams): Promise<CustomResult> {
    // Implementation
  }
}
```

### Adding New Providers

```typescript
export class CustomProvider extends BaseAIProvider {
  async generateResponse(messages: ChatMessage[]): Promise<AssistantResponse> {
    // Implementation
  }
}
```

## Testing Strategy

### Unit Testing
- Tool execution with mock Obsidian API
- Provider authentication flows
- Command parsing and validation

### Integration Testing
- End-to-end chat workflows
- Cross-provider functionality
- Obsidian API integration

### Manual Testing
- CLI command functionality
- UI responsiveness across themes
- Provider switching and authentication

## Future Architecture Enhancements

### Planned Features
- **Streaming Responses**: Real-time AI output
- **Context Management**: Intelligent conversation context
- **Plugin Extensibility**: Third-party tool development
- **Multi-language Support**: Localization framework

### Scalability Considerations
- **Caching**: Intelligent response caching
- **Rate Limiting**: API usage optimization
- **Background Processing**: Non-blocking operations
- **Error Recovery**: Robust error handling and retry logic

---

This architecture document will be updated as new components are implemented and the system evolves.