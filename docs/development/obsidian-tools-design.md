# Obsidian特化ツールセット設計書

## 概要

GeminiCLIのツール設計パターンを参考に、Obsidian特化の包括的なツールセットを設計します。リスク評価、バリデーション、ユーザー確認フローを統合した安全で強力なツールエコシステムを構築します。

## 起動時表示

### ASCIIアートバナー

```typescript
// src/utils/banner.ts
export const OBSIUS_BANNER = `
 ___  _         _           
/ _ \\| |__  ___(_)_   _ ___ 
| | | | '_ \\/ __| | | | / __|
| |_| | |_) \\__ \\ | |_| \\__ \\
 \\___/|_.__/|___/_|\\__,_|___/
                             
🤖 Obsidian AI Agent v{VERSION}
Knowledge Management Powered by AI
`;

export function displayBanner(version: string = '0.1.0'): void {
  const banner = OBSIUS_BANNER.replace('{VERSION}', version);
  
  // Obsidianプラグインでは console.log でバナー表示
  console.log('%c' + banner, 'font-family: "Courier New", "Monaco", "Menlo", monospace; font-weight: bold; color: #7c3aed;');
  
  // 追加情報
  console.log('%cReady to assist with your knowledge management! 🚀', 'font-family: monospace; color: #059669;');
  console.log('%cType your instructions in natural language to get started.', 'font-family: monospace; color: #6b7280;');
}
```

### プラグイン起動時の統合

```typescript
// src/main.ts
export default class ObsiusPlugin extends Plugin {
  async onload() {
    // 起動バナー表示
    displayBanner(this.manifest.version);
    
    console.log('🔧 Initializing Obsius components...');
    
    // 各種初期化...
    await this.initializeServices();
    
    console.log('✅ Obsius is ready!');
  }
}
```

## ツールアーキテクチャ設計

### 基底クラス設計

```typescript
// src/core/tools/ObsidianBaseTool.ts
export abstract class ObsidianBaseTool<TParams = unknown, TResult extends ToolResult = ToolResult> {
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string,
    public readonly parameterSchema: Record<string, unknown>,
    protected app: App,
    protected vault: Vault,
    public readonly category: ObsidianToolCategory,
    public readonly riskLevel: ToolRiskLevel = ToolRiskLevel.MEDIUM,
    public readonly requiresConfirmation: boolean = false
  ) {}

  // GeminiCLI風のスキーマ定義
  get schema(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: this.parameterSchema.properties || {},
        required: this.parameterSchema.required || []
      } as Schema
    };
  }

  // バリデーション（GeminiCLIパターン）
  validateToolParams(params: TParams): string | null {
    // 1. 基本パラメータ検証
    if (!params || typeof params !== 'object') {
      return 'Invalid parameters: expected object';
    }

    // 2. Obsidianコンテキスト検証
    const contextError = this.validateObsidianContext();
    if (contextError) return contextError;

    // 3. 具象クラス固有の検証
    return this.validateSpecificParams(params);
  }

  // リスク評価（GeminiCLIパターン）
  async shouldConfirmExecute(
    params: TParams, 
    signal?: AbortSignal
  ): Promise<ObsidianToolConfirmationDetails | false> {
    // 低リスクの操作は確認不要
    if (this.riskLevel === ToolRiskLevel.LOW && !this.requiresConfirmation) {
      return false;
    }

    // 具象クラスでの詳細確認ロジック
    return await this.getConfirmationDetails(params);
  }

  // 実行（GeminiCLIパターン）
  async execute(
    params: TParams, 
    signal?: AbortSignal,
    updateOutput?: (content: string) => void
  ): Promise<TResult> {
    try {
      // 1. 実行前チェック
      const validationError = this.validateToolParams(params);
      if (validationError) {
        return this.createErrorResult(validationError) as TResult;
      }

      // 2. 実行
      updateOutput?.(`🔄 Executing ${this.displayName}...`);
      const result = await this.executeImpl(params, signal, updateOutput);
      
      // 3. 成功結果
      updateOutput?.(`✅ ${this.displayName} completed successfully`);
      return result;

    } catch (error) {
      // 4. エラーハンドリング
      return this.handleExecutionError(error, params) as TResult;
    }
  }

  // 抽象メソッド
  protected abstract validateSpecificParams(params: TParams): string | null;
  protected abstract getConfirmationDetails(params: TParams): Promise<ObsidianToolConfirmationDetails | false>;
  protected abstract executeImpl(params: TParams, signal?: AbortSignal, updateOutput?: (content: string) => void): Promise<TResult>;

  // ユーティリティメソッド
  protected validateObsidianContext(): string | null {
    if (!this.app) return 'Obsidian app context not available';
    if (!this.vault) return 'Obsidian vault not available';
    return null;
  }

  protected createErrorResult(message: string): ToolResult {
    return {
      success: false,
      llmContent: `Error: ${message}`,
      returnDisplay: `❌ ${message}`,
      data: { error: message }
    };
  }

  protected handleExecutionError(error: unknown, params: TParams): ToolResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Tool ${this.name} execution error:`, error);
    
    return {
      success: false,
      llmContent: `Tool execution failed: ${errorMessage}`,
      returnDisplay: `❌ ${this.displayName} failed: ${errorMessage}`,
      data: { 
        error: errorMessage,
        params,
        toolName: this.name
      }
    };
  }
}
```

### ツールカテゴリと型定義

```typescript
// src/types/tools.ts
export enum ObsidianToolCategory {
  NOTE_OPERATIONS = 'note_operations',
  VAULT_MANAGEMENT = 'vault_management', 
  SEARCH_ANALYSIS = 'search_analysis',
  LINK_MANAGEMENT = 'link_management',
  METADATA_OPERATIONS = 'metadata_operations',
  CONTENT_GENERATION = 'content_generation',
  PLUGIN_INTEGRATION = 'plugin_integration',
  EXPORT_IMPORT = 'export_import'
}

