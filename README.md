# Obsius 🤖

**AI Agent for Obsidian - Your intelligent writing and knowledge management assistant**

Obsius is an AI-powered plugin for Obsidian that provides a CLI-style agent interface similar to ClaudeCode, Gemini CLI, and OpenHands. It enables natural language interaction with your Obsidian vault through a chat-based interface while maintaining the familiar experience of AI assistants.

## ✨ Features

- **🗣️ Natural Language Interface**: Chat with AI to manage your notes and vault
- **🔧 Obsidian-Native Operations**: Create, search, update, and organize notes through AI commands
- **🔀 Multi-Provider Support**: Works with Claude, GPT, Gemini, and local models
- **📡 Real-time Streaming**: Live responses with progressive content generation
- **🛡️ Security-First**: Risk assessment and user confirmation for sensitive operations
- **🎯 Context-Aware**: Understands your current note, selection, and workspace state
- **💾 Session Management**: Persistent conversations with intelligent history management

## 🎯 Project Goals

Obsius aims to provide the **efficiency of ClaudeCode with the knowledge management power of Obsidian**:

- **Simplicity**: Easy-to-use chat interface without complex configuration
- **Efficiency**: Dramatically faster note operations through natural language
- **Intelligence**: Context-aware operations that understand your workspace
- **Safety**: Transparent AI actions with user control and confirmation
- **Extensibility**: Plugin-based architecture for custom tools and providers

## 🚀 Quick Start

### Prerequisites

- Obsidian v1.4.0 or higher
- Node.js v16 or higher

### Installation (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/obsius.git
   cd obsius
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

4. **Setup in Obsidian**
   - Copy the built plugin to your vault's `.obsidian/plugins/obsius/` folder
   - Enable the plugin in Obsidian settings
   - Configure your AI provider API key in plugin settings

### Quick Setup

1. **Open Obsius**: Click the robot icon in the ribbon or use `Ctrl+P` → "Obsius: Open AI Chat"
2. **Configure Provider**: Go to Settings → Obsius and add your API key (Claude, OpenAI, or Gemini)
3. **Start Chatting**: Begin with simple commands like:
   - "Create a note about machine learning"
   - "Search for notes about productivity"
   - "Update my daily note with today's thoughts"

## 💬 Example Usage

```
You: Create a note about TypeScript best practices

Obsius: I'll create a comprehensive note about TypeScript best practices for you.

✅ Created note: "TypeScript Best Practices.md"
   Path: TypeScript Best Practices.md
   Content: Structured guide with sections on type safety, interfaces, generics, and more.

You: Find all notes related to programming

Obsius: I found 12 notes related to programming:

📄 JavaScript Fundamentals.md
📄 React Development Guide.md
📄 TypeScript Best Practices.md
...

Would you like me to create a summary of all programming notes?
```

## 🏗️ Architecture

Obsius follows a **simple, chat-first architecture**:

```
┌─ Chat Interface ──────────────────────────┐
│  User Input → AI Response → Tool Actions  │
└─────────────────┬─────────────────────────┘
                  │
┌─ Core Engine ───▼─────────────────────────┐
│  ├─ Provider Manager (Claude/GPT/Gemini)  │
│  ├─ Tool Registry (Obsidian Operations)   │
│  ├─ Session Manager (History & Context)   │
│  └─ Security Manager (Risk Assessment)    │
└───────────────────────────────────────────┘
                  │
┌─ Obsidian API ──▼─────────────────────────┐
│  Vault • Notes • Search • Metadata        │
└───────────────────────────────────────────┘
```

### Key Components

- **Chat Interface**: React-based UI with real-time streaming
- **Agent Orchestrator**: Coordinates AI responses and tool execution
- **Tool System**: Extensible Obsidian operations (create, search, update, etc.)
- **Provider System**: Multi-AI provider support with failover
- **Security Layer**: Risk assessment and user confirmation for sensitive operations

## 🛠️ Development

### Development Commands

```bash
# Start development with watch mode
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
```

### Project Structure

```
src/
├── core/                 # Core engine and orchestration
│   ├── AgentOrchestrator.ts
│   ├── ProviderManager.ts
│   └── ToolRegistry.ts
├── providers/            # AI provider implementations
│   ├── AnthropicProvider.ts
│   ├── OpenAIProvider.ts
│   └── GeminiProvider.ts
├── tools/               # Obsidian operation tools
│   └── obsidian/
│       ├── CreateNoteTool.ts
│       └── SearchNotesTool.ts
├── ui/                  # React components and views
│   ├── components/
│   └── views/
└── utils/               # Shared utilities and types
```

### Adding New Tools

```typescript
export class CustomTool extends BaseTool {
  name = 'custom_operation';
  description = 'Performs a custom operation';
  
  async execute(params: CustomParams): Promise<ToolResult> {
    // Your implementation here
    return { success: true, message: 'Operation completed' };
  }
}

// Register in ToolRegistry
toolRegistry.register(new CustomTool());
```

## 📖 Documentation

- **[Development Guide](docs/README.md)** - Comprehensive project overview
- **[Architecture Guide](docs/architecture/)** - System design and patterns
- **[API Reference](docs/api/)** - Tool and provider interfaces
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

## 🎯 Current Status

**Phase 1 MVP** (In Development):
- ✅ Basic chat interface
- ✅ Multi-provider AI support  
- 🔄 Core Obsidian tools (create, search, update)
- ⏳ Session management
- ⏳ Security framework

See [Phase 1 Roadmap](docs/development/phase1-mvp-roadmap.md) for detailed progress.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Setting up the development environment
- Code style and conventions
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Obsidian Team** - For the amazing platform and plugin API
- **ClaudeCode, Gemini CLI, OpenHands** - For inspiration and architectural patterns
- **Community** - For feedback, ideas, and contributions

---

**Built with ❤️ for the Obsidian community**

For support, feature requests, or general discussion, please [open an issue](https://github.com/your-username/obsius/issues) or join our community discussions.