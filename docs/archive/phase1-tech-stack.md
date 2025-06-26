# Phase 1: 技術スタック詳細とプロジェクト構造

## 概要

Obsiusの実装に向けた技術スタックの詳細選定と、メンテナブルで拡張可能なプロジェクト構造を定義します。Obsidianプラグインの制約と、エージェント機能の要求を両立する技術選択を行います。

## 技術スタック選定

### 🏗️ **コア技術**

#### 1. TypeScript + React
```json
{
  "typescript": "^5.3.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
}
```

**選定理由**:
- Obsidianプラグインの標準的選択
- 型安全性によるバグ削減
- Rich UIコンポーネント開発

#### 2. Obsidian Plugin API
```typescript
// main.ts で使用する基本API
import { Plugin, App, WorkspaceLeaf, ItemView, TFile } from 'obsidian';

// 型定義の拡張
declare module 'obsidian' {
  interface App {
    plugins: {
      enabledPlugins: Set<string>;
      plugins: { [id: string]: any };
    };
  }
}
```

### 🤖 **AI/ML 統合**

#### 1. AI Provider統合（LiteLLM風アプローチ）
```typescript
// マルチプロバイダー対応
interface AIProvider {
  name: string;
  models: string[];
  apiKey: string;
  baseURL?: string;
}

// 統一インターフェース
class UnifiedAIClient {
  async completion(params: CompletionParams): Promise<CompletionResponse> {
    switch (params.provider) {
      case 'openai':
        return await this.openaiCompletion(params);
      case 'anthropic':
        return await this.anthropicCompletion(params);
      case 'google':
        return await this.googleCompletion(params);
      default:
        throw new Error(`Unsupported provider: ${params.provider}`);
    }
  }
}
```

#### 2. 依存関係
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@google/generative-ai": "^0.3.0",
    "zod": "^3.22.0"
  }
}
```

### 🎨 **UI/UX ライブラリ**

#### 1. UI Components
```json
{
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "prismjs": "^1.29.0",
  "lucide-react": "^0.300.0"
}
```

#### 2. カスタムUIライブラリ
```typescript
// src/ui/components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Avatar } from './Avatar';
export { Badge } from './Badge';
export { Toast } from './Toast';

