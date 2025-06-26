# Tool Definitions and Workflows

This document defines all available tools, their parameters, workflows, and implementation details for the Obsius AI assistant.

## Tool Categories

### 1. Obsidian Core Tools
- Note management (create, read, update, delete)
- Link management (create, update, analyze)
- Vault operations (search, navigate, organize)
- Metadata operations (tags, properties, cache)

### 2. Web Research Tools
- Web search and content retrieval
- Content extraction and processing
- Citation management
- Source validation

### 3. Content Enhancement Tools
- Text processing and improvement
- Summarization and analysis
- Template application
- Format conversion

### 4. System Integration Tools
- File system operations
- External tool integration
- Data import/export
- Backup and sync operations

## Obsidian Core Tools

### create_note

**Purpose**: Create a new note in the Obsidian vault

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "The title of the note"
    },
    "content": {
      "type": "string", 
      "description": "The main content of the note"
    },
    "path": {
      "type": "string",
      "description": "Optional custom path for the note",
      "default": "auto-generated from title"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Tags to add to the note"
    },
    "template": {
      "type": "string",
      "description": "Template to use for note structure"
    },
    "frontmatter": {
      "type": "object",
      "description": "Additional frontmatter properties"
    }
  },
  "required": ["title", "content"]
}
```

**Workflow**:
1. Validate title and content
2. Generate appropriate file path
3. Check for existing file conflicts
4. Apply template if specified
5. Generate frontmatter with tags and metadata
6. Create file in vault
7. Return creation status and file info

**Confirmation Required**: When file already exists

**Example Usage**:
```
> create a note about machine learning fundamentals

🛠️ Using tool: create_note
   ├─ Title: "Machine Learning Fundamentals"
   ├─ Content: 2,400 words
   ├─ Tags: #ai, #machine-learning, #fundamentals
   └─ Template: research-note

✅ Created note: "Machine Learning Fundamentals.md"
```

### read_note

**Purpose**: Read content from an existing note

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the note file"
    },
    "title": {
      "type": "string", 
      "description": "Alternative: note title for lookup"
    },
    "section": {
      "type": "string",
      "description": "Specific section to read"
    },
    "start_line": {
      "type": "integer",
      "description": "Start reading from specific line"
    },
    "end_line": {
      "type": "integer", 
      "description": "Stop reading at specific line"
    }
  },
  "anyOf": [
    { "required": ["path"] },
    { "required": ["title"] }
  ]
}
```

**Workflow**:
1. Resolve note by path or title
2. Validate file exists and is readable
3. Read specified content range
4. Parse frontmatter and metadata
5. Return content with metadata

**Confirmation Required**: Never (read-only operation)

### update_note

**Purpose**: Update content in an existing note

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the note file"
    },
    "title": {
      "type": "string",
      "description": "Alternative: note title for lookup"
    },
    "operation": {
      "type": "string",
      "enum": ["replace", "append", "prepend", "insert", "section_replace"],
      "description": "Type of update operation"
    },
    "content": {
      "type": "string",
      "description": "New content to add or replace"
    },
    "section": {
      "type": "string", 
      "description": "Section name for section operations"
    },
    "position": {
      "type": "integer",
      "description": "Line position for insert operations"
    },
    "backup": {
      "type": "boolean",
      "description": "Create backup before updating",
      "default": true
    }
  },
  "required": ["operation", "content"],
  "anyOf": [
    { "required": ["path"] },
    { "required": ["title"] }
  ]
}
```

**Workflow**:
1. Resolve note by path or title
2. Create backup if requested
3. Read current content
4. Apply specified operation
5. Validate updated content
6. Write changes to file
7. Return update status

**Confirmation Required**: Always (modifies content)

### create_link

**Purpose**: Create links between notes

**Parameters**:
```json
{
  "type": "object", 
  "properties": {
    "source_note": {
      "type": "string",
      "description": "Source note path or title"
    },
    "target_note": {
      "type": "string",
      "description": "Target note path or title"
    },
    "link_text": {
      "type": "string",
      "description": "Custom display text for the link"
    },
    "bidirectional": {
      "type": "boolean",
      "description": "Create bidirectional link",
      "default": true
    },
    "section": {
      "type": "string",
      "description": "Section in source note to add link"
    },
    "context": {
      "type": "string",
      "description": "Surrounding context for the link"
    }
  },
  "required": ["source_note", "target_note"]
}
```

**Workflow**:
1. Resolve both source and target notes
2. Determine optimal link placement
3. Generate appropriate link text
4. Insert link in source note
5. Create backlink if bidirectional
6. Update link cache and metadata
7. Return linking status

**Confirmation Required**: When modifying multiple files

### search_notes

**Purpose**: Search for notes in the vault

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "search_type": {
      "type": "string",
      "enum": ["content", "title", "tags", "all"],
      "description": "Type of search to perform",
      "default": "all"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by specific tags"
    },
    "folder": {
      "type": "string", 
      "description": "Limit search to specific folder"
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of results",
      "default": 20
    },
    "sort_by": {
      "type": "string",
      "enum": ["relevance", "modified", "created", "title"],
      "description": "Sort order for results",
      "default": "relevance"
    }
  },
  "required": ["query"]
}
```

