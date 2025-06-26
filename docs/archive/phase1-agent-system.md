# Phase 1: 自立型エージェントシステム設計書

## 概要

Obsiusは**ユーザーの指示を受けて自立的にタスクを完遂するエージェント**として設計します。自動トリガーは使わず、明確なユーザー指示に基づいて行動します。

## エージェント行動モデル

### 🎯 **基本動作パターン**

**ユーザー指示 → 計画立案 → 自立実行 → 結果報告**

```typescript
// 例：「今日の会議ノートを作成して、関連する過去の議事録もリンクして」
// 
// 1. ユーザー指示理解
// 2. エージェントが計画立案：
//    - 今日の日付で会議ノート作成
//    - 過去の議事録を検索
//    - 関連リンクを作成
//    - 適切なテンプレート適用
// 3. 自立実行（ユーザーの追加指示なしに完了まで）
// 4. 結果報告
```

### 🤖 **エージェント実行エンジン**

```typescript
export class AgentExecutor {
  private tools: ObsidianTools;
  private aiProvider: AIProvider;
  private maxSteps: number = 10; // 無限ループ防止
  
  async executeTask(userInstruction: string): Promise<TaskResult> {
    const conversation: Message[] = [{
      role: 'user',
      content: userInstruction
    }];
    
    let step = 0;
    let taskCompleted = false;
    const executionLog: ExecutionStep[] = [];
    
    while (!taskCompleted && step < this.maxSteps) {
      step++;
      
      // AI に次のアクションを決定させる
      const response = await this.aiProvider.generateResponse(
        conversation,
        this.tools.getToolDefinitions(),
        {
          systemPrompt: this.getAgentSystemPrompt(),
          temperature: 0.1 // 安定した判断のため低温度
        }
      );
      
      conversation.push({
        role: 'assistant',
        content: response.content
      });
      
      // ツール実行判定
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          const result = await this.executeToolCall(toolCall);
          
          // 実行ログ記録
          executionLog.push({
            step,
            action: toolCall.function.name,
            parameters: toolCall.function.arguments,
            result,
            timestamp: new Date()
          });
          
          // 結果をconversationに追加
          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      } else {
        // ツール実行がない = タスク完了の可能性
        taskCompleted = this.isTaskCompleted(response.content);
      }
    }
    
    return {
      completed: taskCompleted,
      steps: step,
      executionLog,
      finalMessage: conversation[conversation.length - 1].content
    };
  }
  
  private getAgentSystemPrompt(): string {
    return `あなたはObsidianの知識管理を支援する自立型AIエージェントです。

役割:
- ユーザーの指示を理解し、完了まで自立的に実行する
- 必要に応じて複数のツールを組み合わせて使用する
- 各ステップの理由を説明しながら実行する
- タスクが完了したら明確に報告する

利用可能なツール:
${this.tools.getToolList()}

重要な指針:
1. ユーザーの指示を正確に理解する
2. 計画を立ててから実行する
3. 各アクションの理由を説明する
4. エラーが起きたら適切に対処する
5. 完了時は結果をまとめて報告する

タスクが完了したと判断したら、最後に「タスクが完了しました。」と明記してください。`;
  }
  
  private isTaskCompleted(content: string): boolean {
    const completionPhrases = [
      'タスクが完了しました',
      'すべて完了しました',
      '作業を終了します',
      'タスク終了'
    ];
    
    return completionPhrases.some(phrase => 
      content.includes(phrase)
    );
  }
}
```

### 🛠️ **ツール定義と実行**