export enum ToolRiskLevel {
  LOW = 'low',        // 読み取り専用
  MEDIUM = 'medium',  // ファイル作成・編集
  HIGH = 'high',      // ファイル削除・大量操作
  CRITICAL = 'critical' // システム設定変更
}

export interface ObsidianToolConfirmationDetails {
  type: 'obsidian_operation';
  title: string;
  message: string;
  riskLevel: ToolRiskLevel;
  affectedFiles: string[];
  previewContent?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

export enum ToolConfirmationOutcome {
  PROCEED_ONCE = 'proceed_once',
  PROCEED_ALWAYS = 'proceed_always', 
  CANCEL = 'cancel'
}

export interface ToolResult {
  success: boolean;
  llmContent: string;      // LLMへのメッセージ
  returnDisplay: string;   // ユーザー向け表示
  data?: any;             // 追加データ
  filesChanged?: string[]; // 変更されたファイル
}
```

## 具体的ツール実装

### 1. ノート操作ツール

#### CreateNoteTool

```typescript
// src/core/tools/note/CreateNoteTool.ts
export interface CreateNoteParams {
  title: string;
  content: string;
  folder?: string;
  tags?: string[];
  template?: string;
  openAfterCreation?: boolean;
}

export class CreateNoteTool extends ObsidianBaseTool<CreateNoteParams> {
  constructor(app: App, vault: Vault) {
    super(
      'create_note',
      'Create Note',
      'Creates a new note in the Obsidian vault with specified content and metadata',
      {
        properties: {
          title: { 
            type: 'string', 
            description: 'Note title (will be used as filename)' 
          },
          content: { 
            type: 'string', 
            description: 'Note content in markdown format' 
          },
          folder: { 
            type: 'string', 
            description: 'Folder path where to create the note (optional)' 
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Tags to apply to the note' 
          },
          template: { 
            type: 'string', 
            description: 'Template name to apply (optional)' 
          },
          openAfterCreation: { 
            type: 'boolean', 
            description: 'Whether to open the note after creation',
            default: false
          }
        },
        required: ['title', 'content']
      },
      app,
      vault,
      ObsidianToolCategory.NOTE_OPERATIONS,
      ToolRiskLevel.MEDIUM
    );
  }

