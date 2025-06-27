# Development Guide

## Getting Started

### Prerequisites

- **Node.js**: v16 or higher
- **npm**: v8 or higher
- **Obsidian**: v1.4.0 or higher
- **TypeScript**: Familiarity recommended

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/rmc8/Obsius.git
   cd obsius
   npm install
   ```

2. **Start Development**
   ```bash
   npm run dev  # Watch mode with auto-rebuild
   ```

3. **Setup in Obsidian**
   ```bash
   # Copy to your test vault
   cp -r dist/* /path/to/vault/.obsidian/plugins/obsius/
   
   # Or create symlink for live updates
   ln -s $(pwd) /path/to/vault/.obsidian/plugins/obsius
   ```

### Development Commands

```bash
# Development
npm run dev          # Watch mode with rebuilding
npm run build        # Production build
npm run build:dev    # Development build with source maps

# Code Quality
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript type checking

# Versioning
npm version patch    # Bump patch version
npm version minor    # Bump minor version
npm version major    # Bump major version
```

## Architecture Overview

### Core Principles

1. **Simple, Chat-First Design**
   - CLI-style interface for familiar interaction
   - Direct AI provider integration
   - Tool-centric extensible architecture

2. **Security-First Approach**
   - Secure API key storage
   - Risk assessment for operations
   - User confirmation for sensitive actions

3. **Obsidian-Native Integration**
   - Proper plugin API usage
   - Theme compatibility
   - Performance optimization

### Key Components

#### ChatView (`src/ui/views/ChatView.ts`)
- **Purpose**: CLI-style interface in sidebar
- **Responsibilities**: Command processing, UI management, user interaction
- **Key Methods**: `executeCommand()`, `showWelcome()`, `navigateHistory()`

#### ProviderManager (`src/core/providers/ProviderManager.ts`)
- **Purpose**: AI provider management and authentication
- **Responsibilities**: API key storage, provider switching, authentication
- **Key Methods**: `setProviderApiKey()`, `authenticate()`, `switchProvider()`

#### ToolRegistry (`src/tools/ToolRegistry.ts`)
- **Purpose**: Obsidian operation management
- **Responsibilities**: Tool registration, execution, validation
- **Key Methods**: `registerTool()`, `executeTool()`, `getStats()`

## Development Patterns

### Adding New Tools

1. **Create Tool Class**
   ```typescript
   export class CustomTool extends BaseTool<CustomParams, CustomResult> {
     name = 'custom_tool';
     description = 'Performs custom operation';
     
     schema = z.object({
       parameter: z.string().describe('Required parameter')
     });

     async execute(params: CustomParams, context: ExecutionContext): Promise<CustomResult> {
       // 1. Validate parameters
       const validation = this.validateParams(params);
       if (!validation.valid) {
         throw new ToolValidationError('Invalid parameters', validation.errors);
       }
       
       // 2. Perform operation
       const result = await this.performOperation(params, context);
       
       return {
         success: true,
         message: 'Operation completed successfully',
         data: result
       };
     }
   }
   ```

2. **Register Tool**
   ```typescript
   // In main.ts or plugin initialization
   this.toolRegistry.registerTool('custom_tool', CustomTool, {
     description: 'Performs custom operation',
     riskLevel: 'low',
     category: 'obsidian',
     enabled: true
   });
   ```

### Adding New AI Providers

1. **Implement Provider Interface**
   ```typescript
   export class CustomProvider extends BaseAIProvider {
     constructor(config: ProviderConfig) {
       super(config);
     }

     async authenticate(apiKey: string): Promise<AuthResult> {
       // Implement authentication logic
       const response = await this.testConnection(apiKey);
       return {
         success: response.ok,
         models: response.models,
         error: response.error
       };
     }

     async generateResponse(
       messages: ChatMessage[],
       tools?: ToolDefinition[]
     ): Promise<AssistantResponse> {
       // Implement response generation
     }
   }
   ```

2. **Register Provider**
   ```typescript
   // In ProviderManager
   this.providers.set('custom', new CustomProvider(config));
   ```

### CLI Command Development

1. **Add System Command**
   ```typescript
   // In ChatView.executeSystemCommand()
   switch (cmd) {
     case 'mycmd':
       await this.handleMyCommand(args);
       break;
     // ...
   }
   ```

2. **Implement Command Handler**
   ```typescript
   private async handleMyCommand(args: string[]): Promise<void> {
     // Command implementation
     this.addOutput('Command executed successfully', 'success');
   }
   ```

3. **Add to Tab Completion**
   ```typescript
   // In ChatView.handleTabCompletion()
   const commands = ['/help', '/clear', '/mycmd', /* ... */];
   ```

## Code Style Guidelines

### TypeScript Conventions

```typescript
// Use interfaces for object shapes
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  autoSave: boolean;
}

// Use proper error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}

// Use type guards for runtime checking
function isValidProvider(provider: unknown): provider is ProviderConfig {
  return typeof provider === 'object' && 
         provider !== null && 
         'name' in provider && 
         'model' in provider;
}
```

### CSS Conventions

```css
/* Use Obsidian CSS variables for theming */
.obsius-component {
  background: var(--background-primary);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
}

/* Use BEM-like naming for components */
.obsius-terminal {}
.obsius-terminal__output {}
.obsius-terminal__input {}
.obsius-terminal__input--focused {}

/* Mobile-first responsive design */
.obsius-sidebar {
  padding: 8px;
}