**Workflow**:
1. Parse search query and filters
2. Search across specified content types
3. Apply tag and folder filters
4. Rank results by relevance/criteria
5. Return formatted search results

**Confirmation Required**: Never (read-only operation)

### analyze_links

**Purpose**: Analyze link relationships in the vault

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "note": {
      "type": "string",
      "description": "Specific note to analyze (optional)"
    },
    "analysis_type": {
      "type": "string",
      "enum": ["incoming", "outgoing", "orphans", "hubs", "clusters"],
      "description": "Type of link analysis"
    },
    "depth": {
      "type": "integer",
      "description": "Analysis depth for relationship mapping",
      "default": 2
    },
    "min_connections": {
      "type": "integer",
      "description": "Minimum connections for hub analysis",
      "default": 5
    }
  },
  "required": ["analysis_type"]
}
```

**Workflow**:
1. Build link graph from vault
2. Apply specified analysis algorithm
3. Calculate metrics and relationships
4. Generate insights and recommendations
5. Return analysis results

**Confirmation Required**: Never (read-only operation)

## Web Research Tools

### web_search

**Purpose**: Search the web for information

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "num_results": {
      "type": "integer",
      "description": "Number of results to return",
      "default": 5
    },
    "source_types": {
      "type": "array",
      "items": {
        "type": "string", 
        "enum": ["academic", "news", "blogs", "documentation", "all"]
      },
      "description": "Types of sources to include",
      "default": ["all"]
    },
    "date_range": {
      "type": "string",
      "enum": ["day", "week", "month", "year", "all"],
      "description": "Date range for results",
      "default": "all"
    },
    "language": {
      "type": "string",
      "description": "Language preference for results",
      "default": "en"
    }
  },
  "required": ["query"]
}
```

**Workflow**:
1. Construct search query with filters
2. Execute search via multiple engines
3. Deduplicate and rank results
4. Extract metadata and summaries
5. Return formatted search results

**Confirmation Required**: Never (read-only operation)

### web_fetch

**Purpose**: Fetch and extract content from web pages

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "URL to fetch content from"
    },
    "extract_type": {
      "type": "string",
      "enum": ["article", "full_text", "metadata", "pdf", "all"],
      "description": "Type of content to extract",
      "default": "article"
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "plain_text", "html"],
      "description": "Output format",
      "default": "markdown"
    },
    "include_images": {
      "type": "boolean",
      "description": "Include image references",
      "default": false
    },
    "max_length": {
      "type": "integer",
      "description": "Maximum content length in characters",
      "default": 10000
    }
  },
  "required": ["url"]
}
```

**Workflow**:
1. Validate URL and check accessibility
2. Fetch page content
3. Extract relevant information
4. Convert to requested format
5. Return processed content with metadata

**Confirmation Required**: Never (read-only operation)

### research_topic

**Purpose**: Comprehensive research on a topic with note creation

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "topic": {
      "type": "string",
      "description": "Research topic"
    },
    "scope": {
      "type": "string",
      "enum": ["overview", "deep_dive", "recent_developments", "comparative"],
      "description": "Research scope and depth"
    },
    "source_limit": {
      "type": "integer",
      "description": "Maximum number of sources to research",
      "default": 10
    },
    "create_note": {
      "type": "boolean",
      "description": "Create research note with findings",
      "default": true
    },
    "note_title": {
      "type": "string",
      "description": "Custom title for research note"
    },
    "include_citations": {
      "type": "boolean", 
      "description": "Include source citations",
      "default": true
    }
  },
  "required": ["topic"]
}
```