  protected validateSpecificParams(params: CreateNoteParams): string | null {
    if (!params.title?.trim()) {
      return 'Note title cannot be empty';
    }

    if (params.title.includes('/')) {
      return 'Note title cannot contain forward slashes. Use folder parameter instead.';
    }

    if (params.folder && !params.folder.match(/^[^<>:"|?*]+$/)) {
      return 'Invalid folder path: contains illegal characters';
    }

    return null;
  }

  protected async getConfirmationDetails(params: CreateNoteParams): Promise<ObsidianToolConfirmationDetails | false> {
    const notePath = this.buildNotePath(params);
    const existingFile = this.vault.getAbstractFileByPath(notePath);
    
    if (existingFile) {
      return {
        type: 'obsidian_operation',
        title: 'Confirm Note Creation',
        message: `A note named "${params.title}" already exists at ${notePath}. Do you want to overwrite it?`,
        riskLevel: ToolRiskLevel.HIGH,
        affectedFiles: [notePath],
        previewContent: params.content.substring(0, 200) + '...',
        onConfirm: async (outcome) => {
          if (outcome === ToolConfirmationOutcome.PROCEED_ALWAYS) {
            // 今後同じパターンを自動承認
            console.log('Note overwrite always approved for future operations');
          }
        }
      };
    }

    return false;
  }

  protected async executeImpl(
    params: CreateNoteParams, 
    signal?: AbortSignal,
    updateOutput?: (content: string) => void
  ): Promise<ToolResult> {
    const notePath = this.buildNotePath(params);
    
    updateOutput?.(`📝 Creating note "${params.title}"...`);

    try {
      // 1. フォルダ作成（必要に応じて）
      if (params.folder) {
        await this.ensureFolderExists(params.folder);
      }

      // 2. コンテンツ準備
      let finalContent = params.content;
      
      // テンプレート適用
      if (params.template) {
        finalContent = await this.applyTemplate(params.template, finalContent, params);
      }

      // タグ追加（フロントマター形式）
      if (params.tags && params.tags.length > 0) {
        finalContent = this.addFrontmatterTags(finalContent, params.tags);
      }

      // 3. ファイル作成
      updateOutput?.(`💾 Writing to ${notePath}...`);
      const file = await this.vault.create(notePath, finalContent);

      // 4. 作成後アクション
      if (params.openAfterCreation) {
        updateOutput?.(`📖 Opening note...`);
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(file);
      }

      return {
        success: true,
        llmContent: `Successfully created note "${params.title}" at ${notePath}`,
        returnDisplay: `✅ Created note "${params.title}"\n📍 Location: ${notePath}\n📏 Size: ${finalContent.length} characters`,
        data: {
          notePath,
          noteSize: finalContent.length,
          tagsApplied: params.tags || [],
          templateUsed: params.template
        },
        filesChanged: [notePath]
      };

    } catch (error) {
      if (error.message.includes('already exists')) {
        return this.createErrorResult(`Note "${params.title}" already exists. Use update_note to modify existing notes.`);
      }
      throw error;
    }
  }

  private buildNotePath(params: CreateNoteParams): string {
    const fileName = `${params.title}.md`;
    return params.folder ? `${params.folder}/${fileName}` : fileName;
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.vault.createFolder(folderPath);
    }
  }

  private async applyTemplate(templateName: string, content: string, params: CreateNoteParams): Promise<string> {
    // テンプレート機能の実装
    // Obsidianのテンプレートプラグインとの統合
    try {
      const templateFile = this.vault.getAbstractFileByPath(`Templates/${templateName}.md`);
      if (templateFile && templateFile instanceof TFile) {
        const templateContent = await this.vault.read(templateFile);
        
        // 変数置換
        let processedTemplate = templateContent
          .replace(/{{title}}/g, params.title)
          .replace(/{{date}}/g, new Date().toISOString().split('T')[0])
          .replace(/{{time}}/g, new Date().toLocaleTimeString());
        
        // コンテンツを指定位置に挿入
        if (processedTemplate.includes('{{content}}')) {
          return processedTemplate.replace(/{{content}}/g, content);
        } else {
          return processedTemplate + '\n\n' + content;
        }
      }
    } catch (error) {
      console.warn(`Template ${templateName} not found, using content as-is`);
    }
    
    return content;
  }

  private addFrontmatterTags(content: string, tags: string[]): string {
    const frontmatter = `---\ntags: [${tags.map(tag => `"${tag}"`).join(', ')}]\ncreated: ${new Date().toISOString()}\n---\n\n`;
    return frontmatter + content;
  }
}
```

#### ReadNoteTool

```typescript
// src/core/tools/note/ReadNoteTool.ts
export interface ReadNoteParams {
  notePath: string;
  includeMetadata?: boolean;
  sectionOnly?: string;
}

export class ReadNoteTool extends ObsidianBaseTool<ReadNoteParams> {
  constructor(app: App, vault: Vault) {
    super(
      'read_note',
      'Read Note',
      'Reads the content of a note from the Obsidian vault',
      {
        properties: {
          notePath: { 
            type: 'string', 
            description: 'Path to the note file (with or without .md extension)' 
          },
          includeMetadata: { 
            type: 'boolean', 
            description: 'Whether to include frontmatter and metadata',
            default: true
          },
          sectionOnly: { 
            type: 'string', 
            description: 'Read only a specific section by heading name (optional)' 
          }
        },
        required: ['notePath']
      },
      app,
      vault,
      ObsidianToolCategory.NOTE_OPERATIONS,
      ToolRiskLevel.LOW  // 読み取り専用なので低リスク
    );
  }

