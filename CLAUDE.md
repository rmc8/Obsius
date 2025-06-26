# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

- This CLAUDE.md file should always be written in English for consistency and broad accessibility
- However, chat interactions should be conducted in the language the user speaks (e.g., Japanese, English, etc.)
- Respond to users in their preferred language while maintaining English documentation

## Project Overview

This is an Obsidian plugin project (`Obsius`) intended to provide AI agent functionality similar to ClaudeCode, Gemini CLI, and OpenHands for Obsidian operations. Currently based on the Obsidian sample plugin template, it will be developed into a CLI-style agent interface within Obsidian.

### 🎯 Vision and Goals

**Primary Goal**: Create a **chat-based AI agent** that makes Obsidian operations as efficient as ClaudeCode while maintaining the familiar AI assistant experience users expect.

**Success Criteria**:
1. **Usability**: Natural language Obsidian operations
2. **Trust**: Transparent and safe AI actions
3. **Efficiency**: Clearly faster than manual operations
4. **Practicality**: Daily-use functionality

**Key Features (MVP)**:
- Natural language interface for note management
- Multi-AI provider support (Claude, GPT, Gemini)
- Obsidian-native operations (create, search, update, organize)
- Real-time streaming responses
- Security-first approach with user confirmation
- Context-aware operations based on current workspace

### 🏗️ Architecture Philosophy

**Simple, Chat-First Design**:
- ClaudeCode-style interface with streaming responses
- Direct AI provider integration (no heavy framework dependencies)
- Tool-centric extensible architecture
- Local-first approach with minimal external dependencies
- React + TypeScript for robust UI development

## Development Commands

**Build and Development:**
- `npm install` - Install dependencies
- `npm run dev` - Start development mode with watch (rebuilds on file changes)
- `npm run build` - Build for production (includes TypeScript checking)
- `npm version patch|minor|major` - Bump version in manifest.json, package.json, and versions.json

**Code Quality:**
- `eslint main.ts` - Lint the main TypeScript file
- `tsc -noEmit -skipLibCheck` - Type check without emitting files (included in build)

## Architecture

**Current Structure:**
- Single-file plugin in `main.ts` - the main plugin entry point extending Obsidian's Plugin class
- Uses esbuild for bundling with TypeScript compilation
- Standard Obsidian plugin structure with manifest.json for plugin metadata

**Key Files:**
- `main.ts` - Plugin entry point with onload/onunload lifecycle methods
- `manifest.json` - Plugin metadata for Obsidian
- `esbuild.config.mjs` - Build configuration using esbuild
- `styles.css` - Plugin styles

**Obsidian Plugin API Integration:**
- Plugin class extends Obsidian's Plugin base class
- Uses `addCommand()` for registering commands in Command Palette
- `addRibbonIcon()` for adding toolbar icons
- `addSettingTab()` for plugin settings UI
- `registerDomEvent()` and `registerInterval()` for cleanup-managed event handling

**Planned Architecture (for AI Agent functionality):**
This plugin aims to implement CLI-style AI agent interaction within Obsidian, requiring:
- Command parsing and execution system
- AI provider integrations (Claude, Gemini, etc.)
- Obsidian-specific operations (note manipulation, vault management)
- Session management for persistent agent conversations
- Terminal/CLI-like interface within Obsidian

**Development Notes:**
- Target ES2018 with ES6 TypeScript compilation
- External dependencies: obsidian, electron, and CodeMirror packages
- Development builds include inline source maps
- Production builds are minified without source maps

## 🚀 Phase 1 MVP Development Plan

### Current Status: **Week 1-2 Foundation**

**Milestone Overview**:
- ✅ Project structure and documentation organization
- 🔄 Core plugin architecture setup
- ⏳ AI provider integration
- ⏳ Basic Obsidian tools implementation

### Implementation Priorities

#### Week 1-2: Foundation
1. **Plugin Architecture** - Service-oriented design with lazy initialization
2. **AI Provider Integration** - Direct API integration with Claude/OpenAI/Gemini
3. **Basic Tool System** - Core Obsidian operations (create, search, update)
4. **React UI Foundation** - Basic chat interface with context providers

#### Week 3-4: Core Features  
1. **Streaming Responses** - Real-time AI interaction with tool execution
2. **Session Management** - Persistent conversations with context preservation
3. **Security Framework** - Risk assessment and user confirmation
4. **Tool Execution Pipeline** - Validation, confirmation, and error handling

#### Week 5-6: Polish and Testing
1. **Enhanced UI** - Improved chat interface with action visualization
2. **Error Handling** - Comprehensive error recovery and user feedback
3. **Performance Optimization** - Lazy loading and resource management
4. **Testing and Documentation** - Quality assurance and user guides

### Acceptance Criteria (MVP Complete)

**Functional Requirements**:
- [ ] Basic chat interface operational
- [ ] 4 core tools working (create, read, search, update notes)
- [ ] AI provider integration (at least Claude or OpenAI)
- [ ] User confirmation for risky operations
- [ ] Session persistence across Obsidian restarts

**Quality Requirements**:
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Initial load < 3 seconds
- [ ] Chat response < 2 seconds
- [ ] Works on Windows/Mac/Linux

## 🏗️ Technical Architecture

### Core System Design

```typescript
// Simple Processing Flow
User Message → AI Provider → Tool Execution → Result Display

// Key Components
┌─ Chat Interface (React)
├─ Agent Orchestrator (Coordination)
├─ Provider Manager (AI APIs)
├─ Tool Registry (Obsidian Operations)
├─ Session Manager (History & Context)
└─ Security Manager (Risk Assessment)
```

