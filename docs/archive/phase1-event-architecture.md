# Phase 1: イベント駆動アーキテクチャ基盤設計書

## 概要

Obsiusは**チャット主体のCLIベース**AIアシスタントとして、ClaudeCodeやGeminiCLIの優れたパターンを踏襲しながら、OpenHandsのイベント駆動アーキテクチャを基盤とします。

## アーキテクチャ設計方針

### 🎯 **基本コンセプト**

**「自然言語チャット + CLIコマンド実行」**

- **チャットインターフェース**: 自然言語での対話が主要UI
- **CLIコマンド実行**: AIがObsidian操作をCLIスタイルで実行
- **リアルタイム可視化**: 実行プロセスの透明性確保

### 🏗️ **イベント駆動アーキテクチャ**

#### コアイベントタイプ

```typescript
// 基本イベント構造（OpenHandsパターン）
interface ObsiusEvent {
  id: string;
  timestamp: string;
  source: string;
  sessionId: string;
  vaultPath: string;
}

// ユーザーメッセージ
interface UserMessage extends ObsiusEvent {
  type: 'user_message';
  content: string;
  files?: string[];
  mentions?: string[];
}

// AIレスポンス
interface AIResponse extends ObsiusEvent {
  type: 'ai_response';
  content: string;
  reasoning?: string;
  commands?: CLICommand[];
}

// コマンド実行（CLIスタイル）
interface CLICommand extends ObsiusEvent {
  type: 'cli_command';
  command: string;
  args: Record<string, any>;
  workingDirectory: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// コマンド結果
interface CommandResult extends ObsiusEvent {
  type: 'command_result';
  commandId: string;
  success: boolean;
  output: string;
  error?: string;
  filesChanged?: string[];
}

// システム状態変更
interface StateChange extends ObsiusEvent {
  type: 'state_change';
  scope: 'vault' | 'session' | 'ui';
  changes: Record<string, any>;
}
```

#### イベントフロー例

```typescript
// 1. ユーザー: "今日の学習ノートを作成して"
UserMessage {
  content: "今日の学習ノートを作成して",
  type: "user_message"
}

// 2. AI: 理解して実行計画を提示
AIResponse {
  content: "今日の学習ノート作成を開始します。\n\n実行コマンド:\n```bash\nobsius create-note \"学習記録_2024-06-26\" --template daily-learning --folder Daily\n```",
  commands: [
    {
      command: "create-note",
      args: {
        title: "学習記録_2024-06-26",
        template: "daily-learning",
        folder: "Daily"
      }
    }
  ]
}

// 3. コマンド実行
CLICommand {
  command: "create-note",
  args: { ... },
  riskLevel: "low"
}

// 4. 実行結果
CommandResult {
  success: true,
  output: "ノート 'Daily/学習記録_2024-06-26.md' を作成しました",
  filesChanged: ["Daily/学習記録_2024-06-26.md"]
}
```

### 🎛️ **CLI コマンドシステム設計**

#### 基本コマンドカテゴリ

```typescript
// ノート操作コマンド
const NOTE_COMMANDS = {
  'create-note': {
    description: 'Create a new note',
    args: {
      title: { type: 'string', required: true },
      folder: { type: 'string', required: false },
      template: { type: 'string', required: false },
      tags: { type: 'array', required: false }
    },
    riskLevel: 'low'
  },
  
  'update-note': {
    description: 'Update existing note content',
    args: {
      path: { type: 'string', required: true },
      content: { type: 'string', required: false },
      append: { type: 'boolean', required: false }
    },
    riskLevel: 'medium'
  },
  
  'delete-note': {
    description: 'Delete a note',
    args: {
      path: { type: 'string', required: true },
      confirm: { type: 'boolean', required: true }
    },
    riskLevel: 'high'
  }
};

// 検索・分析コマンド
const SEARCH_COMMANDS = {
  'search-notes': {
    description: 'Search notes with various filters',
    args: {
      query: { type: 'string', required: true },
      type: { type: 'enum', values: ['semantic', 'keyword', 'both'] },
      limit: { type: 'number', default: 10 }
    },
    riskLevel: 'low'
  },
  
  'analyze-vault': {
    description: 'Analyze vault structure and relationships',
    args: {
      depth: { type: 'number', default: 3 },
      focus: { type: 'string', required: false }
    },
    riskLevel: 'low'
  }
};

// 整理・管理コマンド
const ORGANIZE_COMMANDS = {
  'auto-tag': {
    description: 'Automatically suggest and apply tags',
    args: {
      path: { type: 'string', required: false },
      threshold: { type: 'number', default: 0.7 },
      dryRun: { type: 'boolean', default: true }
    },
    riskLevel: 'medium'
  },
  
  'link-suggestions': {
    description: 'Find and suggest internal links',
    args: {
      note: { type: 'string', required: true },
      autoApply: { type: 'boolean', default: false }
    },
    riskLevel: 'medium'
  }
};
```

#### コマンド実行エンジン

```typescript
export class CLICommandEngine {
  private eventStream: EventStreamManager;
  private securityManager: SecurityManager;
  private commandRegistry: Map<string, CommandDefinition>;
  
