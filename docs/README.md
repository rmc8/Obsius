# Obsius Documentation

Welcome to the Obsius documentation! This directory contains comprehensive guides and technical documentation for the Obsius AI Agent plugin for Obsidian.

## 📋 Documentation Index

### User Guides
- **[CLI Interface Guide](cli-interface.md)** - Complete user guide for the terminal-like chat interface
  - Getting started with the CLI
  - Built-in commands reference  
  - AI chat interaction patterns
  - Keyboard navigation and shortcuts
  - Troubleshooting common issues

### Technical Documentation
- **[Architecture Overview](architecture.md)** - System design and component details
  - Core system design and data flow
  - Current implementation status
  - File structure and organization
  - Component responsibilities
  - Extension points and patterns

- **[Development Guide](development-guide.md)** - Coding patterns and contribution guidelines
  - Development setup and workflow
  - Code style and conventions
  - Adding new tools and providers
  - Testing strategies
  - Performance considerations
  - Security guidelines

### Legacy Documentation (Archive)
- `architecture/` - Legacy system architecture documents
- `specifications/` - Original technical specifications
- `development/` - Early development documentation
- `integrations/` - Integration analysis documents
- `archive/` - Historical documentation

### Quick References
- **[Main README](../README.md)** - Project overview, quick start, and installation
- **[CLAUDE.md](../CLAUDE.md)** - Development guidance for Claude Code users
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to the project

## 🎯 Getting Started

### For Users
1. Start with the **[Main README](../README.md)** for installation and setup
2. Learn the interface with the **[CLI Interface Guide](cli-interface.md)**
3. Check troubleshooting sections for common issues

### For Developers
1. Review the **[Architecture Overview](architecture.md)** to understand the system
2. Follow the **[Development Guide](development-guide.md)** for coding patterns
3. Check **[CLAUDE.md](../CLAUDE.md)** for AI-assisted development guidance
4. Read **[Contributing Guidelines](../CONTRIBUTING.md)** before submitting changes

## 🔄 Current Implementation Status

### ✅ Completed Features
- **CLI Interface**: Terminal-like chat interface in Obsidian sidebar
- **Provider Management**: Secure API key storage for OpenAI, Anthropic, Google
- **Tool System**: Basic Obsidian operations (create, read, search, update notes)
- **Command Processing**: Built-in commands with history and tab completion

### 🔄 In Development
- **AI Integration**: Connecting chat interface with AI providers
- **Agent Orchestrator**: Coordinating AI responses with tool execution
- **Streaming Support**: Real-time response generation

### ⏳ Planned Features
- **Security Framework**: Risk assessment and user confirmation
- **Session Management**: Enhanced conversation persistence
- **Context Awareness**: Understanding workspace and file state

## 🔍 Finding Information

### Looking for...
- **How to use the CLI?** → [CLI Interface Guide](cli-interface.md)
- **System architecture?** → [Architecture Overview](architecture.md)  
- **Development setup?** → [Development Guide](development-guide.md)
- **How to contribute?** → [Contributing Guidelines](../CONTRIBUTING.md)
- **Current development status?** → [CLAUDE.md](../CLAUDE.md)
- **Project overview?** → [Main README](../README.md)

### Common Tasks
- **Installing the plugin** → [Main README: Installation](../README.md#installation-development)
- **Using CLI commands** → [CLI Interface: Built-in Commands](cli-interface.md#built-in-commands)
- **Adding new tools** → [Development Guide: Adding New Tools](development-guide.md#adding-new-tools)
- **Understanding data flow** → [Architecture: Message Flow](architecture.md#message-flow-architecture)
- **Troubleshooting** → [CLI Interface: Troubleshooting](cli-interface.md#troubleshooting)

---

This documentation is maintained alongside the codebase to ensure accuracy and completeness. For questions or suggestions, please open an issue or contribute improvements following our [Contributing Guidelines](../CONTRIBUTING.md).