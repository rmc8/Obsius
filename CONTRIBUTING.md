# Contributing to Obsius

Thank you for your interest in contributing to Obsius! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

This project adheres to a code of conduct that promotes a respectful and inclusive environment. Please be kind and constructive in all interactions.

## Development Setup

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Obsidian (for testing)

### Setup Steps

1. **Fork and clone the repository**
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
   - Copy the built plugin to your test vault's `.obsidian/plugins/obsius/` folder
   - Enable the plugin in Obsidian settings

## How to Contribute

### Types of Contributions

- **Bug Reports**: Report issues you encounter
- **Feature Requests**: Suggest new functionality
- **Code Contributions**: Fix bugs or implement features
- **Documentation**: Improve docs, comments, or examples
- **Testing**: Add or improve tests

### Before You Start

1. Check existing issues to avoid duplication
2. For major changes, create an issue to discuss the approach
3. Make sure you understand the project architecture (see [CLAUDE.md](CLAUDE.md))

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript with strict mode enabled
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### File Organization

```
src/
├── core/          # Core engine and orchestration
├── providers/     # AI provider implementations  
├── tools/         # Obsidian operation tools
├── ui/            # React components and views
└── utils/         # Shared utilities and types
```

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas in objects/arrays
- Use async/await instead of promises where appropriate

Example:
```typescript
export class ExampleTool extends BaseTool<ExampleParams, ExampleResult> {
  name = 'example_tool';
  description = 'Performs an example operation';
  
  async execute(params: ExampleParams): Promise<ExampleResult> {
    // Implementation here
    return { success: true, result: 'Done' };
  }
}
```

### React Components

- Use functional components with hooks
- Use TypeScript interfaces for props
- Keep components focused and reusable
- Use proper error boundaries

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Coverage

- Aim for >80% test coverage
- Test all public APIs and critical paths
- Include both unit and integration tests
- Test error conditions and edge cases

### Writing Tests

```typescript
describe('ExampleTool', () => {
  it('should execute successfully with valid parameters', async () => {
    const tool = new ExampleTool();
    const result = await tool.execute({ param: 'value' });
    
    expect(result.success).toBe(true);
    expect(result.result).toBe('expected');
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Include tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run build
   npm run test
   npm run lint
   ```

4. **Submit a pull request**
   - Write a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add semantic search tool for notes
fix: resolve chat interface scrolling issue
docs: update installation instructions
test: add unit tests for provider manager
```

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include relevant tests and documentation
- Ensure all CI checks pass
- Respond to review feedback promptly

## Development Workflow

### Branch Strategy

- `main` - Stable release code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `fix/*` - Bug fix branches

### Release Process

1. Features merged to `develop` branch
2. Testing and stabilization on `develop`
3. Release candidate created from `develop`
4. Final testing and merge to `main`
5. Tagged release with version bump

## Getting Help

### Resources

- [Project Documentation](docs/README.md)
- [Architecture Guide](docs/architecture/)
- [Development Guide](CLAUDE.md)

### Communication

- **Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Pull Requests**: For code review and feedback

### Questions?

If you have questions about contributing:

1. Check the existing documentation
2. Search through existing issues
3. Create a new issue with the "question" label

---

Thank you for contributing to Obsius! Your help makes this project better for everyone. 🎉