### Core File Structure (Target)

```
src/
├── core/
│   ├── AgentOrchestrator.ts     # Central coordination
│   ├── ProviderManager.ts       # AI provider management
│   ├── ToolRegistry.ts          # Tool system
│   ├── SessionManager.ts        # History & context
│   └── SecurityManager.ts       # Risk assessment
├── providers/
│   ├── BaseAIProvider.ts        # Provider interface
│   ├── AnthropicProvider.ts     # Claude integration
│   ├── OpenAIProvider.ts        # GPT integration
│   └── GeminiProvider.ts        # Gemini integration
├── tools/
│   ├── BaseTool.ts              # Tool base class
│   └── obsidian/
│       ├── CreateNoteTool.ts    # Note creation
│       ├── SearchNotesTool.ts   # Note search
│       ├── UpdateNoteTool.ts    # Note modification
│       └── ReadNoteTool.ts      # Note reading
├── ui/
│   ├── components/
│   │   ├── ChatInterface.tsx    # Main chat UI
│   │   ├── MessageBubble.tsx    # Message display
│   │   ├── ToolExecution.tsx    # Action visualization
│   │   └── SettingsPanel.tsx    # Configuration UI
│   └── views/
│       ├── ChatView.ts          # Obsidian view integration
│       └── SettingsView.ts      # Settings tab
└── utils/
    ├── types.ts                 # Shared TypeScript types
    ├── constants.ts             # App constants
    └── helpers.ts               # Utility functions
```

## 💻 Development Guidelines

### Code Style and Patterns

**TypeScript Conventions**:
- Use strict mode with comprehensive type checking
- Prefer interfaces over types for object shapes
- Use Zod for runtime validation and schema definition
- Implement proper error handling with custom error types

**React Patterns**:
- Use functional components with hooks
- Context providers for state management
- Error boundaries for graceful error handling
- Controlled components for form inputs

**Architecture Patterns**:
- Service-oriented design with dependency injection
- Factory pattern for AI providers
- Observer pattern for tool execution updates
- Strategy pattern for different AI provider implementations

### Tool Development Pattern

```typescript
export class ExampleTool extends BaseTool<ExampleParams, ExampleResult> {
  name = 'example_tool';
  description = 'Performs an example operation';
  
  schema = z.object({
    parameter: z.string().describe('Example parameter')
  });

  async execute(params: ExampleParams, context: ExecutionContext): Promise<ExampleResult> {
    // 1. Validate parameters
    const validation = this.validateParams(params);
    if (!validation.valid) throw new ValidationError(validation.errors);
    
    // 2. Check permissions/risk level
    if (this.requiresConfirmation(params)) {
      const confirmed = await context.requestConfirmation({
        operation: this.description,
        risk: this.assessRisk(params)
      });
      if (!confirmed) return { success: false, cancelled: true };
    }
    
    // 3. Execute operation
    try {
      const result = await this.performOperation(params, context);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### Testing Strategy

**Unit Tests**:
- Test each tool in isolation with mock dependencies
- Test AI provider integrations with mock APIs
- Test UI components with React Testing Library

**Integration Tests**:
- Test complete user workflows end-to-end
- Test tool execution pipeline with real Obsidian API
- Test session management and persistence

**Manual Testing Scenarios**:
```
1. Basic Chat: "Create a note about machine learning"
2. Search Operations: "Find all notes about productivity" 
3. Context Awareness: "Update the current note with a summary"
4. Error Handling: Invalid API keys, network issues
5. Security: Dangerous operations requiring confirmation
```

## 🔧 Implementation Details

### Message Flow Architecture

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
}

// Processing Flow
const handleUserMessage = async (content: string) => {
  // 1. Add user message to chat
  const userMessage = createMessage('user', content);
  addMessage(userMessage);
  
  // 2. Get AI response with tools
  const aiResponse = await aiProvider.generateResponse(
    conversationHistory,
    availableTools
  );
  
  // 3. Execute any tool calls
  if (aiResponse.actions) {
    for (const action of aiResponse.actions) {
      const result = await executeAction(action);
      displayActionResult(action, result);
    }
  }
};
```

### Security Framework

```typescript
interface SecurityAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  rationale: string;
  affectedFiles?: string[];
}

class SecurityManager {
  assessRisk(action: ObsidianAction): SecurityAssessment {
    // Assess based on:
    // - Operation type (create vs delete)
    // - Scope (single file vs vault-wide)
    // - Data sensitivity (personal vs generated content)
    // - Reversibility (easily undoable vs permanent)
  }
}
```

## 📋 Current Tasks and Priorities

### Immediate Next Steps

1. **Set up src/ folder structure** (this session)
2. **Implement basic plugin architecture** (Week 1)
3. **Add OpenAI provider integration** (Week 1)
4. **Create first tool (CreateNoteTool)** (Week 1)
5. **Build basic React chat interface** (Week 2)

### Blocking Issues

- None currently identified

### Technical Debt

- Current single-file structure needs refactoring
- No testing framework set up yet
- No CI/CD pipeline established

## 🎯 Success Metrics

**Technical Metrics**:
- Build time < 10 seconds
- Bundle size < 2MB
- Memory usage < 100MB during operation
- Zero console errors in production

**User Experience Metrics**:
- First response time < 2 seconds
- Learning curve < 5 minutes for basic operations
- Error rate < 5% for common operations
- User satisfaction > 4/5 in early testing

---

**Note**: This document is a living guide that will be updated as the project evolves. Always refer to the latest version for current development priorities and architectural decisions.