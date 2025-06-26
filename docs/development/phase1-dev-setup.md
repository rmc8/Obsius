# Phase 1: 開発環境セットアップガイド

## 概要

Obsiusプラグインの開発環境を効率的にセットアップするためのステップバイステップガイドです。開発者が迅速に開発を開始できるよう、必要なツール、設定、ワークフローを詳しく説明します。

## 前提条件

### 📋 **必要なソフトウェア**

```bash
# 1. Node.js (v18以上推奨)
node --version  # v18.0.0+

# 2. npm (v9以上推奨)
npm --version   # v9.0.0+

# 3. Git
git --version

# 4. Obsidian (v1.4.0以上)
# https://obsidian.md からダウンロード
```

### 🔧 **推奨開発ツール**

```bash
# VS Code (推奨エディタ)
# 必須拡張機能:
# - TypeScript and JavaScript Language Features
# - ESLint
# - Prettier
# - ES7+ React/Redux/React-Native snippets
# - Auto Rename Tag
# - Bracket Pair Colorization
```

## プロジェクト初期化

### 🚀 **ステップ1: プロジェクト作成**

```bash
# プロジェクトディレクトリ作成
mkdir obsius-plugin
cd obsius-plugin

# Git初期化
git init

# .gitignore作成
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.npm
.yarn-integrity

# Build outputs
main.js
main.js.map
*.tsbuildinfo

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*

# Environment variables
.env
.env.local
.env.*.local

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# Temporary folders
tmp/
temp/

# API keys (keep example files)
**/config/secrets.ts
!**/config/secrets.example.ts
EOF
```

### 📦 **ステップ2: package.json作成**

```bash
# package.json初期化
npm init -y

# package.jsonを以下の内容で更新
cat > package.json << 'EOF'
{
  "name": "obsius",
  "version": "0.1.0",
  "description": "AI Agent for Obsidian - Your intelligent knowledge management assistant",
  "main": "main.js",
  "keywords": ["obsidian", "ai", "agent", "knowledge-management"],
  "author": "Your Name",
  "license": "MIT",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "version-bump": "node scripts/version-bump.js",
    "prepare-release": "npm run build && npm run test && npm run version-bump"
  },
  "dependencies": {
    "openai": "^4.20.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@google/generative-ai": "^0.3.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "zod": "^3.22.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.19.0",
    "esbuild-plugin-copy": "^2.1.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "prettier": "^3.1.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
EOF
```

### ⚙️ **ステップ3: 設定ファイル作成**

```bash
# TypeScript設定
cat > tsconfig.json << 'EOF'
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
  "exclude": ["node_modules", "**/*.test.*", "dist"]
}
EOF

# ESLint設定
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['dist', 'node_modules'],
};
EOF

# Prettier設定
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF

# Jest設定
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
};
EOF
```

### 🏗️ **ステップ4: ビルド設定**

```bash
# esbuild設定
cat > esbuild.config.mjs << 'EOF'
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
  watch: !prod,
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
EOF
```

### 📄 **ステップ5: Obsidianプラグインファイル**

```bash
# manifest.json作成
cat > manifest.json << 'EOF'
{
  "id": "obsius",
  "name": "Obsius",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "AI Agent for Obsidian - Your intelligent knowledge management assistant",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourusername/obsius",
  "fundingUrl": "https://github.com/sponsors/yourusername",
  "isDesktopOnly": false
}
EOF

# styles.css作成
cat > styles.css << 'EOF'
/* Obsius Plugin Styles */

.obsius-main-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chat-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.message-history {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 16px;
}

.user-message {
  text-align: right;
}

.agent-message {
  text-align: left;
}

.chat-input {
  border-top: 1px solid var(--background-modifier-border);
  padding: 12px;
}

.input-container {
  display: flex;
  gap: 8px;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

/* Dark/Light theme compatibility */
.theme-dark .obsius-main-layout {
  color: var(--text-normal);
}

.theme-light .obsius-main-layout {
  color: var(--text-normal);
}
EOF
```

## ディレクトリ構造作成

### 📁 **ディレクトリ作成スクリプト**

```bash
# ディレクトリ構造作成
mkdir -p src/{types,core/{agent,ai/{providers},security,obsidian},ui/{components/{chat,common,agent},views,contexts,hooks},utils,config}
mkdir -p tests/{unit,integration,e2e,mocks}
mkdir -p docs/{development,api,user-guide}
mkdir -p scripts

# 基本ファイル作成
touch src/main.ts
touch src/types/{agent.ts,chat.ts,security.ts,obsidian.ts}
touch src/core/agent/{AgentExecutor.ts,TaskPlanner.ts,ToolRegistry.ts}
touch src/core/ai/{AIProviderManager.ts,UnifiedClient.ts}
touch src/core/ai/providers/{OpenAIProvider.ts,AnthropicProvider.ts,GoogleProvider.ts}
touch src/core/security/{SecurityManager.ts,RiskAssessment.ts,OperationHistory.ts}
touch src/core/obsidian/{ObsidianTools.ts,VaultManager.ts,FileOperations.ts}
touch src/ui/components/chat/{ChatInterface.tsx,MessageBubble.tsx,ChatInput.tsx}
touch src/ui/components/common/{Button.tsx,Modal.tsx,Input.tsx}
touch src/ui/views/{ChatView.tsx,SettingsView.tsx}
touch src/ui/contexts/{ObsiusProvider.tsx,ChatContext.tsx}
touch src/ui/hooks/{useChat.ts,useAgent.ts}
touch src/utils/{logger.ts,storage.ts,validation.ts}
touch src/config/{defaults.ts,schemas.ts,constants.ts}
touch tests/setup.ts

echo "✅ ディレクトリ構造作成完了"
```

