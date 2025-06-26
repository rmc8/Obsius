# Phase 1: シンプルアーキテクチャ設計書

## 概要

ObsiusはClaudeCodeに近い**シンプルなチャットベースAIアシスタント**として設計します。複雑なイベント駆動は使わず、直感的で使いやすいインターフェースを重視します。

## アーキテクチャ設計方針

### 🎯 **基本コンセプト**

**「ClaudeCodeのようなシンプルなチャット + Obsidian操作」**

- **チャットインターフェース**: メインのやりとりはチャット形式
- **直接実行**: AIが必要に応じて直接Obsidian操作を実行
- **結果表示**: 実行内容と結果をチャット内に表示

### 🏗️ **シンプルアーキテクチャ**

#### 基本構造

```typescript
// メッセージタイプ
interface ChatMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: string[];
}

// AI応答 + アクション実行
interface AssistantResponse {
  message: ChatMessage;
  actions?: ObsidianAction[];
  files_created?: string[];
  files_modified?: string[];
}

// Obsidianアクション（ツール実行）
interface ObsidianAction {
  type: 'create_note' | 'update_note' | 'search_notes' | 'organize_tags';
  description: string;  // ユーザーに見せる説明
  parameters: Record<string, any>;
  result?: ActionResult;
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}
```

#### シンプルな処理フロー

```typescript
// 1. ユーザーメッセージ受信
async handleUserMessage(content: string): Promise<void> {
  // チャットにユーザーメッセージを追加
  this.addMessage({
    type: 'user',
    content: content,
    timestamp: new Date()
  });
  
  // AIプロバイダーに送信
  const response = await this.aiProvider.generateResponse(
    this.getConversationHistory(),
    this.getAvailableTools()
  );
  
  // レスポンス処理
  await this.processAssistantResponse(response);
}

// 2. AI応答処理
async processAssistantResponse(response: AssistantResponse): Promise<void> {
  // チャットにAI応答を追加
  this.addMessage(response.message);
  
  // アクションがあれば実行
  if (response.actions && response.actions.length > 0) {
    for (const action of response.actions) {
      const result = await this.executeAction(action);
      
      // 実行結果をチャットに表示
      this.addActionResult(action, result);
    }
  }
}

// 3. アクション実行
async executeAction(action: ObsidianAction): Promise<ActionResult> {
  switch (action.type) {
    case 'create_note':
      return await this.createNote(action.parameters);
    case 'update_note':
      return await this.updateNote(action.parameters);
    case 'search_notes':
      return await this.searchNotes(action.parameters);
    default:
      return { success: false, message: `Unknown action: ${action.type}` };
  }
}
```

### 🔧 **Obsidianツール設計**

#### 基本ツール

```typescript
export class ObsidianTools {
  constructor(private app: App, private plugin: ObsiusPlugin) {}
  
  // ノート作成
  async createNote(params: {
    title: string;
    content?: string;
    folder?: string;
    template?: string;
  }): Promise<ActionResult> {
    try {
      const folderPath = params.folder || '';
      const fileName = `${params.title}.md`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      let content = params.content || '';
      
      // テンプレート適用
      if (params.template) {
        content = await this.applyTemplate(params.template, content);
      }
      
      const file = await this.app.vault.create(filePath, content);
      
      return {
        success: true,
        message: `ノート "${params.title}" を作成しました`,
        data: { path: file.path }
      };
    } catch (error) {
      return {
        success: false,
        message: `ノート作成に失敗しました: ${error.message}`
      };
    }
  }
  
  // ノート検索
  async searchNotes(params: {
    query: string;
    limit?: number;
    folder?: string;
  }): Promise<ActionResult> {
    try {
      const files = this.app.vault.getMarkdownFiles();
      const results = [];
      
      for (const file of files) {
        // フォルダフィルター
        if (params.folder && !file.path.startsWith(params.folder)) {
          continue;
        }
        
        const content = await this.app.vault.read(file);
        const title = file.basename;
        
        // 簡単な検索（タイトルと内容）
        if (title.toLowerCase().includes(params.query.toLowerCase()) ||
            content.toLowerCase().includes(params.query.toLowerCase())) {
          results.push({
            title: title,
            path: file.path,
            snippet: this.extractSnippet(content, params.query)
          });
        }
        
        // 件数制限
        if (results.length >= (params.limit || 10)) {
          break;
        }
      }
      
      return {
        success: true,
        message: `${results.length}件のノートが見つかりました`,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        message: `検索に失敗しました: ${error.message}`
      };
    }
  }
  
  // ノート更新
  async updateNote(params: {
    path: string;
    content?: string;
    append?: boolean;
  }): Promise<ActionResult> {
    try {
      const file = this.app.vault.getAbstractFileByPath(params.path);
      if (!file || !(file instanceof TFile)) {
        return {
          success: false,
          message: `ファイルが見つかりません: ${params.path}`
        };
      }
      
      let newContent = params.content || '';
      
      if (params.append) {
        const existingContent = await this.app.vault.read(file);
        newContent = existingContent + '\n\n' + newContent;
      }
      
      await this.app.vault.modify(file, newContent);
      
      return {
        success: true,
        message: `ノート "${file.basename}" を更新しました`,
        data: { path: file.path }
      };
    } catch (error) {
      return {
        success: false,
        message: `ノート更新に失敗しました: ${error.message}`
      };
    }
  }
  
  private extractSnippet(content: string, query: string): string {
    const lines = content.split('\n');
    const queryLower = query.toLowerCase();
    
    for (const line of lines) {
      if (line.toLowerCase().includes(queryLower)) {
        return line.trim().substring(0, 100) + '...';
      }
    }
    
    return content.substring(0, 100) + '...';
  }
}
```

