# UI/UX Specification

This document defines the user interface and user experience design for the Obsius AI assistant integrated into Obsidian's right sidebar.

## Overall Design Philosophy

- **CLI-inspired Interface**: Familiar command-line aesthetic with modern UI elements
- **Non-intrusive Integration**: Seamlessly fits into Obsidian's existing UI paradigm
- **Contextual Awareness**: Automatically considers current note and workspace context
- **Progressive Disclosure**: Advanced features available but not overwhelming

## Right Sidebar Integration

### Panel Structure

```
┌─ Right Sidebar ─────────────────────────┐
│ ┌─ Obsius AI ─┐                        │
│ │ ● ○ ○       │  [Minimize] [Settings] │
│ └─────────────┘                        │
│                                        │
│ ┌─ Chat History ─────────────────────┐  │
│ │ [Scrollable message history]      │  │
│ │                                   │  │
│ │ > create note about AI trends     │  │
│ │ ✓ Created "AI Trends 2024.md"    │  │
│ │   with 3 external links          │  │
│ │                                   │  │
│ │ > link this to machine learning   │  │
│ │ ✓ Added bidirectional links      │  │
│ │   between 2 notes                │  │
│ │                                   │  │
│ └───────────────────────────────────┘  │
│                                        │
│ ┌─ Command Input ────────────────────┐  │
│ │ > █                               │  │
│ └───────────────────────────────────┘  │
│                                        │
│ ┌─ Context Info ─────────────────────┐  │
│ │ 📄 Current: "My Research Notes"   │  │
│ │ 📁 Vault: 247 notes              │  │
│ │ 🔗 Links: 1,432 connections      │  │
│ └───────────────────────────────────┘  │
│                                        │
│ ┌─ Quick Actions ────────────────────┐  │
│ │ [📝 New Note] [🔗 Link Notes]     │  │
│ │ [🌐 Research] [📋 Summarize]      │  │
│ └───────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Panel States

1. **Collapsed State**
   - Minimal width (40px)
   - Icon-only interface
   - Hover to show tooltip

2. **Default State**
   - Standard width (320px)
   - Full interface visible
   - Resizable by dragging edge

3. **Expanded State**
   - Wide width (450px)
   - Enhanced message display
   - Side-by-side tool outputs

## CLI-Style Interface Design

### Command Prompt

```
> █
```

**Features**:
- Blinking cursor for active input
- Command history (↑/↓ arrows)
- Auto-completion with Tab
- Multi-line input support (Shift+Enter)
- Syntax highlighting for commands

### Message Display

#### User Messages
```
> create a note about quantum computing with references

◷ Processing... (with spinner)
```

#### AI Responses
```
✓ I'll create a comprehensive note about quantum computing and find relevant references.

📝 Creating note: "Quantum Computing Overview.md"
🔍 Searching for references...
🌐 Found 5 relevant sources
🔗 Adding internal links to related notes

✅ Complete! Created note with:
   • 1,200 words of content
   • 5 external references  
   • 3 internal links to existing notes
   • 2 new tags: #quantum #computing

📎 Note: "Quantum Computing Overview.md"
```

#### Tool Execution Display
```
🛠️ Using tool: create_note
   ├─ Path: "Quantum Computing Overview.md"
   ├─ Content: 1,200 words
   └─ Tags: #quantum, #computing

🛠️ Using tool: web_search
   ├─ Query: "quantum computing recent advances 2024"
   ├─ Found: 12 results
   └─ Selected: 5 high-quality sources

🛠️ Using tool: create_links
   ├─ Source: "Quantum Computing Overview.md"
   ├─ Targets: "Machine Learning.md", "Physics Notes.md"
   └─ Type: Bidirectional links
```

### Visual Elements

#### Status Indicators
- `◷` Processing/Thinking
- `✓` Success
- `✗` Error
- `⚠️` Warning
- `🔄` In Progress
- `⏸️` Waiting for user input

#### Category Icons
- `📝` Note operations
- `🔗` Link operations
- `🌐` Web research
- `🔍` Search operations
- `📁` Folder operations
- `🏷️` Tag operations
- `📊` Analytics/Stats

#### Progress Indicators
```
📝 Creating note... ████████████████████ 100%
🔍 Searching web... ████████░░░░░░░░░░░░ 60%
🔗 Linking notes... ██░░░░░░░░░░░░░░░░░░ 10%
```

## User Interaction Patterns

### Command Input Methods

1. **Natural Language Commands**
   ```
   > create a note about machine learning algorithms
   > find all notes related to AI and link them
   > research recent developments in quantum computing
   > summarize the current note
   ```

2. **Slash Commands**
   ```
   > /create "New Note Title" --tags ai,research
   > /link from="Note A" to="Note B" --bidirectional
   > /search "quantum computing" --scope=vault
   > /web-search "AI trends 2024" --save-to="Research"
   ```

3. **Quick Actions**
   - Click buttons for common operations
   - Drag and drop files onto panel
   - Right-click context menu integration

### Confirmation Workflows

#### Simple Confirmation
```
🛠️ About to create note: "AI Ethics Discussion.md"
   
   Continue? [Y/n] █
