# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Guidelines

- This CLAUDE.md file should always be written in English for consistency and broad accessibility
- However, chat interactions should be conducted in the language the user speaks (e.g., Japanese, English, etc.)
- Respond to users in their preferred language while maintaining English documentation

## Project Overview

This is an Obsidian plugin project (`Obsius`) that provides AI agent functionality similar to ClaudeCode, Gemini CLI, and OpenHands for Obsidian operations. It features a CLI-style agent interface within Obsidian.

### 🎯 Vision and Goals

**Primary Goal**: Create a **chat-based AI agent** that makes Obsidian operations as efficient as ClaudeCode while maintaining the familiar AI assistant experience users expect.

**Key Features (MVP)**:
- ✅ CLI-style chat interface in sidebar
- ✅ Multi-AI provider support (Claude, GPT, Gemini) 
- ✅ Secure API key management
- ✅ Basic Obsidian tools (create, read, search, update)
- 🔄 Real-time AI integration
- ⏳ Streaming responses
- ⏳ Context-aware operations

## Development Commands

**Build and Development:**
- `npm install` - Install dependencies
- `npm run dev` - Start development mode with watch (rebuilds on file changes)
- `npm run build` - Build for production (includes TypeScript checking)
- `npm version patch|minor|major` - Bump version in manifest.json, package.json, and versions.json

**Code Quality:**
- `eslint main.ts` - Lint the main TypeScript file
- `tsc -noEmit -skipLibCheck` - Type check without emitting files (included in build)

## Current Implementation Status

### ✅ Completed (Phase 1 MVP Foundation + AI Integration)

**🤖 AI Chat System (`src/core/AgentOrchestrator.ts`)**:
- Full AI integration with OpenAI, Anthropic Claude, and Google Gemini
- Knowledge management optimized system prompts
- Real-time AI responses with tool execution
- Context-aware conversations with workspace state

**📱 CLI Interface (`src/ui/views/ChatView.ts`)**:
- Terminal-like interface in right sidebar with functional AI chat
- Command processing with history and tab completion
- Built-in commands: `/help`, `/clear`, `/provider`, `/settings`, `/status`
- Real AI conversation display with tool execution results

**🔧 Provider Management (`src/core/providers/`)**:
- Secure API key storage and authentication
- Multi-provider support with AI completion endpoints
- Tool calling integration for AI-driven operations
- Real-time status updates and configuration UI

**🛠️ Tool System (`src/tools/`)**:
- Full Obsidian operations: CreateNote, ReadNote, SearchNotes, UpdateNote
- AI-driven tool execution with parameter validation
- Tool registry with risk assessment and schema generation
- Extensible architecture for custom tools

**🌐 Multilingual Support (`src/utils/i18n.ts`)**:
- Full interface localization in English and Japanese
- Real-time language switching without restart
- AI responses in user's preferred language

**📋 Knowledge Management Framework**:
- 5-phase knowledge workflow: Explore → Connect → Structure → Create → Integrate
- PKM (Personal Knowledge Management) principles integration
- Graph thinking and connection excellence
- Comprehensive system prompt for knowledge management

### 🔄 Next Enhancements (Phase 2)

1. **Streaming Support** - Real-time AI response streaming 
2. **Enhanced Error Handling** - Improved error recovery and user feedback
3. **Session Management** - Enhanced conversation persistence
4. **Security Framework** - Advanced risk assessment and confirmation dialogs
5. **Graph Analysis** - Knowledge graph structure analysis and optimization

## Key Architecture

### File Structure
```
src/
├── core/
│   ├── providers/          # ✅ AI provider management
│   ├── AgentOrchestrator.ts # ⏳ AI coordination 
│   └── SessionManager.ts    # ⏳ Chat history
├── tools/                  # ✅ Obsidian operations
├── ui/
│   ├── components/         # ✅ React components
│   └── views/
│       └── ChatView.ts     # ✅ CLI interface
└── utils/                  # ✅ Shared types and helpers
```

### Processing Flow
```
User Input → ChatView → AI Provider → Tool Execution → Terminal Output
```

## Development Guidelines

### Code Style
- Use TypeScript with strict mode
- Follow existing patterns in the codebase
- Use Obsidian CSS variables for theming
- Implement proper error handling and cleanup

### Adding New Tools
```typescript
export class NewTool extends BaseTool<Params, Result> {
  name = 'new_tool';
  description = 'Tool description';
  
  async execute(params: Params, context: ExecutionContext): Promise<Result> {
    // Implementation with validation and error handling
  }
}
```

### Testing Strategy
- Unit tests for tools and providers
- Integration tests for chat workflows
- Manual testing for UI and user experience

## Documentation

For detailed information, see:
- **Architecture**: `docs/architecture.md` - System design and component details
- **CLI Interface**: `docs/cli-interface.md` - User guide for chat interface
- **Development**: `docs/development-guide.md` - Coding patterns and contribution guidelines
- **README**: Project overview and quick start

## Current Tasks and Priorities

### Immediate (This Sprint)
1. **Complete AI Integration** - Connect ChatView to provider system
2. **Implement Agent Orchestrator** - Coordinate AI responses with tools
3. **Add Streaming Support** - Real-time response generation

### Phase 2 Goals
- Enhanced session management with context preservation
- Security framework with risk assessment
- Performance optimization and error handling
- User experience polish and testing

### Acceptance Criteria (MVP Complete)
- [ ] AI chat responses working through CLI
- [ ] Tool execution triggered by AI responses
- [ ] Provider switching functional
- [ ] Session persistence across restarts
- [ ] Zero TypeScript/ESLint errors
- [ ] Performance: <2s response time, <3s initial load

## Development Notes

- **Plugin API**: Uses Obsidian's ItemView for sidebar integration
- **Build System**: esbuild with TypeScript compilation
- **Styling**: CSS custom properties for theme compatibility  
- **Security**: No plaintext API key storage, proper input validation
- **Performance**: Lazy loading, efficient DOM updates, memory management

---

**Note**: This document focuses on development guidance. For architecture details, user documentation, and comprehensive guides, refer to the `docs/` directory.