# Phase 1: UI設計仕様書

## 概要

ObsiusのUIは**ClaudeCodeスタイルのチャット**を基本としながら、**エージェント実行の透明性**を確保するインターフェースを提供します。ユーザーはエージェントの思考と行動を理解でき、必要に応じて制御できます。

## UI設計コンセプト

### 🎯 **基本理念**

**「見える化されたエージェント」**

- **チャット中心**: 自然言語での対話がメイン
- **透明性**: エージェントの思考・行動を可視化  
- **制御性**: ユーザーがいつでも介入可能
- **シンプル性**: 複雑な機能も直感的に操作

### 🎨 **視覚的特徴**

1. **ClaudeCodeライク**: 馴染みのあるチャットUI
2. **プロセス可視化**: 実行ステップのリアルタイム表示
3. **状況認識**: 現在の状況が一目でわかる
4. **アクション指向**: 次に何ができるかが明確

## メインインターフェース設計

### 🗨️ **チャット画面レイアウト**

```typescript
const MainChatLayout: React.FC = () => {
  return (
    <div className="obsius-main-layout">
      {/* ヘッダー：状態表示とコントロール */}
      <ChatHeader />
      
      {/* メインチャット領域 */}
      <div className="chat-container">
        {/* 左側：メインチャット */}
        <div className="chat-main">
          <MessageHistory />
          <CurrentExecution />
          <ChatInput />
        </div>
        
        {/* 右側：コンテキストパネル（折りたたみ可能） */}
        <div className="context-panel">
          <CurrentContext />
          <QuickActions />
          <ExecutionHistory />
        </div>
      </div>
      
      {/* フッター：ステータスバー */}
      <StatusFooter />
    </div>
  );
};
```

### 📱 **ヘッダー設計**

```typescript
const ChatHeader: React.FC = () => {
  const { session, agent } = useObsius();
  
  return (
    <header className="chat-header">
      <div className="header-left">
        {/* エージェント状態インジケーター */}
        <AgentStatusIndicator status={agent.status} />
        
        {/* セッション情報 */}
        <div className="session-info">
          <span className="session-name">{session.name}</span>
          <span className="provider-info">
            {session.provider} / {session.model}
          </span>
        </div>
      </div>
      
      <div className="header-center">
        {/* 現在のタスク表示 */}
        {agent.currentTask && (
          <CurrentTaskDisplay task={agent.currentTask} />
        )}
      </div>
      
      <div className="header-right">
        {/* コントロールボタン */}
        <HeaderControls />
      </div>
    </header>
  );
};

const AgentStatusIndicator: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'idle': return 'gray';
      case 'thinking': return 'blue';
      case 'executing': return 'green';
      case 'waiting': return 'orange';
      case 'error': return 'red';
      default: return 'gray';
    }
  };
  
  return (
    <div className="agent-status">
      <div 
        className={`status-dot status-${status}`}
        style={{ backgroundColor: getStatusColor(status) }}
      />
      <span className="status-text">
        {getStatusText(status)}
      </span>
    </div>
  );
};

const HeaderControls: React.FC = () => {
  const { agent } = useObsius();
  
  return (
    <div className="header-controls">
      {/* 実行中断ボタン */}
      {agent.status === 'executing' && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => agent.interrupt()}
        >
          <Icon name="pause" />
          中断
        </Button>
      )}
      
      {/* 設定ボタン */}
      <Button variant="ghost" size="sm">
        <Icon name="settings" />
      </Button>
      
      {/* ヘルプボタン */}
      <Button variant="ghost" size="sm">
        <Icon name="help" />
      </Button>
    </div>
  );
};
```

### 💬 **メッセージ表示設計**