### 🎨 **チャットUI設計（ClaudeCodeスタイル）**

#### メインチャットコンポーネント

```typescript
const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { aiProvider, obsidianTools } = useObsius();
  
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: generateId(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // AI応答を取得
      const response = await aiProvider.generateResponse(
        [...messages, userMessage],
        obsidianTools.getToolDefinitions()
      );
      
      // AI応答を追加
      setMessages(prev => [...prev, response.message]);
      
      // ツール実行があれば実行
      if (response.actions) {
        for (const action of response.actions) {
          const result = await obsidianTools.executeAction(action);
          
          // 実行結果を表示
          const resultMessage: ChatMessage = {
            id: generateId(),
            type: 'system',
            content: formatActionResult(action, result),
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, resultMessage]);
        }
      }
      
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        type: 'system',
        content: `エラーが発生しました: ${error.message}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="obsius-chat">
      {/* メッセージ履歴 */}
      <div className="messages">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
      
      {/* 入力欄 */}
      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Obsidianについて何でも聞いてください..."
          rows={3}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
        >
          送信
        </button>
      </div>
    </div>
  );
};

// メッセージ表示コンポーネント
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  return (
    <div className={`message ${message.type}`}>
      <div className="message-header">
        <span className="sender">
          {message.type === 'user' ? 'You' : 
           message.type === 'assistant' ? 'Obsius' : 'System'}
        </span>
        <span className="timestamp">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
};

// アクション結果フォーマット
function formatActionResult(action: ObsidianAction, result: ActionResult): string {
  let message = `**${action.description}**\n\n`;
  
  if (result.success) {
    message += `✅ ${result.message}`;
    
    if (result.data) {
      message += `\n\n詳細:\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
    }
  } else {
    message += `❌ ${result.message}`;
  }
  
  return message;
}
```

### 🔌 **プラグイン統合**

#### メインプラグインクラス

```typescript
export default class ObsiusPlugin extends Plugin {
  private chatView?: ChatView;
  private aiProvider?: AIProvider;
  private obsidianTools?: ObsidianTools;
  private settings?: ObsiusSettings;
  
  async onload() {
    console.log('Loading Obsius plugin...');
    
    // 設定読み込み
    this.settings = await this.loadSettings();
    
    // サービス初期化
    this.aiProvider = new AIProvider(this.settings.providers);
    this.obsidianTools = new ObsidianTools(this.app, this);
    
    // チャットビュー登録
    this.registerView('obsius-chat', (leaf) => 
      new ChatView(leaf, this.aiProvider, this.obsidianTools)
    );
    
    // コマンド登録
    this.addCommand({
      id: 'open-chat',
      name: 'Open AI Chat',
      callback: () => this.openChat()
    });
    
    // リボンアイコン
    this.addRibbonIcon('bot', 'Obsius AI', () => this.openChat());
    
    // 設定タブ
    this.addSettingTab(new ObsiusSettingTab(this.app, this));
  }
  
  async openChat() {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewType('obsius-chat');
    this.app.workspace.revealLeaf(leaf);
  }
  
  async onunload() {
    console.log('Unloading Obsius plugin...');
  }
  
  private async loadSettings(): Promise<ObsiusSettings> {
    const data = await this.loadData();
    return { ...DEFAULT_SETTINGS, ...data };
  }
}

// チャットビュークラス
export class ChatView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private aiProvider: AIProvider,
    private obsidianTools: ObsidianTools
  ) {
    super(leaf);
  }
  
  getViewType(): string {
    return 'obsius-chat';
  }
  
  getDisplayText(): string {
    return 'Obsius AI';
  }
  
  getIcon(): string {
    return 'bot';
  }
  
  async onOpen() {
    const container = this.containerEl.createDiv('obsius-chat-container');
    
    const root = createRoot(container);
    root.render(
      <ObsiusProvider 
        aiProvider={this.aiProvider}
        obsidianTools={this.obsidianTools}
      >
        <ChatInterface />
      </ObsiusProvider>
    );
  }
}
```

### 📋 **実装優先度（シンプル版）**

#### フェーズ1-1 (最優先・1週間)
1. ✅ **基本的なチャットUI**
2. ✅ **シンプルなメッセージ管理**
3. ✅ **基本的なObsidianツール（create, search, update）**
4. ✅ **AIプロバイダー統合（Claude/OpenAI）**

#### フェーズ1-2 (重要・2週間)
1. 📋 **ツール実行結果の見やすい表示**
2. 📋 **エラーハンドリング**
3. 📋 **設定画面（APIキー管理）**
4. 📋 **ファイル添付機能**

#### フェーズ1-3 (拡張・3-4週間)
1. 📋 **より多くのObsidianツール追加**
2. 📋 **コンテキスト理解（現在のノートを自動認識）**
3. 📋 **検索機能強化**
4. 📋 **セッション履歴保存**

## まとめ

この設計は：

- **シンプル**: 複雑なイベント駆動なし
- **直感的**: ClaudeCodeのようなチャット体験
- **実用的**: Obsidianの基本操作を効率化
- **拡張可能**: 後からRAGや高度な機能を追加可能

次のステップとして、マルチエージェントシステムをシンプルな形で設計します。