  constructor(eventStream: EventStreamManager, securityManager: SecurityManager) {
    this.eventStream = eventStream;
    this.securityManager = securityManager;
    this.commandRegistry = new Map();
    this.registerDefaultCommands();
  }
  
  async executeCommand(command: CLICommand): Promise<CommandResult> {
    // 1. コマンド検証
    const definition = this.commandRegistry.get(command.command);
    if (!definition) {
      throw new Error(`Unknown command: ${command.command}`);
    }
    
    // 2. 引数検証
    const validation = this.validateArgs(command.args, definition.args);
    if (!validation.valid) {
      throw new Error(`Invalid arguments: ${validation.errors.join(', ')}`);
    }
    
    // 3. セキュリティチェック
    const riskAssessment = await this.securityManager.assessCommand(command);
    if (riskAssessment.requiresConfirmation) {
      const confirmed = await this.requestConfirmation(command, riskAssessment);
      if (!confirmed) {
        return {
          ...command,
          type: 'command_result',
          commandId: command.id,
          success: false,
          output: 'User cancelled operation'
        };
      }
    }
    
    // 4. コマンド実行イベント発行
    await this.eventStream.addEvent(command);
    
    // 5. 実際の実行
    try {
      const result = await this.executeCommandImpl(command, definition);
      
      // 6. 結果イベント発行
      const resultEvent: CommandResult = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: 'cli_engine',
        sessionId: command.sessionId,
        vaultPath: command.vaultPath,
        type: 'command_result',
        commandId: command.id,
        success: true,
        output: result.output,
        filesChanged: result.filesChanged
      };
      
      await this.eventStream.addEvent(resultEvent);
      return resultEvent;
      
    } catch (error) {
      const errorEvent: CommandResult = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: 'cli_engine',
        sessionId: command.sessionId,
        vaultPath: command.vaultPath,
        type: 'command_result',
        commandId: command.id,
        success: false,
        output: '',
        error: error.message
      };
      
      await this.eventStream.addEvent(errorEvent);
      return errorEvent;
    }
  }
}
```

### 🎨 **チャットUI設計**

#### ClaudeCode/GeminiCLIスタイルのインターフェース

```typescript
const ChatInterface: React.FC = () => {
  const { events, sendMessage } = useEventStream();
  const { session } = useSession();
  
  // イベントをチャットメッセージに変換
  const messages = useMemo(() => {
    return convertEventsToMessages(events);
  }, [events]);
  
  return (
    <div className="obsius-chat">
      {/* チャット履歴表示 */}
      <ChatHistory>
        {messages.map(message => (
          <ChatMessage key={message.id} message={message}>
            {/* ユーザーメッセージ */}
            {message.type === 'user' && (
              <UserMessage content={message.content} />
            )}
            
            {/* AIレスポンス + コマンド実行 */}
            {message.type === 'ai' && (
              <AIMessage 
                content={message.content}
                commands={message.commands}
                onCommandRetry={(cmd) => executeCommand(cmd)}
              />
            )}
            
            {/* コマンド実行結果 */}
            {message.type === 'command_result' && (
              <CommandResult 
                result={message}
                showDetails={true}
              />
            )}
          </ChatMessage>
        ))}
      </ChatHistory>
      
      {/* 入力欄 */}
      <ChatInput 
        onSend={sendMessage}
        placeholder="Obsidianについて何でも聞いてください..."
        supportsMentions={true}
        supportsFiles={true}
      />
      
      {/* ステータス表示 */}
      <ChatStatus 
        session={session}
        lastEvent={events[events.length - 1]}
      />
    </div>
  );
};

// チャットメッセージコンポーネント
const AIMessage: React.FC<{
  content: string;
  commands?: CLICommand[];
  onCommandRetry: (cmd: CLICommand) => void;
}> = ({ content, commands, onCommandRetry }) => {
  return (
    <div className="ai-message">
      {/* AIレスポンステキスト */}
      <MessageContent content={content} />
      
      {/* 実行コマンド表示 */}
      {commands && commands.map(cmd => (
        <CommandDisplay 
          key={cmd.id}
          command={cmd}
          onRetry={() => onCommandRetry(cmd)}
        />
      ))}
    </div>
  );
};

// コマンド表示コンポーネント
const CommandDisplay: React.FC<{
  command: CLICommand;
  onRetry: () => void;
}> = ({ command, onRetry }) => {
  return (
    <div className="command-display">
      <div className="command-header">
        <Icon name="terminal" />
        <span>実行コマンド</span>
        <Badge variant={getRiskBadgeVariant(command.riskLevel)}>
          {command.riskLevel}
        </Badge>
      </div>
      
      <CodeBlock language="bash">
        {formatCommandForDisplay(command)}
      </CodeBlock>
      
      <div className="command-actions">
        <Button size="sm" onClick={onRetry}>
          <Icon name="refresh" />
          再実行
        </Button>
      </div>
    </div>
  );
};
```

### 🔄 **イベントストリーム管理**

#### EventStreamManager

```typescript
export class EventStreamManager {
  private events: ObsiusEvent[] = [];
  private subscribers = new Map<string, Set<EventListener>>();
  private persistenceManager: PersistenceManager;
  private maxHistorySize = 1000;
  