```typescript
const MessageHistory: React.FC = () => {
  const { messages } = useChat();
  
  return (
    <div className="message-history">
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  switch (message.type) {
    case 'user':
      return <UserMessage message={message} />;
    case 'agent':
      return <AgentMessage message={message} />;
    case 'system':
      return <SystemMessage message={message} />;
    case 'execution':
      return <ExecutionMessage message={message} />;
    default:
      return null;
  }
};

const AgentMessage: React.FC<{ message: AgentMessage }> = ({ message }) => {
  return (
    <div className="message agent-message">
      <div className="message-header">
        <Avatar src="/agent-avatar.png" />
        <div className="message-meta">
          <span className="sender">Obsius</span>
          <span className="timestamp">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
      
      <div className="message-content">
        {/* メッセージ本文 */}
        <div className="message-text">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {/* 実行計画表示 */}
        {message.executionPlan && (
          <ExecutionPlanDisplay plan={message.executionPlan} />
        )}
        
        {/* 添付ファイル */}
        {message.attachments && (
          <AttachmentsList attachments={message.attachments} />
        )}
      </div>
      
      {/* メッセージアクション */}
      <MessageActions message={message} />
    </div>
  );
};

const UserMessage: React.FC<{ message: UserMessage }> = ({ message }) => {
  return (
    <div className="message user-message">
      <div className="message-content">
        <ReactMarkdown>{message.content}</ReactMarkdown>
        
        {/* ファイル添付 */}
        {message.files && (
          <FileAttachments files={message.files} />
        )}
        
        {/* @mention表示 */}
        {message.mentions && (
          <MentionsList mentions={message.mentions} />
        )}
      </div>
      
      <div className="message-meta">
        <span className="timestamp">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};
```

### ⚙️ **エージェント実行表示**

```typescript
const CurrentExecution: React.FC = () => {
  const { currentExecution } = useAgent();
  
  if (!currentExecution) return null;
  
  return (
    <div className="current-execution">
      <div className="execution-header">
        <Icon name="cog" className="spinning" />
        <span>エージェント実行中...</span>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => currentExecution.interrupt()}
        >
          中断
        </Button>
      </div>
      
      <div className="execution-content">
        {/* 現在の思考表示 */}
        {currentExecution.currentThinking && (
          <ThinkingDisplay thinking={currentExecution.currentThinking} />
        )}
        
        {/* 実行ステップ履歴 */}
        <ExecutionSteps steps={currentExecution.steps} />
        
        {/* 進行状況 */}
        <ProgressIndicator execution={currentExecution} />
      </div>
    </div>
  );
};

const ThinkingDisplay: React.FC<{ thinking: AgentThinking }> = ({ thinking }) => {
  return (
    <div className="thinking-display">
      <div className="thinking-header">
        <Icon name="brain" />
        <span>思考中</span>
        <div className="thinking-dots">
          <span>.</span><span>.</span><span>.</span>
        </div>
      </div>
      
      <div className="thinking-content">
        <ReactMarkdown>{thinking.content}</ReactMarkdown>
        
        {/* 考慮中の選択肢 */}
        {thinking.options && (
          <div className="thinking-options">
            <h4>検討中の選択肢:</h4>
            <ul>
              {thinking.options.map((option, index) => (
                <li key={index}>
                  {option.description}
                  <span className="confidence">
                    確信度: {option.confidence}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const ExecutionSteps: React.FC<{ steps: ExecutionStep[] }> = ({ steps }) => {
  return (
    <div className="execution-steps">
      <h4>実行ステップ</h4>
      <div className="steps-list">
        {steps.map((step, index) => (
          <ExecutionStepItem 
            key={step.id} 
            step={step} 
            index={index + 1}
          />
        ))}
      </div>
    </div>
  );
};

const ExecutionStepItem: React.FC<{
  step: ExecutionStep;
  index: number;
}> = ({ step, index }) => {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending': return 'circle';
      case 'running': return 'play';
      case 'completed': return 'check';
      case 'failed': return 'x';
      default: return 'circle';
    }
  };
  
  return (
    <div className={`execution-step status-${step.status}`}>
      <div className="step-indicator">
        <div className="step-number">{index}</div>
        <Icon name={getStepIcon(step.status)} />
      </div>
      
      <div className="step-content">
        <div className="step-title">{step.action}</div>
        <div className="step-description">{step.description}</div>
        
        {/* 実行結果 */}
        {step.result && (
          <StepResult result={step.result} />
        )}
        
        {/* エラー表示 */}
        {step.error && (
          <div className="step-error">
            <Icon name="alert-triangle" />
            {step.error}
          </div>
        )}
      </div>
      
      <div className="step-meta">
        <span className="step-time">
          {formatDuration(step.duration)}
        </span>
      </div>
    </div>
  );
};
```