**Workflow**:
1. Plan research strategy based on topic and scope
2. Execute web searches for relevant information
3. Fetch and process source content
4. Synthesize findings into coherent research
5. Create formatted note with citations
6. Return research summary and note info

**Confirmation Required**: When creating notes

## Content Enhancement Tools

### enhance_note

**Purpose**: Improve existing note content

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "note": {
      "type": "string",
      "description": "Note path or title to enhance"
    },
    "enhancement_types": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["expand_content", "improve_structure", "add_examples", "update_info", "fix_grammar", "add_citations"]
      },
      "description": "Types of enhancements to apply"
    },
    "section": {
      "type": "string",
      "description": "Specific section to enhance (optional)"
    },
    "research_updates": {
      "type": "boolean",
      "description": "Include recent research findings",
      "default": true
    },
    "preserve_style": {
      "type": "boolean",
      "description": "Maintain original writing style",
      "default": true
    }
  },
  "required": ["note", "enhancement_types"]
}
```

**Workflow**:
1. Read and analyze current note content
2. Identify enhancement opportunities
3. Research additional information if needed
4. Apply requested enhancements
5. Preserve original structure and style
6. Update note with improved content
7. Return enhancement summary

**Confirmation Required**: Always (modifies content)

### summarize_content

**Purpose**: Create summaries of notes or external content

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "description": "Source content (note path, URL, or direct text)"
    },
    "source_type": {
      "type": "string",
      "enum": ["note", "url", "text", "multiple_notes"],
      "description": "Type of source content"
    },
    "summary_type": {
      "type": "string",
      "enum": ["abstract", "key_points", "action_items", "overview"],
      "description": "Type of summary to create"
    },
    "length": {
      "type": "string", 
      "enum": ["brief", "medium", "detailed"],
      "description": "Summary length",
      "default": "medium"
    },
    "create_note": {
      "type": "boolean",
      "description": "Create new note with summary",
      "default": false
    },
    "note_title": {
      "type": "string",
      "description": "Title for summary note"
    }
  },
  "required": ["source", "source_type", "summary_type"]
}
```

**Workflow**:
1. Read and process source content
2. Extract key information based on summary type
3. Generate structured summary
4. Create note if requested
5. Return summary content and note info

**Confirmation Required**: When creating notes

### apply_template

**Purpose**: Apply template structure to notes

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "note": {
      "type": "string",
      "description": "Target note path or title"
    },
    "template": {
      "type": "string",
      "description": "Template name or path"
    },
    "merge_strategy": {
      "type": "string",
      "enum": ["replace", "merge", "append"],
      "description": "How to combine template with existing content"
    },
    "preserve_content": {
      "type": "boolean",
      "description": "Preserve existing content",
      "default": true
    },
    "variables": {
      "type": "object",
      "description": "Template variables to substitute"
    }
  },
  "required": ["note", "template"]
}
```

**Workflow**:
1. Load template structure
2. Read existing note content
3. Apply merge strategy
4. Substitute template variables
5. Update note with templated content
6. Return application status

**Confirmation Required**: When modifying existing content

## System Integration Tools

### list_files

**Purpose**: List files in vault or specific directories

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Directory path to list",
      "default": "vault root"
    },
    "file_types": {
      "type": "array",
      "items": { "type": "string" },
      "description": "File extensions to include",
      "default": [".md"]
    },
    "recursive": {
      "type": "boolean",
      "description": "Include subdirectories",
      "default": false
    },
    "sort_by": {
      "type": "string",
      "enum": ["name", "modified", "created", "size"],
      "description": "Sort order",
      "default": "name"
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of files to return"
    }
  }
}
```

