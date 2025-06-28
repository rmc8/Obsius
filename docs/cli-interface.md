# CLI Interface Documentation

## Overview

Obsius provides a terminal-like CLI interface within Obsidian's sidebar, offering both built-in system commands and natural language AI interactions.

## Getting Started

### Opening the CLI

1. **Ribbon Icon**: Click the robot icon in the Obsidian ribbon
2. **Command Palette**: Use `Ctrl+P` (or `Cmd+P`) → "Obsius: Open AI Chat"
3. **Keyboard Shortcut**: Configure custom shortcut in Obsidian settings

### First Use

Upon opening, you'll see a welcome message:

```
✻ Welcome to Obsius v0.1.0!

Vault: YourVaultName

Type /help for commands or start chatting.
$ 
```

## Built-in Commands

### `/help` - Command Reference
Shows all available commands and usage instructions.

```
$ /help
Commands:
  /help      Show commands
  /clear     Clear terminal
  /provider  Show providers
  /settings  Open settings
  /status    Show status

Type any message to chat with AI.
```

### `/clear` - Clear Terminal
Clears all terminal output, keeping only the input line.

```
$ /clear
[Terminal cleared]
$ 
```

### `/provider` - Provider Management
Shows information about AI providers.

```
$ /provider
Available providers:
  openai: OpenAI ✅
  anthropic: Anthropic Claude ❌
  google: Google AI (Gemini) ❌

$ /provider openai
Provider: OpenAI
Status: ✅ Connected
Model: gpt-4
Last verified: 2024-01-15 10:30:00
```

### `/settings` - Open Settings
Opens the Obsius plugin settings tab.

```
$ /settings
Settings opened
```

### `/status` - System Status
Shows current system status and configuration.

```
$ /status
System Status:
Current provider: OpenAI
Authentication: ✅ Connected
Command history: 12 entries
Tools available: 4
```

## AI Chat Interface

### Natural Language Commands

Simply type your request in natural language:

```
$ create a note about TypeScript best practices
🤔 Thinking...
✅ Created note: "TypeScript Best Practices.md"
   Location: /Notes/TypeScript Best Practices.md
   Content: Comprehensive guide covering type safety, interfaces...

$ search for notes about productivity
🔍 Found 8 notes matching "productivity":
📄 Daily Productivity Tips.md
📄 Productivity Tools Review.md
📄 Getting Things Done Summary.md
...

$ update my daily note with today's achievements
🤔 Thinking...
✅ Updated note: "2024-01-15.md"
   Added section: "Today's Achievements"
   Content: Updated with your recent accomplishments...
```

### Command Examples

#### Note Management
```
$ create a meeting note for tomorrow's standup
$ read the project roadmap note
$ search for all notes tagged with #project
$ update the README with the latest features
```

#### Vault Operations
```
$ organize my notes by topic
$ find duplicate notes in my vault
$ create a summary of this week's notes
$ backup my important notes
```

#### Context-Aware Operations
```
$ summarize the current note
$ add tags to this note based on its content
$ find related notes to what I'm reading
$ create a follow-up note to this one
```

## Keyboard Navigation

### Command History
- **Arrow Up** (↑): Previous command
- **Arrow Down** (↓): Next command
- Navigate through your command history like a traditional terminal

### Tab Completion
- **Tab**: Auto-complete system commands
- Type `/h` then Tab → `/help`
- If multiple matches, shows available options

### Quick Actions
- **Enter**: Execute command
- **Escape**: Clear current input (planned)
- **Ctrl+C**: Cancel operation (planned)

## Interface Features

### Provider Status
The input placeholder shows your current AI provider:
```
$ obsius (OpenAI)
$ obsius (Claude)
$ obsius (None)  # When no provider is configured
```

### Output Formatting
- **Command Echo**: Shows executed commands with `$ ` prefix
- **Color Coding**: 
  - 🟢 Success messages (green)
  - 🔴 Error messages (red)
  - 🔵 Info messages (blue)
  - ⚪ Normal output (default)