  protected validateSpecificParams(params: ReadNoteParams): string | null {
    if (!params.notePath?.trim()) {
      return 'Note path cannot be empty';
    }

    const normalizedPath = this.normalizePath(params.notePath);
    const file = this.vault.getAbstractFileByPath(normalizedPath);
    
    if (!file) {
      return `Note not found: ${normalizedPath}`;
    }

    if (!(file instanceof TFile)) {
      return `Path is not a file: ${normalizedPath}`;
    }

    return null;
  }

  protected async getConfirmationDetails(): Promise<ObsidianToolConfirmationDetails | false> {
    // 読み取り専用操作なので確認不要
    return false;
  }

  protected async executeImpl(
    params: ReadNoteParams,
    signal?: AbortSignal,
    updateOutput?: (content: string) => void
  ): Promise<ToolResult> {
    const normalizedPath = this.normalizePath(params.notePath);
    const file = this.vault.getAbstractFileByPath(normalizedPath) as TFile;

    updateOutput?.(`📖 Reading note "${file.basename}"...`);

    try {
      const content = await this.vault.read(file);
      
      // セクション指定がある場合
      if (params.sectionOnly) {
        const sectionContent = this.extractSection(content, params.sectionOnly);
        if (!sectionContent) {
          return this.createErrorResult(`Section "${params.sectionOnly}" not found in note`);
        }
        
        return {
          success: true,
          llmContent: `Section "${params.sectionOnly}" from note "${file.basename}":\n\n${sectionContent}`,
          returnDisplay: `📖 Read section "${params.sectionOnly}" from "${file.basename}"\n\n${sectionContent.substring(0, 200)}...`,
          data: {
            notePath: normalizedPath,
            sectionName: params.sectionOnly,
            contentLength: sectionContent.length
          }
        };
      }

      // メタデータ処理
      let processedContent = content;
      let metadata: any = {};

      if (params.includeMetadata) {
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter) {
          metadata = cache.frontmatter;
        }
      } else {
        // フロントマターを除去
        processedContent = this.removeFrontmatter(content);
      }

      return {
        success: true,
        llmContent: `Content of note "${file.basename}":\n\n${processedContent}`,
        returnDisplay: `📖 Read note "${file.basename}"\n📏 Length: ${processedContent.length} characters\n📅 Modified: ${new Date(file.stat.mtime).toLocaleString()}`,
        data: {
          notePath: normalizedPath,
          contentLength: processedContent.length,
          metadata,
          lastModified: file.stat.mtime
        }
      };

    } catch (error) {
      throw error;
    }
  }

  private normalizePath(path: string): string {
    // .md拡張子を追加（必要に応じて）
    if (!path.endsWith('.md')) {
      path += '.md';
    }
    return path;
  }