@media (min-width: 768px) {
  .obsius-sidebar {
    padding: 16px;
  }
}
```

### Documentation Standards

```typescript
/**
 * Executes a tool with the given parameters
 * @param toolName - Name of the tool to execute
 * @param params - Parameters for tool execution
 * @param context - Execution context with app and file info
 * @returns Promise resolving to tool execution result
 * @throws {ToolValidationError} When parameters are invalid
 * @throws {ToolExecutionError} When execution fails
 */
async executeTool(
  toolName: string, 
  params: any, 
  context?: ExecutionContext
): Promise<ToolResult> {
  // Implementation
}
```

## Testing Strategy

### Unit Testing

```typescript
// Tool testing example
describe('CreateNoteTool', () => {
  let tool: CreateNoteTool;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    tool = new CreateNoteTool();
    mockContext = createMockContext();
  });

  it('should create note with valid parameters', async () => {
    const params = {
      title: 'Test Note',
      content: 'Test content'
    };

    const result = await tool.execute(params, mockContext);

    expect(result.success).toBe(true);
    expect(result.data.path).toBe('Test Note.md');
  });

  it('should validate required parameters', async () => {
    const params = { content: 'No title' };

    await expect(tool.execute(params, mockContext))
      .rejects
      .toThrow(ToolValidationError);
  });
});
```

### Integration Testing

```typescript
// Provider testing example
describe('ProviderManager Integration', () => {
  let manager: ProviderManager;

  beforeEach(async () => {
    manager = new ProviderManager(mockPlugin);
    await manager.initialize();
  });

  it('should authenticate with valid API key', async () => {
    const result = await manager.setProviderApiKey('openai', 'valid-key');
    
    expect(result.success).toBe(true);
    expect(manager.getProviderConfig('openai').authenticated).toBe(true);
  });
});
```

## Performance Guidelines

### Optimization Strategies

1. **Lazy Loading**
   ```typescript
   // Load providers only when needed
   async getProvider(id: string): Promise<BaseAIProvider> {
     if (!this.loadedProviders.has(id)) {
       this.loadedProviders.set(id, await this.loadProvider(id));
     }
     return this.loadedProviders.get(id);
   }
   ```

2. **Memory Management**
   ```typescript
   // Limit command history size
   private addToHistory(command: string): void {
     this.commandHistory.unshift(command);
     if (this.commandHistory.length > this.maxHistorySize) {
       this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
     }
   }
   ```

3. **Efficient DOM Updates**
   ```typescript
   // Batch DOM updates
   private updateOutput(messages: string[]): void {
     const fragment = document.createDocumentFragment();
     messages.forEach(message => {
       const line = document.createElement('div');
       line.textContent = message;
       fragment.appendChild(line);
     });
     this.outputContainer.appendChild(fragment);
   }
   ```

### Bundle Size Optimization

- Use dynamic imports for large dependencies
- Tree-shake unused code
- Optimize CSS with unused style removal
- Compress assets in production builds

## Security Considerations

### API Key Security

```typescript
// Never store API keys in plain text
class SecureStorage {
  async storeApiKey(providerId: string, apiKey: string): Promise<void> {
    // Use Obsidian's secure storage or encryption
    await this.app.vault.adapter.write(
      this.getKeyPath(providerId),
      await this.encrypt(apiKey)
    );
  }

  async retrieveApiKey(providerId: string): Promise<string | null> {
    try {
      const encrypted = await this.app.vault.adapter.read(this.getKeyPath(providerId));
      return await this.decrypt(encrypted);
    } catch {
      return null;
    }
  }
}
```

### Input Validation

```typescript
// Validate and sanitize user inputs
private sanitizeInput(input: string): string {
  // Remove potentially harmful characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .slice(0, this.maxInputLength); // Length limit
}

// Use Zod for schema validation
const commandSchema = z.object({
  type: z.enum(['system', 'chat']),
  content: z.string().min(1).max(1000),
  timestamp: z.date()
});
```

## Debugging and Troubleshooting

### Development Tools

1. **Console Logging**
   ```typescript
   // Use structured logging
   console.log('🔧 Obsius Debug:', {
     component: 'ChatView',
     action: 'executeCommand',
     command: command,
     timestamp: new Date().toISOString()
   });
   ```

2. **Error Tracking**
   ```typescript
   // Comprehensive error context
   catch (error) {
     console.error('Tool execution failed:', {
       toolName,
       params,
       error: error.message,
       stack: error.stack,
       context: this.getExecutionContext()
     });
   }
   ```

3. **State Inspection**
   ```typescript
   // Add debug command
   case 'debug':
     this.addOutput(JSON.stringify({
       providers: this.plugin.settings.providers,
       tools: this.plugin.toolRegistry.getStats(),
       history: this.commandHistory.length
     }, null, 2));
     break;
   ```

### Common Issues

1. **View Not Loading**: Check view registration in `onload()`
2. **Commands Not Working**: Verify command parsing logic
3. **Provider Errors**: Check API key configuration and network
4. **Memory Leaks**: Ensure proper cleanup in `onunload()`

## Contribution Guidelines

### Before Contributing

1. Check existing issues and PRs
2. Follow the established code style
3. Add tests for new functionality
4. Update documentation as needed

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update relevant documentation
4. Submit PR with clear description
5. Address review feedback

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass and provide adequate coverage
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Accessibility requirements met

---

This development guide will be updated as the project evolves and new patterns emerge.