### 🎛️ **チャット入力設計**

```typescript
const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { sendMessage } = useChat();
  
  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    setIsLoading(true);
    try {
      await sendMessage({
        content: input,
        files: attachments
      });
      setInput('');
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="chat-input">
      {/* ファイル添付プレビュー */}
      {attachments.length > 0 && (
        <AttachmentPreview 
          files={attachments}
          onRemove={(index) => {
            setAttachments(prev => prev.filter((_, i) => i !== index));
          }}
        />
      )}
      
      <div className="input-container">
        {/* メイン入力欄 */}
        <div className="input-wrapper">
          <AutoResizingTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Obsidianについて何でも聞いてください..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          
          {/* インライン操作ボタン */}
          <div className="input-actions">
            <FileUploadButton 
              onFilesSelected={(files) => 
                setAttachments(prev => [...prev, ...files])
              }
            />
            <MentionButton />
            <TemplateButton />
          </div>
        </div>
        
        {/* 送信ボタン */}
        <Button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isLoading}
          className="send-button"
        >
          {isLoading ? (
            <Icon name="loader" className="spinning" />
          ) : (
            <Icon name="send" />
          )}
        </Button>
      </div>
      
      {/* 入力ヒント */}
      <InputHints />
    </div>
  );
};

const InputHints: React.FC = () => {
  const [showHints, setShowHints] = useState(false);
  
  return (
    <div className="input-hints">
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowHints(!showHints)}
      >
        <Icon name="lightbulb" />
        使い方のヒント
      </Button>
      
      {showHints && (
        <div className="hints-content">
          <div className="hint-category">
            <h4>🎯 タスク指示の例</h4>
            <ul>
              <li>「今日の会議ノートを作成して」</li>
              <li>「機械学習関連のノートを整理して」</li>
              <li>「読書メモのテンプレートを作って」</li>
            </ul>
          </div>
          
          <div className="hint-category">
            <h4>🔍 検索・分析</h4>
            <ul>
              <li>「プロジェクトXに関連するノートを探して」</li>
              <li>「学習進度を分析して」</li>
              <li>「重複するコンテンツを見つけて」</li>
            </ul>
          </div>
          
          <div className="hint-category">
            <h4>⚡ クイックアクション</h4>
            <ul>
              <li>@ファイル名 - ファイルをメンション</li>
              <li>Shift+Enter - 改行</li>
              <li>ファイルドラッグ&ドロップ - 添付</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 📊 **コンテキストパネル設計**

```typescript
const ContextPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ContextTab>('context');
  
  return (
    <div className="context-panel">
      <div className="panel-tabs">
        <TabButton 
          active={activeTab === 'context'}
          onClick={() => setActiveTab('context')}
        >
          <Icon name="file-text" />
          コンテキスト
        </TabButton>
        <TabButton 
          active={activeTab === 'actions'}
          onClick={() => setActiveTab('actions')}
        >
          <Icon name="zap" />
          クイックアクション
        </TabButton>
        <TabButton 
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          <Icon name="clock" />
          履歴
        </TabButton>
      </div>
      
      <div className="panel-content">
        {activeTab === 'context' && <CurrentContext />}
        {activeTab === 'actions' && <QuickActions />}
        {activeTab === 'history' && <ExecutionHistory />}
      </div>
    </div>
  );
};