**Workflow**:
1. Resolve target directory path
2. Scan for files matching criteria
3. Apply sorting and filtering
4. Return formatted file list

**Confirmation Required**: Never (read-only operation)

### export_notes

**Purpose**: Export notes in various formats

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "notes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Notes to export (paths or titles)"
    },
    "format": {
      "type": "string",
      "enum": ["pdf", "html", "docx", "epub", "json"],
      "description": "Export format"
    },
    "output_path": {
      "type": "string",
      "description": "Output file path"
    },
    "include_links": {
      "type": "boolean",
      "description": "Preserve internal links",
      "default": true
    },
    "include_metadata": {
      "type": "boolean",
      "description": "Include frontmatter and metadata",
      "default": true
    }
  },
  "required": ["notes", "format", "output_path"]
}
```

**Workflow**:
1. Collect specified notes
2. Process links and metadata
3. Convert to target format
4. Generate export file
5. Return export status and file path

**Confirmation Required**: Always (creates files outside vault)

## Workflow Patterns

### Batch Operations

Many tools support batch operations for efficiency:

```typescript
interface BatchOperation {
  operation: string;
  parameters: unknown;
  parallel?: boolean;
  dependency?: string; // Previous operation ID
}

interface BatchRequest {
  operations: BatchOperation[];
  stop_on_error?: boolean;
  max_parallel?: number;
}
```

**Example Batch Workflow**:
```
> research "quantum computing" and create comprehensive notes with links

🛠️ Batch operation started:
   1. web_search: "quantum computing fundamentals"
   2. web_search: "quantum computing applications 2024"  
   3. create_note: "Quantum Computing Overview"
   4. enhance_note: Add research findings
   5. create_link: Link to related physics notes
   
Progress: ████████████████████ 100% (5/5 complete)
```

### Progressive Enhancement

Tools can work together in progressive enhancement workflows:

1. **Initial Creation** - Basic note structure
2. **Content Addition** - Research and expand content  
3. **Link Integration** - Connect to existing notes
4. **Quality Enhancement** - Improve structure and style
5. **Maintenance** - Periodic updates and improvements

### Error Recovery

All tools implement consistent error recovery:

1. **Validation Errors** - Parameter validation with suggestions
2. **Permission Errors** - User confirmation requests
3. **Network Errors** - Retry with exponential backoff
4. **Content Errors** - Partial success with error details
5. **System Errors** - Graceful degradation with alternatives

### Tool Chaining

Tools can be chained together for complex workflows:

```
create_note → research_topic → enhance_note → create_link → summarize_content
```

Each tool in the chain receives context from previous operations, enabling sophisticated automation while maintaining user control through confirmations.

## Tool Development Guidelines

### Implementation Requirements

1. **Parameter Validation** - Strict JSON schema validation
2. **Error Handling** - Comprehensive error types and recovery
3. **Progress Reporting** - Real-time status updates for long operations
4. **Cancellation Support** - Ability to interrupt long-running operations
5. **Resource Management** - Proper cleanup and memory management

### Testing Requirements

1. **Unit Tests** - Individual tool function testing
2. **Integration Tests** - Tool interaction with Obsidian API
3. **Performance Tests** - Large vault and batch operation testing
4. **Error Tests** - Error condition and recovery testing
5. **User Acceptance Tests** - End-to-end workflow validation

### Documentation Requirements

1. **Parameter Documentation** - Complete JSON schema with examples
2. **Workflow Documentation** - Step-by-step operation descriptions
3. **Error Documentation** - Error types and resolution strategies
4. **Example Documentation** - Common use cases and command examples
5. **API Documentation** - Integration points and extension methods