// Obsidian テーマに合わせたスタイリング
export const useObsidianTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.body.classList.contains('theme-dark');
      setTheme(isDark ? 'dark' : 'light');
    };
    
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  return theme;
};
```

### 🔧 **開発ツール**

#### 1. ビルドツール
```json
{
  "devDependencies": {
    "esbuild": "^0.19.0",
    "esbuild-plugin-copy": "^2.1.0",
    "@types/node": "^20.0.0",
    "builtin-modules": "^3.3.0"
  }
}
```

#### 2. 品質管理ツール
```json
{
  "devDependencies": {
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

#### 3. ビルド設定
```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';

const prod = process.argv[2] === 'production';

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr'
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
  plugins: [
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['./manifest.json', './styles.css'],
        to: ['.']
      }
    })
  ]
}).catch(() => process.exit(1));
```

## プロジェクト構造

### 📁 **ディレクトリ構造**

```
obsius/
├── src/
│   ├── main.ts                    # メインプラグインファイル
│   ├── types/                     # 型定義
│   │   ├── agent.ts              # エージェント関連の型
│   │   ├── chat.ts               # チャット関連の型
│   │   ├── security.ts           # セキュリティ関連の型
│   │   └── obsidian.ts           # Obsidian拡張型
│   ├── core/                      # コアロジック
│   │   ├── agent/                # エージェントシステム
│   │   │   ├── AgentExecutor.ts  # エージェント実行エンジン
│   │   │   ├── TaskPlanner.ts    # タスク計画
│   │   │   └── ToolRegistry.ts   # ツール管理
│   │   ├── ai/                   # AI統合
│   │   │   ├── AIProviderManager.ts
│   │   │   ├── providers/        # 個別プロバイダー
│   │   │   │   ├── OpenAIProvider.ts
│   │   │   │   ├── AnthropicProvider.ts
│   │   │   │   └── GoogleProvider.ts
│   │   │   └── UnifiedClient.ts
│   │   ├── security/             # セキュリティ
│   │   │   ├── SecurityManager.ts
│   │   │   ├── RiskAssessment.ts
│   │   │   └── OperationHistory.ts
│   │   └── obsidian/             # Obsidian統合
│   │       ├── ObsidianTools.ts  # Obsidian操作ツール
│   │       ├── VaultManager.ts   # ボルト管理
│   │       └── FileOperations.ts # ファイル操作
│   ├── ui/                       # UI コンポーネント
│   │   ├── components/           # 再利用可能コンポーネント
│   │   │   ├── chat/            # チャット関連
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── AgentExecution.tsx
│   │   │   ├── common/          # 共通コンポーネント
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Toast.tsx
│   │   │   └── agent/           # エージェント関連
│   │   │       ├── ExecutionSteps.tsx
│   │   │       ├── ThinkingDisplay.tsx
│   │   │       └── SecurityConfirmation.tsx
│   │   ├── views/               # Obsidianビュー
│   │   │   ├── ChatView.tsx     # メインチャットビュー
│   │   │   ├── SettingsView.tsx # 設定ビュー
│   │   │   └── HistoryView.tsx  # 履歴ビュー
│   │   ├── contexts/            # React Context
│   │   │   ├── ObsiusProvider.tsx
│   │   │   ├── ChatContext.tsx
│   │   │   ├── AgentContext.tsx
│   │   │   └── SecurityContext.tsx
│   │   └── hooks/               # カスタムHooks
│   │       ├── useChat.ts
│   │       ├── useAgent.ts
│   │       ├── useSecurity.ts
│   │       └── useObsidian.ts
│   ├── utils/                   # ユーティリティ
│   │   ├── logger.ts           # ログ機能
│   │   ├── crypto.ts           # 暗号化
│   │   ├── storage.ts          # データ永続化
│   │   ├── validation.ts       # バリデーション
│   │   └── formatting.ts       # フォーマット
│   └── config/                 # 設定
│       ├── defaults.ts         # デフォルト設定
│       ├── schemas.ts          # 設定スキーマ
│       └── constants.ts        # 定数定義
├── styles/                     # スタイル
│   ├── main.css               # メインスタイル
│   ├── components/            # コンポーネント別スタイル
│   ├── themes/                # テーマ別スタイル
│   └── variables.css          # CSS変数
├── docs/                      # ドキュメント
├── tests/                     # テスト
│   ├── unit/                  # ユニットテスト
│   ├── integration/           # 統合テスト
│   └── e2e/                   # E2Eテスト
├── manifest.json              # プラグインマニフェスト
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── README.md
```

### 🏗️ **アーキテクチャ層定義**

#### 1. プラグイン層（main.ts）
```typescript
export default class ObsiusPlugin extends Plugin {
  private agentExecutor?: AgentExecutor;
  private aiProviderManager?: AIProviderManager;
  private securityManager?: SecurityManager;
  private obsidianTools?: ObsidianTools;
  
  // 軽量な初期化
  async onload() {
    // 設定読み込み
    await this.loadSettings();
    
    // ビューの登録
    this.registerViews();
    
    // コマンドの登録
    this.registerCommands();
    
    // サービスは遅延初期化
  }
  
  // 必要時にサービス初期化
  private getAgentExecutor(): AgentExecutor {
    if (!this.agentExecutor) {
      this.agentExecutor = new AgentExecutor(
        this.getAIProviderManager(),
        this.getObsidianTools(),
        this.getSecurityManager()
      );
    }
    return this.agentExecutor;
  }
}
```

#### 2. コア層（core/）
```typescript
// エージェント実行の中核
export class AgentExecutor {
  async executeTask(instruction: string): Promise<TaskResult> {
    // 1. タスク理解
    const plan = await this.taskPlanner.createPlan(instruction);
    
    // 2. セキュリティチェック
    const riskAssessment = await this.securityManager.assessPlan(plan);
    
    // 3. ユーザー確認（必要に応じて）
    if (riskAssessment.requiresConfirmation) {
      const approved = await this.requestUserConfirmation(plan, riskAssessment);
      if (!approved) return { cancelled: true };
    }
    
    // 4. 実行
    return await this.executePlan(plan);
  }
}

// AI プロバイダー管理
export class AIProviderManager {
  private providers = new Map<string, AIProvider>();
  
  async generateResponse(
    messages: Message[],
    options: GenerationOptions
  ): Promise<AIResponse> {
    const provider = this.selectProvider(options);
    return await provider.generateResponse(messages, options);
  }
}
```

#### 3. UI層（ui/）
```typescript
// メインプロバイダー
export const ObsiusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ChatProvider>
      <AgentProvider>
        <SecurityProvider>
          <ObsidianProvider>
            {children}
          </ObsidianProvider>
        </SecurityProvider>
      </AgentProvider>
    </ChatProvider>
  );
};

// カスタムHooksで状態管理
export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
};
```

### 🔧 **開発フロー**

#### 1. 開発環境セットアップ
```bash
# 依存関係インストール
npm install

# 開発サーバー起動（ホットリロード）
npm run dev

# 型チェック
npm run type-check

# リンティング
npm run lint

# テスト実行
npm run test
```

#### 2. ビルドコマンド
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

#### 3. 設定ファイル
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2018",
    "lib": ["DOM", "ES6", "ES2017", "ES7"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/ui/components/*"],
      "@/core/*": ["src/core/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.*"]
}
```

### 🧪 **テスト戦略**

#### 1. ユニットテスト
```typescript
// tests/unit/core/AgentExecutor.test.ts
import { AgentExecutor } from '@/core/agent/AgentExecutor';
import { MockAIProvider } from '../mocks/MockAIProvider';

describe('AgentExecutor', () => {
  let executor: AgentExecutor;
  let mockAI: MockAIProvider;
  
  beforeEach(() => {
    mockAI = new MockAIProvider();
    executor = new AgentExecutor(mockAI, mockTools, mockSecurity);
  });
  
  test('should execute simple task', async () => {
    const result = await executor.executeTask('Create a note called "Test"');
    expect(result.success).toBe(true);
    expect(result.operations).toHaveLength(1);
  });
});
```

#### 2. 統合テスト
```typescript
// tests/integration/chat-flow.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/ui/components/chat/ChatInterface';

describe('Chat Flow Integration', () => {
  test('should handle complete chat flow', async () => {
    render(<ChatInterface />);
    
    const input = screen.getByPlaceholderText('Obsidianについて何でも聞いてください...');
    fireEvent.change(input, { target: { value: 'テストノートを作成して' } });
    
    const sendButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('ノート "テスト" を作成しました')).toBeInTheDocument();
    });
  });
});
```

### 📦 **デプロイ戦略**

#### 1. 開発版リリース
```bash
# バージョンアップ
npm version patch

# ビルド
npm run build

# マニフェスト更新
node scripts/update-manifest.js

# リリースノート生成
node scripts/generate-release-notes.js
```

#### 2. プロダクション準備
```typescript
// scripts/pre-release.ts
import { readFileSync, writeFileSync } from 'fs';

// マニフェスト更新
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

manifest.version = packageJson.version;
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));

// セキュリティチェック
// APIキーなどの機密情報が含まれていないかチェック
// バンドルサイズチェック
// 依存関係の脆弱性チェック
```

## まとめ

この技術スタック設計により：

- **開発効率**: TypeScript + React による型安全な開発
- **保守性**: 明確な層分離とモジュール設計
- **拡張性**: プラグイン型アーキテクチャ
- **品質保証**: 包括的なテスト戦略

実装に向けた堅牢な技術基盤が整いました。次はMVP機能の詳細定義に進みます。