  constructor(persistenceManager: PersistenceManager) {
    this.persistenceManager = persistenceManager;
  }
  
  async addEvent(event: ObsiusEvent): Promise<void> {
    // イベント履歴に追加
    this.events.push(event);
    
    // 履歴サイズ制限
    if (this.events.length > this.maxHistorySize) {
      this.events = this.events.slice(-this.maxHistorySize);
    }
    
    // サブスクライバーに通知
    const typeSubscribers = this.subscribers.get(event.type) || new Set();
    const allSubscribers = this.subscribers.get('*') || new Set();
    
    for (const listener of [...typeSubscribers, ...allSubscribers]) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
    
    // 永続化
    await this.persistenceManager.saveEvent(event);
    
    // リアルタイムUI更新
    this.broadcastToUI(event);
  }
  
  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(listener);
    
    // アンサブスクライブ関数を返す
    return () => {
      this.subscribers.get(eventType)?.delete(listener);
    };
  }
  
  getEvents(filter?: EventFilter): ObsiusEvent[] {
    if (!filter) return [...this.events];
    
    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.sessionId && event.sessionId !== filter.sessionId) return false;
      if (filter.after && new Date(event.timestamp) <= filter.after) return false;
      if (filter.before && new Date(event.timestamp) >= filter.before) return false;
      return true;
    });
  }
  
  private broadcastToUI(event: ObsiusEvent): void {
    // React Context経由でUIに即座に反映
    window.dispatchEvent(new CustomEvent('obsius_event', {
      detail: event
    }));
  }
}
```

### 🔒 **セキュリティ統合**

#### 基本的なリスク評価

```typescript
export class SecurityManager {
  async assessCommand(command: CLICommand): Promise<RiskAssessment> {
    const risks = [];
    
    // ファイル削除操作
    if (command.command === 'delete-note' || command.command === 'delete-folder') {
      risks.push({
        type: 'data_loss',
        severity: 'high',
        description: 'ファイルまたはフォルダの削除'
      });
    }
    
    // 大量操作
    if (command.args.batch && command.args.batch.length > 10) {
      risks.push({
        type: 'bulk_operation',
        severity: 'medium',
        description: `${command.args.batch.length}個のファイルに対する一括操作`
      });
    }
    
    // 外部サービス連携
    if (command.command.includes('external') || command.command.includes('web')) {
      risks.push({
        type: 'external_access',
        severity: 'medium',
        description: '外部サービスへのアクセス'
      });
    }
    
    const maxSeverity = this.getMaxSeverity(risks);
    
    return {
      level: maxSeverity,
      risks,
      requiresConfirmation: maxSeverity !== 'low',
      message: this.generateRiskMessage(risks)
    };
  }
  
  private generateRiskMessage(risks: Risk[]): string {
    if (risks.length === 0) return '';
    
    const highRisks = risks.filter(r => r.severity === 'high');
    const mediumRisks = risks.filter(r => r.severity === 'medium');
    
    let message = '⚠️ 以下の操作を実行します:\n';
    
    if (highRisks.length > 0) {
      message += '\n🔴 高リスク操作:\n';
      highRisks.forEach(risk => {
        message += `  • ${risk.description}\n`;
      });
    }
    
    if (mediumRisks.length > 0) {
      message += '\n🟡 中リスク操作:\n';
      mediumRisks.forEach(risk => {
        message += `  • ${risk.description}\n`;
      });
    }
    
    message += '\n続行しますか？';
    return message;
  }
}
```

### 📋 **実装優先度**

#### フェーズ1-1 (最優先)
1. ✅ **基本イベントタイプ定義**
2. ✅ **EventStreamManager実装**
3. ✅ **基本CLIコマンド定義**
4. ✅ **セキュリティ評価基盤**

#### フェーズ1-2 (重要)
1. 📋 **CLICommandEngine実装**
2. 📋 **チャットUI基本構造**
3. 📋 **イベント→メッセージ変換**
4. 📋 **コマンド表示コンポーネント**

#### フェーズ1-3 (拡張)
1. 📋 **高度なセキュリティチェック**
2. 📋 **コマンド履歴・検索**
3. 📋 **エラーハンドリング強化**
4. 📋 **パフォーマンス最適化**

## まとめ

この設計により、ClaudeCodeやGeminiCLIのような**チャット主体のCLIベース**体験を提供しながら、OpenHandsのイベント駆動アーキテクチャの堅牢性を活用できます。

- **自然な対話**: チャットインターフェースでの直感的操作
- **透明性**: 実行されるコマンドの可視化
- **安全性**: リスク評価と確認システム
- **拡張性**: イベント駆動による柔軟な機能追加

次のステップとして、マルチエージェントシステムの設計に進みます。