```

#### Detailed Confirmation
```
🛠️ About to perform multiple operations:

   1. Create note: "Machine Learning Basics.md"
   2. Add content from 3 web sources
   3. Create links to 5 existing notes
   4. Add tags: #ml, #ai, #fundamentals

   This will modify your vault. Continue? [Y/n] █
```

#### Batch Operation Confirmation
```
🛠️ Batch operation requested:
   
   ├─ Create 5 new notes
   ├─ Add 23 internal links  
   ├─ Fetch content from 8 web sources
   └─ Estimated time: 2-3 minutes

   Proceed with batch operation? [Y/n] █
```

### Error Handling Display

#### Recoverable Errors
```
⚠️ Warning: Note "AI Basics.md" already exists
   
   Options:
   1. Append to existing note
   2. Create with different name
   3. Overwrite (destructive)
   
   Choose [1-3]: █
```

#### Non-recoverable Errors
```
✗ Error: Failed to access web resource
   
   Details: Connection timeout (30s)
   URL: https://example.com/research-paper
   
   Suggestions:
   • Check internet connection
   • Try alternative source
   • Skip this reference
   
   > █
```

## Context Display

### Current Context Panel
```
┌─ Context ──────────────────────────┐
│ 📄 Active: "Research Notes.md"    │
│ 📁 Folder: /Projects/AI Research  │
│ 🏷️ Tags: #ai, #research, #draft   │
│ 🔗 Links: 7 outgoing, 3 incoming  │
│ 📊 Words: 1,247 | Chars: 7,856    │
└────────────────────────────────────┘
```

### Vault Statistics
```
┌─ Vault Overview ───────────────────┐
│ 📊 Total Notes: 247               │
│ 🔗 Total Links: 1,432             │
│ 🏷️ Total Tags: 89                 │
│ 📁 Folders: 12                    │
│ 📈 Growth: +15 notes this week    │
└────────────────────────────────────┘
```

### Recent Activity
```
┌─ Recent Activity ──────────────────┐
│ 📝 Created "Quantum AI.md" (2m)   │
│ 🔗 Linked 3 notes (5m)            │
│ 🌐 Researched "ML papers" (8m)    │
│ 📝 Updated "Index.md" (12m)       │
└────────────────────────────────────┘
```

## Responsive Design

### Narrow Width (< 300px)
- Single column layout
- Collapsed context info
- Icon-only quick actions
- Abbreviated messages

### Standard Width (300-400px)
- Default layout
- Full feature set
- Comfortable reading width

### Wide Width (> 400px)
- Enhanced message display
- Side-by-side tool outputs
- Extended context information
- Additional quick actions

## Accessibility Features

### Keyboard Navigation
- `Tab` - Navigate between elements
- `Shift+Tab` - Navigate backwards
- `Enter` - Execute command/confirm
- `Escape` - Cancel operation
- `↑/↓` - Command history
- `Ctrl+L` - Clear chat history

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for all interactive elements
- Status announcements for tool execution
- Progress updates with aria-live regions

### Visual Accessibility
- High contrast mode support
- Customizable font sizes
- Color-blind friendly status indicators
- Reduced motion support

## Theming and Customization

### Theme Integration
- Automatically inherit Obsidian's theme
- Support for custom CSS styling
- Dark/light mode compatibility
- Custom color schemes

### Layout Customization
- Adjustable panel width
- Collapsible sections
- Reorderable quick actions
- Customizable context display

### Behavior Settings
- Auto-scroll to new messages
- Notification preferences
- Command history length
- Auto-save frequency

## Performance Considerations

### Lazy Loading
- Load message history on demand
- Progressive rendering for long conversations
- Virtualized scrolling for large histories

### Memory Management
- Automatic cleanup of old messages
- Efficient React component updates
- Debounced user input handling

### Responsiveness
- Non-blocking UI during tool execution
- Streaming response display
- Interruptible long-running operations

## Future Enhancements

### Advanced Features
- Voice input support
- Multi-session management
- Collaborative editing indicators
- Plugin ecosystem integration

### Enhanced Visualization
- Graph view integration
- Link visualization
- Progress animations
- Rich media support

### Smart Features
- Predictive text suggestions
- Context-aware recommendations
- Automated workflow detection
- Learning user preferences