  private extractSection(content: string, sectionName: string): string | null {
    const lines = content.split('\n');
    let inSection = false;
    let sectionContent: string[] = [];
    let currentLevel = 0;

    for (const line of lines) {
      const headingMatch = line.match(/^(#+)\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        if (title.toLowerCase() === sectionName.toLowerCase()) {
          inSection = true;
          currentLevel = level;
          sectionContent.push(line);
          continue;
        }
        
        if (inSection && level <= currentLevel) {
          // 同レベル以上の見出しが出現したらセクション終了
          break;
        }
      }
      
      if (inSection) {
        sectionContent.push(line);
      }
    }

    return sectionContent.length > 0 ? sectionContent.join('\n') : null;
  }

  private removeFrontmatter(content: string): string {
    if (content.startsWith('---\n')) {
      const endIndex = content.indexOf('\n---\n', 4);
      if (endIndex !== -1) {
        return content.substring(endIndex + 5);
      }
    }
    return content;
  }
}
```

### 2. 検索・分析ツール

#### SearchNotesTool

```typescript
// src/core/tools/search/SearchNotesTool.ts
export interface SearchNotesParams {
  query: string;
  searchType?: 'content' | 'title' | 'both';
  folder?: string;
  fileType?: 'markdown' | 'all';
  limit?: number;
  includeContent?: boolean;
  caseSensitive?: boolean;
}

export class SearchNotesTool extends ObsidianBaseTool<SearchNotesParams> {
  constructor(app: App, vault: Vault) {
    super(
      'search_notes',
      'Search Notes',
      'Searches for notes in the vault based on content or title matching',
      {
        properties: {
          query: { 
            type: 'string', 
            description: 'Search query string' 
          },
          searchType: { 
            type: 'string', 
            enum: ['content', 'title', 'both'],
            description: 'What to search in: content, title, or both',
            default: 'both'
          },
          folder: { 
            type: 'string', 
            description: 'Limit search to specific folder (optional)' 
          },
          fileType: { 
            type: 'string', 
            enum: ['markdown', 'all'],
            description: 'File types to include in search',
            default: 'markdown'
          },
          limit: { 
            type: 'number', 
            description: 'Maximum number of results to return',
            default: 10,
            minimum: 1,
            maximum: 100
          },
          includeContent: { 
            type: 'boolean', 
            description: 'Whether to include content snippets in results',
            default: true
          },
          caseSensitive: { 
            type: 'boolean', 
            description: 'Whether search should be case sensitive',
            default: false
          }
        },
        required: ['query']
      },
      app,
      vault,
      ObsidianToolCategory.SEARCH_ANALYSIS,
      ToolRiskLevel.LOW
    );
  }

  protected validateSpecificParams(params: SearchNotesParams): string | null {
    if (!params.query?.trim()) {
      return 'Search query cannot be empty';
    }

    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return 'Limit must be between 1 and 100';
    }

    if (params.folder) {
      const folder = this.vault.getAbstractFileByPath(params.folder);
      if (!folder || !(folder instanceof TFolder)) {
        return `Folder not found: ${params.folder}`;
      }
    }

    return null;
  }

  protected async getConfirmationDetails(): Promise<ObsidianToolConfirmationDetails | false> {
    return false; // 検索は低リスク操作
  }

  protected async executeImpl(
    params: SearchNotesParams,
    signal?: AbortSignal,
    updateOutput?: (content: string) => void
  ): Promise<ToolResult> {
    updateOutput?.(`🔍 Searching for "${params.query}"...`);

    try {
      const searchOptions = {
        query: params.query,
        searchType: params.searchType || 'both',
        caseSensitive: params.caseSensitive || false
      };

      // ファイルリスト取得
      let filesToSearch = this.getFilesToSearch(params);
      
      updateOutput?.(`📁 Found ${filesToSearch.length} files to search...`);

      // 検索実行
      const results: SearchResult[] = [];
      let searchedCount = 0;

      for (const file of filesToSearch) {
        if (signal?.aborted) break;
        
        searchedCount++;
        if (searchedCount % 50 === 0) {
          updateOutput?.(`🔍 Searched ${searchedCount}/${filesToSearch.length} files...`);
        }

        const matches = await this.searchInFile(file, searchOptions);
        if (matches.length > 0) {
          results.push({
            file,
            matches,
            score: this.calculateRelevanceScore(matches, searchOptions.query)
          });
        }

        // 制限チェック
        if (results.length >= (params.limit || 10)) {
          break;
        }
      }

      // 結果をスコア順にソート
      results.sort((a, b) => b.score - a.score);

      // 結果の整形
      const formattedResults = await this.formatSearchResults(results, params);

      return {
        success: true,
        llmContent: this.generateLLMContent(results, params),
        returnDisplay: this.generateDisplayContent(results, params),
        data: {
          query: params.query,
          resultsCount: results.length,
          searchedFiles: searchedCount,
          results: formattedResults
        }
      };

    } catch (error) {
      throw error;
    }
  }