const CurrentContext: React.FC = () => {
  const { context } = useObsius();
  
  return (
    <div className="current-context">
      <h3>現在のコンテキスト</h3>
      
      {/* 現在のファイル */}
      {context.currentFile && (
        <ContextItem
          icon="file"
          title="アクティブファイル"
          content={context.currentFile.name}
          action={() => openFile(context.currentFile)}
        />
      )}
      
      {/* 選択中のテキスト */}
      {context.selectedText && (
        <ContextItem
          icon="type"
          title="選択中のテキスト"
          content={truncateText(context.selectedText, 100)}
          action={() => copyToClipboard(context.selectedText)}
        />
      )}
      
      {/* 最近の操作 */}
      {context.recentOperations && (
        <div className="recent-operations">
          <h4>最近の操作</h4>
          {context.recentOperations.map(op => (
            <RecentOperationItem key={op.id} operation={op} />
          ))}
        </div>
      )}
      
      {/* ワークスペース状態 */}
      <div className="workspace-state">
        <h4>ワークスペース</h4>
        <div className="workspace-stats">
          <StatItem 
            label="総ノート数" 
            value={context.workspace.totalNotes} 
          />
          <StatItem 
            label="今日の更新" 
            value={context.workspace.todayUpdates} 
          />
          <StatItem 
            label="未保存の変更" 
            value={context.workspace.unsavedChanges} 
          />
        </div>
      </div>
    </div>
  );
};
```

### 📱 **レスポンシブ対応**

```typescript
// モバイル用レイアウト
const MobileChatLayout: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  
  return (
    <div className="mobile-layout">
      {/* モバイルヘッダー */}
      <MobileHeader onMenuToggle={() => setShowSidebar(!showSidebar)} />
      
      {/* サイドバーオーバーレイ */}
      {showSidebar && (
        <div className="sidebar-overlay">
          <div className="sidebar-content">
            <ContextPanel />
          </div>
          <div 
            className="sidebar-backdrop"
            onClick={() => setShowSidebar(false)}
          />
        </div>
      )}
      
      {/* メインチャット（モバイル最適化） */}
      <div className="mobile-chat">
        <MessageHistory />
        <MobileChatInput />
      </div>
    </div>
  );
};

// タブレット用レイアウト
const TabletChatLayout: React.FC = () => {
  return (
    <div className="tablet-layout">
      <div className="tablet-main">
        <ChatHeader />
        <MessageHistory />
        <ChatInput />
      </div>
      
      {/* スライドアップパネル */}
      <SlideUpPanel>
        <ContextPanel />
      </SlideUpPanel>
    </div>
  );
};
```

### 📋 **実装優先度**

#### フェーズ1-4 (最優先・1週間)
1. ✅ **基本チャットレイアウト**
2. ✅ **メッセージ表示コンポーネント**
3. ✅ **チャット入力**
4. ✅ **エージェント状態表示**

#### フェーズ1-5 (重要・2週間)
1. 📋 **エージェント実行の可視化**
2. 📋 **コンテキストパネル**
3. 📋 **ファイル添付機能**
4. 📋 **基本的なレスポンシブ対応**

#### フェーズ1-6 (拡張・3-4週間)
1. 📋 **高度な実行制御UI**
2. 📋 **詳細なコンテキスト表示**
3. 📋 **カスタマイズ可能な設定UI**
4. 📋 **完全なモバイル対応**

## まとめ

このUI設計により：

- **親しみやすさ**: ClaudeCodeライクな使い慣れたインターフェース
- **透明性**: エージェントの行動が完全に可視化
- **制御性**: ユーザーがいつでも介入・制御可能
- **効率性**: 直感的で迅速な操作が可能

エージェントの自立性とユーザーの制御性を両立した、理想的なインターフェースを実現できます。