### Visual Design
- **Monospace Font**: Terminal-like appearance
- **Theme Integration**: Adapts to Obsidian's light/dark themes
- **Sidebar Optimization**: Designed for narrow sidebar width
- **Clean Layout**: Minimal padding, subtle left border

## Configuration

### Provider Setup
1. Go to Settings → Obsius
2. Configure your preferred AI provider API key
3. Test connection using the interface
4. Provider status will update in CLI placeholder

### Language Settings
Obsius supports multiple interface languages with full localization:

#### Supported Languages
- **English** (default): Full interface support with native terminology
- **Japanese (日本語)**: Complete localization with natural expressions

#### Changing Language
1. Go to Settings → Obsius → Interface Settings
2. Select your preferred language from the dropdown
3. Interface updates immediately without requiring restart
4. All CLI commands, messages, and help text adapt to selected language

#### Localized Features
- **Command descriptions**: All `/help` output in selected language
- **Status messages**: Provider status, system information
- **Error messages**: Clear error reporting in native language
- **Date formatting**: Locale-appropriate date display
- **Terminology**: Natural language choices (e.g., "保管庫" instead of "ボルト" in Japanese)

#### Language Examples

**English Interface:**
```
✻ Welcome to Obsius v0.1.0!
Vault: MyVault
Type /help for commands or start chatting.
$ /help
Commands:
  /help      Show commands
  /clear     Clear terminal
  /provider  Show providers
  /settings  Open settings
  /status    Show status
```

**Japanese Interface (日本語):**
```
✻ Obsius v0.1.0 へようこそ！
保管庫: MyVault
コマンドは /help で確認できます。お気軽にチャットを開始してください。
$ /help
コマンド:
  /help      コマンド表示
  /clear     画面クリア
  /provider  プロバイダ表示
  /settings  設定を開く
  /status    ステータス表示
```

### Customization Options
- **Language**: English (default) or Japanese with automatic interface updates
- **Theme**: Automatic light/dark mode support (uses Obsidian's native theming)
- **History Size**: Configurable command history limit
- **Auto-scroll**: Automatic scrolling to latest output
- **Timestamps**: Optional timestamp display with locale-appropriate formatting

## Tips and Best Practices

### Effective Commands
- **Be Specific**: "Create a note about React hooks" vs. "Create a note"
- **Use Context**: "Update this note" when you have a note open
- **Combine Operations**: "Search for productivity notes and create a summary"

### Command History Usage
- Use arrow keys to recall previous commands
- Modify and re-execute similar commands
- Build on previous successful operations

### Error Handling
- Check provider authentication with `/status`
- Use `/provider` to verify API key configuration
- Clear terminal with `/clear` if output gets cluttered

## Troubleshooting

### Common Issues

#### "No authenticated AI provider available"
```
$ create a new note
Error: No authenticated AI provider available
Use /provider to check provider status or /settings to configure
```
**Solution**: Configure API key in settings

#### Command not recognized
```
$ /unknown
Unknown command: /unknown
Type /help for available commands
```
**Solution**: Use `/help` to see available commands

#### Slow responses
- Check internet connection
- Verify API key is valid
- Try switching providers with `/provider`

### Getting Help

1. **Built-in Help**: Use `/help` for command reference
2. **System Status**: Use `/status` to check configuration
3. **Provider Info**: Use `/provider` to verify authentication
4. **Settings**: Use `/settings` to reconfigure

## Advanced Usage

### Scripting-like Operations
```
$ create daily template note
$ search for all incomplete tasks
$ organize notes by creation date
$ generate project status report
```

### Workflow Integration
```
$ process inbox notes
$ create weekly review note
$ update project tracker
$ sync with external tools
```

### Custom Workflows (Future)
- Planned support for user-defined command aliases
- Saved command sequences
- Templated operations

---

The CLI interface is designed to be intuitive for both terminal users and newcomers, providing powerful AI-assisted vault management through simple, natural language commands.