  private getFilesToSearch(params: SearchNotesParams): TFile[] {
    let files: TFile[];

    if (params.fileType === 'all') {
      files = this.vault.getAllLoadedFiles().filter(f => f instanceof TFile) as TFile[];
    } else {
      files = this.vault.getMarkdownFiles();
    }

    // フォルダフィルター
    if (params.folder) {
      const folderPath = params.folder.endsWith('/') ? params.folder : params.folder + '/';
      files = files.filter(file => file.path.startsWith(folderPath));
    }

    return files;
  }

  private async searchInFile(file: TFile, options: SearchOptions): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = [];
    
    try {
      // タイトル検索
      if (options.searchType === 'title' || options.searchType === 'both') {
        const titleMatch = this.searchInText(file.basename, options.query, options.caseSensitive);
        if (titleMatch) {
          matches.push({
            type: 'title',
            text: file.basename,
            context: '',
            lineNumber: 0
          });
        }
      }

      // コンテンツ検索
      if (options.searchType === 'content' || options.searchType === 'both') {
        const content = await this.vault.read(file);
        const contentMatches = this.searchInContent(content, options.query, options.caseSensitive);
        matches.push(...contentMatches);
      }

    } catch (error) {
      console.warn(`Failed to search in file ${file.path}:`, error);
    }

    return matches;
  }

  private searchInText(text: string, query: string, caseSensitive: boolean): boolean {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    return searchText.includes(searchQuery);
  }

  private searchInContent(content: string, query: string, caseSensitive: boolean): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const lines = content.split('\n');
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    lines.forEach((line, index) => {
      const searchLine = caseSensitive ? line : line.toLowerCase();
      if (searchLine.includes(searchQuery)) {
        // コンテキスト生成（前後2行）
        const contextStart = Math.max(0, index - 2);
        const contextEnd = Math.min(lines.length, index + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        matches.push({
          type: 'content',
          text: line.trim(),
          context,
          lineNumber: index + 1
        });
      }
    });

    return matches;
  }

  private calculateRelevanceScore(matches: SearchMatch[], query: string): number {
    let score = 0;
    
    matches.forEach(match => {
      // タイトルマッチはより高いスコア
      if (match.type === 'title') {
        score += 10;
      } else {
        score += 1;
      }
      
      // クエリの完全一致はボーナス
      if (match.text.toLowerCase().includes(query.toLowerCase())) {
        score += 5;
      }
    });

    return score;
  }

  private async formatSearchResults(results: SearchResult[], params: SearchNotesParams): Promise<FormattedSearchResult[]> {
    const formatted: FormattedSearchResult[] = [];

    for (const result of results) {
      const formattedResult: FormattedSearchResult = {
        notePath: result.file.path,
        noteTitle: result.file.basename,
        score: result.score,
        matches: result.matches.length,
        preview: '',
        lastModified: new Date(result.file.stat.mtime)
      };

      // プレビューコンテンツ生成
      if (params.includeContent && result.matches.length > 0) {
        const firstMatch = result.matches[0];
        formattedResult.preview = this.generatePreview(firstMatch.context || firstMatch.text);
      }

      formatted.push(formattedResult);
    }

    return formatted;
  }

  private generatePreview(text: string, maxLength: number = 150): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  private generateLLMContent(results: SearchResult[], params: SearchNotesParams): string {
    if (results.length === 0) {
      return `No notes found matching the query "${params.query}".`;
    }

    let content = `Found ${results.length} notes matching "${params.query}":\n\n`;
    
    results.forEach((result, index) => {
      content += `${index + 1}. **${result.file.basename}**\n`;
      content += `   Path: ${result.file.path}\n`;
      content += `   Matches: ${result.matches.length}\n`;
      
      if (params.includeContent && result.matches.length > 0) {
        const preview = this.generatePreview(result.matches[0].context || result.matches[0].text);
        content += `   Preview: ${preview}\n`;
      }
      content += '\n';
    });

    return content;
  }

  private generateDisplayContent(results: SearchResult[], params: SearchNotesParams): string {
    if (results.length === 0) {
      return `🔍 No results found for "${params.query}"\n\nTry:\n- Different keywords\n- Broader search terms\n- Checking spelling`;
    }

    return `🔍 Found ${results.length} notes matching "${params.query}"\n\n` +
           `📊 Search completed:\n` +
           `• Query: "${params.query}"\n` +
           `• Type: ${params.searchType || 'both'}\n` +
           `• Results: ${results.length}\n` +
           `• Top result: "${results[0].file.basename}"`;
  }
}