## 開発ワークフロー

### 🚀 **ステップ6: 依存関係インストールと初期セットアップ**

```bash
# 依存関係インストール
npm install

# TypeScript型チェック
npm run type-check

# リンティング
npm run lint

# テスト実行
npm run test

echo "✅ 初期セットアップ完了"
```

### 🔧 **ステップ7: Obsidian開発環境統合**

```bash
# Obsidianプラグインフォルダーへのシンボリックリンク作成
# (実際のパスは環境に合わせて調整)

# macOS/Linux
OBSIDIAN_PLUGINS_PATH="$HOME/.obsidian/plugins"
ln -sf "$(pwd)" "$OBSIDIAN_PLUGINS_PATH/obsius"

# Windows (PowerShell管理者権限で実行)
# New-Item -ItemType SymbolicLink -Path "$env:APPDATA\obsidian\plugins\obsius" -Target "$(Get-Location)"

echo "✅ Obsidian統合完了"
```

### 📝 **ステップ8: 初期ファイル作成**

```bash
# メインプラグインファイル（最小実装）
cat > src/main.ts << 'EOF'
import { Plugin } from 'obsidian';

export default class ObsiusPlugin extends Plugin {
  async onload() {
    console.log('Loading Obsius plugin...');
    
    // 基本コマンド登録
    this.addCommand({
      id: 'open-chat',
      name: 'Open AI Chat',
      callback: () => {
        console.log('Chat command executed');
        // TODO: チャット画面を開く
      }
    });
    
    // リボンアイコン追加
    this.addRibbonIcon('bot', 'Obsius AI', () => {
      console.log('Ribbon icon clicked');
      // TODO: チャット画面を開く
    });
  }

  onunload() {
    console.log('Unloading Obsius plugin...');
  }
}
EOF

# テスト セットアップファイル
cat > tests/setup.ts << 'EOF'
// Jest setup for React Testing Library
import '@testing-library/jest-dom';

// Mock Obsidian API
global.app = {
  vault: {
    getMarkdownFiles: jest.fn(() => []),
    read: jest.fn(),
    create: jest.fn(),
    modify: jest.fn(),
  },
  workspace: {
    getActiveFile: jest.fn(),
    getLeaf: jest.fn(),
  },
} as any;

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
EOF
```

## VS Code設定

### ⚙️ **ワークスペース設定**

```bash
mkdir .vscode

# VS Code設定
cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/main.js": true,
    "**/main.js.map": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/main.js": true
  }
}
EOF

# デバッグ設定
cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    }
  ]
}
EOF

# タスク設定
cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Plugin",
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Start Development",
      "type": "npm",
      "script": "dev",
      "group": "build",
      "isBackground": true
    },
    {
      "label": "Run Tests",
      "type": "npm",
      "script": "test",
      "group": "test"
    }
  ]
}
EOF
```

## 開発フロー確認

### ✅ **最終確認**

```bash
# 1. ビルドテスト
npm run build
echo "✅ ビルド成功"

# 2. 型チェック
npm run type-check
echo "✅ 型チェック成功"

# 3. リンティング
npm run lint
echo "✅ リンティング成功"

# 4. テスト実行
npm run test
echo "✅ テスト成功"

# 5. 開発サーバー起動（別ターミナルで）
# npm run dev

echo "🎉 開発環境セットアップ完了！"
echo ""
echo "次のステップ:"
echo "1. npm run dev でホットリロード開発を開始"
echo "2. Obsidianでプラグインを有効化"
echo "3. コマンドパレットで 'Obsius' を検索してテスト"
echo ""
echo "開発Tips:"
echo "- src/ 配下のファイルを編集すると自動リビルド"
echo "- Obsidianで Ctrl+Shift+I でDevToolsを開いてデバッグ"
echo "- tests/ 配下にテストを追加して npm run test で実行"
```

## トラブルシューティング

### 🔧 **よくある問題と解決法**

```bash
# 1. Node.jsバージョンが古い場合
echo "Node.jsバージョン確認:"
node --version
echo "v18以上が必要です。https://nodejs.org からアップデート"

# 2. Obsidianプラグインが認識されない場合
echo "プラグインフォルダー確認:"
ls -la ~/.obsidian/plugins/
echo "obsius フォルダーが存在し、manifest.json があることを確認"

# 3. ビルドエラーが発生する場合
echo "依存関係再インストール:"
rm -rf node_modules package-lock.json
npm install

# 4. TypeScriptエラーが解決しない場合
echo "TypeScriptサーバー再起動 (VS Code):"
echo "Ctrl+Shift+P -> 'TypeScript: Restart TS Server'"
```

## 次のステップ

開発環境が整ったら：

1. **MVP機能実装**: Phase 1-7のMVP機能一覧に従って実装開始
2. **テスト駆動開発**: 新機能追加時は必ずテストから作成
3. **継続的統合**: GitHub Actionsなどでビルド・テストの自動化
4. **コードレビュー**: プルリクエストでのコード品質管理

開発環境の準備が完了しました！🚀