```typescript
export class ObsidianTools {
  private app: App;
  
  getToolDefinitions(): FunctionDefinition[] {
    return [
      {
        name: 'create_note',
        description: '新しいノートを作成する',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'ノートのタイトル' },
            content: { type: 'string', description: 'ノートの内容' },
            folder: { type: 'string', description: '作成するフォルダ（オプション）' },
            template: { type: 'string', description: '使用するテンプレート（オプション）' }
          },
          required: ['title']
        }
      },
      {
        name: 'search_notes',
        description: 'ノートを検索する',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '検索クエリ' },
            limit: { type: 'number', description: '最大検索結果数', default: 10 },
            include_content: { type: 'boolean', description: '内容も検索対象にするか', default: true }
          },
          required: ['query']
        }
      },
      {
        name: 'read_note',
        description: '指定したノートの内容を読み取る',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'ノートのパス' }
          },
          required: ['path']
        }
      },
      {
        name: 'update_note',
        description: 'ノートの内容を更新する',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'ノートのパス' },
            content: { type: 'string', description: '新しい内容' },
            append: { type: 'boolean', description: '既存内容に追記するか', default: false }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'create_link',
        description: 'ノート間にリンクを作成する',
        parameters: {
          type: 'object',
          properties: {
            source_note: { type: 'string', description: 'リンク元ノートのパス' },
            target_note: { type: 'string', description: 'リンク先ノートのパス' },
            link_text: { type: 'string', description: 'リンクテキスト（オプション）' },
            context: { type: 'string', description: 'リンクを挿入する文脈（オプション）' }
          },
          required: ['source_note', 'target_note']
        }
      },
      {
        name: 'get_vault_structure',
        description: 'ボルトの構造（フォルダ・ファイル一覧）を取得する',
        parameters: {
          type: 'object',
          properties: {
            max_depth: { type: 'number', description: '最大探索深度', default: 3 },
            include_content_summary: { type: 'boolean', description: '各ファイルの要約を含むか', default: false }
          }
        }
      },
      {
        name: 'apply_template',
        description: 'テンプレートを適用してノートを作成または更新する',
        parameters: {
          type: 'object',
          properties: {
            template_name: { type: 'string', description: 'テンプレート名' },
            variables: { type: 'object', description: 'テンプレート変数' },
            target_note: { type: 'string', description: '対象ノートのパス（新規作成の場合は省略）' }
          },
          required: ['template_name']
        }
      }
    ];
  }
  
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const { name, arguments: args } = toolCall.function;
    
    try {
      switch (name) {
        case 'create_note':
          return await this.createNote(args);
        case 'search_notes':
          return await this.searchNotes(args);
        case 'read_note':
          return await this.readNote(args);
        case 'update_note':
          return await this.updateNote(args);
        case 'create_link':
          return await this.createLink(args);
        case 'get_vault_structure':
          return await this.getVaultStructure(args);
        case 'apply_template':
          return await this.applyTemplate(args);
        default:
          return {
            success: false,
            message: `未知のツール: ${name}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `ツール実行エラー (${name}): ${error.message}`
      };
    }
  }
  
  // 個別ツール実装...
  private async createNote(args: any): Promise<ToolResult> {
    // 実装詳細
  }
  
  private async searchNotes(args: any): Promise<ToolResult> {
    // 実装詳細
  }
  
  // ... 他のツール実装
}
```

### 💬 **エージェント実行の可視化**

```typescript
const AgentExecutionView: React.FC<{
  execution: TaskExecution;
  onCancel: () => void;
}> = ({ execution, onCancel }) => {
  return (
    <div className="agent-execution">
      <div className="execution-header">
        <h3>🤖 エージェント実行中...</h3>
        <button onClick={onCancel} className="cancel-btn">
          中止
        </button>
      </div>
      
      <div className="execution-progress">
        <div className="current-step">
          ステップ {execution.currentStep} / {execution.maxSteps}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(execution.currentStep / execution.maxSteps) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="execution-log">
        {execution.steps.map((step, index) => (
          <ExecutionStepDisplay key={index} step={step} />
        ))}
      </div>
      
      {execution.currentThinking && (
        <div className="thinking">
          <div className="thinking-header">
            <Icon name="brain" />
            思考中...
          </div>
          <div className="thinking-content">
            {execution.currentThinking}
          </div>
        </div>
      )}
    </div>
  );
};

const ExecutionStepDisplay: React.FC<{ step: ExecutionStep }> = ({ step }) => {
  return (
    <div className="execution-step">
      <div className="step-header">
        <Icon name={getToolIcon(step.action)} />
        <span className="step-number">Step {step.step}</span>
        <span className="step-action">{step.action}</span>
        <span className="step-status">
          {step.result.success ? '✅' : '❌'}
        </span>
      </div>
      
      <div className="step-details">
        <div className="step-description">
          {getToolDescription(step.action, step.parameters)}
        </div>
        
        {step.result.message && (
          <div className="step-result">
            <strong>結果:</strong> {step.result.message}
          </div>
        )}
        
        {step.result.data && (
          <details className="step-data">
            <summary>詳細データ</summary>
            <pre>{JSON.stringify(step.result.data, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};
```

### 🎯 **使用例シナリオ**

#### シナリオ1: 研究ノート整理

```
ユーザー: 「機械学習に関するノートを整理して、学習マップを作成して」

エージェント実行:
1. 🔍 search_notes("機械学習") → 関連ノート15件発見
2. 📖 read_note() → 各ノートの内容を分析
3. 🗂️ create_note("機械学習_学習マップ", template="mindmap") → マップノート作成
4. 🔗 create_link() → 関連ノートをマップにリンク
5. 📝 update_note() → マップに学習進度と関係性を追記

結果報告: 「機械学習に関する15件のノートを整理し、学習マップを作成しました。」
```

#### シナリオ2: 日次レビュー準備

```
ユーザー: 「今日作成したノートをまとめて、明日のタスクも抽出して」

エージェント実行:
1. 🗂️ get_vault_structure() → 今日の更新ファイル特定
2. 📖 read_note() → 各ファイルの内容確認
3. 📝 create_note("日次レビュー_2024-06-26") → レビューノート作成
4. 📝 update_note() → 作成したノートの要約を追加
5. 🔍 search_notes("TODO|タスク|明日") → タスクキーワード検索
6. 📝 update_note() → 明日のタスクリストを追加

結果報告: 「今日作成した5件のノートをまとめ、明日のタスク3件を抽出しました。」
```

### 📋 **実装優先度**

#### フェーズ1-1 (最優先・1週間)
1. ✅ **基本的なエージェント実行エンジン**
2. ✅ **主要ツール実装（create, read, search, update）**
3. ✅ **シンプルな実行可視化**
4. ✅ **エラーハンドリング**

#### フェーズ1-2 (重要・2週間)
1. 📋 **高度な計画立案（マルチステップタスク）**
2. 📋 **実行中断・再開機能**
3. 📋 **実行履歴保存**
4. 📋 **ツール追加（link creation, templates）**

#### フェーズ1-3 (拡張・3-4週間)
1. 📋 **コンテキスト理解強化**
2. 📋 **カスタムツール作成機能**
3. 📋 **実行効率最適化**
4. 📋 **ユーザーフィードバック学習**

## まとめ

この設計により：

- **自立性**: ユーザー指示から完了まで自動実行
- **透明性**: 各ステップの可視化
- **制御性**: 必要時の中断・修正
- **拡張性**: 新しいツール・タスクの追加

ClaudeCodeのような使いやすさと、OpenHandsのような自立性を兼ね備えたエージェントシステムを実現できます。