interface SearchOptions {
  query: string;
  searchType: string;
  caseSensitive: boolean;
}

interface SearchMatch {
  type: 'title' | 'content';
  text: string;
  context: string;
  lineNumber: number;
}

interface SearchResult {
  file: TFile;
  matches: SearchMatch[];
  score: number;
}

interface FormattedSearchResult {
  notePath: string;
  noteTitle: string;
  score: number;
  matches: number;
  preview: string;
  lastModified: Date;
}
```

## ツールレジストリとスケジューラー

### ツールレジストリ

```typescript
// src/core/tools/ToolRegistry.ts
export class ObsidianToolRegistry {
  private tools = new Map<string, ObsidianBaseTool>();
  private categories = new Map<ObsidianToolCategory, ObsidianBaseTool[]>();

  constructor(private app: App, private vault: Vault) {
    this.initializeCategories();
    this.registerDefaultTools();
  }

  registerTool(tool: ObsidianBaseTool): void {
    // ツール登録
    this.tools.set(tool.name, tool);
    
    // カテゴリ別登録
    if (!this.categories.has(tool.category)) {
      this.categories.set(tool.category, []);
    }
    this.categories.get(tool.category)!.push(tool);

    console.log(`🔧 Registered tool: ${tool.displayName} (${tool.name})`);
  }

  getTool(name: string): ObsidianBaseTool | undefined {
    return this.tools.get(name);
  }

  getToolsByCategory(category: ObsidianToolCategory): ObsidianBaseTool[] {
    return this.categories.get(category) || [];
  }

  getAllTools(): ObsidianBaseTool[] {
    return Array.from(this.tools.values());
  }

  // Gemini APIフォーマットのツール定義
  getToolDefinitions(): FunctionDeclaration[] {
    return this.getAllTools().map(tool => tool.schema);
  }

  private registerDefaultTools(): void {
    // ノート操作ツール
    this.registerTool(new CreateNoteTool(this.app, this.vault));
    this.registerTool(new ReadNoteTool(this.app, this.vault));
    this.registerTool(new UpdateNoteTool(this.app, this.vault));
    this.registerTool(new DeleteNoteTool(this.app, this.vault));

    // 検索・分析ツール
    this.registerTool(new SearchNotesTool(this.app, this.vault));
    this.registerTool(new AnalyzeVaultStatsTool(this.app, this.vault));

    // リンク管理ツール
    this.registerTool(new CreateLinkTool(this.app, this.vault));
    this.registerTool(new FindBrokenLinksTool(this.app, this.vault));

    console.log(`✅ Registered ${this.tools.size} tools across ${this.categories.size} categories`);
  }

  private initializeCategories(): void {
    Object.values(ObsidianToolCategory).forEach(category => {
      this.categories.set(category, []);
    });
  }
}
```

このツール設計により、GeminiCLIの優れたパターンを活用しながらObsidian特化の機能を実現できます。起動時のASCIIアートも含めて、技術的でありながらユーザーフレンドリーなエクスペリエンスを提供できます。🚀