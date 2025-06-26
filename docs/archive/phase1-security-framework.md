# Phase 1: セキュリティフレームワーク設計書

## 概要

Obsiusエージェントが自立的に行動するため、**ユーザーのデータとプライバシーを確実に保護**するセキュリティフレームワークが必要です。ClaudeCodeやGeminiCLIの安全性確保パターンを参考に設計します。

## セキュリティ設計方針

### 🛡️ **基本原則**

1. **最小権限の原則**: 必要最小限の権限のみ付与
2. **透明性**: すべての操作をユーザーに可視化
3. **ユーザー制御**: 重要な操作は必ずユーザー確認
4. **データ保護**: ローカルファースト、外部流出防止
5. **操作可逆性**: 重要な変更は元に戻せる仕組み

### 🔒 **セキュリティレイヤー**

#### 1. 操作リスク評価システム

```typescript
export enum RiskLevel {
  LOW = 'low',      // 読み取り、検索など
  MEDIUM = 'medium', // ファイル作成、編集など
  HIGH = 'high',    // ファイル削除、大量操作など
  CRITICAL = 'critical' // システム設定変更など
}

export interface SecurityPolicy {
  // 自動実行可能な操作
  autoExecuteAllowed: string[];
  
  // 確認が必要な操作
  confirmationRequired: string[];
  
  // 禁止操作
  forbidden: string[];
  
  // バッチ操作の制限
  batchLimits: {
    maxFiles: number;
    maxSize: number; // bytes
  };
  
  // 外部アクセス制限
  externalAccess: {
    allowed: string[]; // 許可ドメイン
    blocked: string[]; // 禁止ドメイン
  };
}

export class SecurityManager {
  private policy: SecurityPolicy;
  
  constructor(policy: SecurityPolicy) {
    this.policy = policy;
  }
  
  async assessOperationRisk(operation: AgentOperation): Promise<RiskAssessment> {
    const risks: SecurityRisk[] = [];
    let riskLevel = RiskLevel.LOW;
    
    // 1. 操作タイプによる基本リスク評価
    switch (operation.type) {
      case 'read_note':
      case 'search_notes':
      case 'get_vault_structure':
        riskLevel = RiskLevel.LOW;
        break;
        
      case 'create_note':
      case 'update_note':
      case 'create_link':
        riskLevel = RiskLevel.MEDIUM;
        break;
        
      case 'delete_note':
      case 'move_note':
      case 'rename_note':
        riskLevel = RiskLevel.HIGH;
        risks.push({
          type: 'data_loss',
          description: 'ファイルの削除または移動による潜在的データ損失',
          mitigation: 'バックアップ確認、元に戻す機能の提供'
        });
        break;
        
      case 'batch_operation':
        if (operation.parameters.files?.length > this.policy.batchLimits.maxFiles) {
          riskLevel = RiskLevel.HIGH;
          risks.push({
            type: 'bulk_modification',
            description: `${operation.parameters.files.length}個のファイルに対する一括操作`,
            mitigation: 'プレビュー表示、段階的実行'
          });
        }
        break;
    }
    
    // 2. パラメータベースのリスク評価
    if (operation.parameters.overwrite === true) {
      risks.push({
        type: 'data_overwrite',
        description: '既存データの上書き',
        mitigation: 'バックアップ作成、差分表示'
      });
      riskLevel = this.elevateRisk(riskLevel, RiskLevel.MEDIUM);
    }
    
    // 3. ファイルサイズチェック
    if (operation.parameters.content && 
        operation.parameters.content.length > this.policy.batchLimits.maxSize) {
      risks.push({
        type: 'large_content',
        description: '大容量コンテンツの処理',
        mitigation: 'サイズ制限の適用'
      });
    }
    
    // 4. 外部リソースアクセスチェック
    if (operation.parameters.url || operation.parameters.external) {
      const externalRisk = this.assessExternalAccess(operation.parameters);
      if (externalRisk) {
        risks.push(externalRisk);
        riskLevel = this.elevateRisk(riskLevel, RiskLevel.MEDIUM);
      }
    }
    
    return {
      level: riskLevel,
      risks,
      requiresConfirmation: this.requiresConfirmation(operation.type, riskLevel),
      allowedToExecute: this.isAllowedToExecute(operation.type),
      mitigationActions: this.suggestMitigationActions(risks)
    };
  }
  
  private requiresConfirmation(operationType: string, riskLevel: RiskLevel): boolean {
    // 明示的に自動実行許可されている操作
    if (this.policy.autoExecuteAllowed.includes(operationType)) {
      return false;
    }
    
    // 明示的に確認必須の操作
    if (this.policy.confirmationRequired.includes(operationType)) {
      return true;
    }
    
    // リスクレベルベースの判定
    return riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
  }
  
  private isAllowedToExecute(operationType: string): boolean {
    return !this.policy.forbidden.includes(operationType);
  }
}
```

#### 2. ユーザー確認システム

```typescript
export class ConfirmationManager {
  async requestUserConfirmation(
    operation: AgentOperation,
    riskAssessment: RiskAssessment
  ): Promise<ConfirmationResult> {
    
    const confirmationDialog: ConfirmationDialog = {
      title: this.getConfirmationTitle(operation, riskAssessment.level),
      message: this.buildConfirmationMessage(operation, riskAssessment),
      riskLevel: riskAssessment.level,
      options: this.getConfirmationOptions(riskAssessment.level),
      preview: await this.generateOperationPreview(operation)
    };
    
    return await this.showConfirmationDialog(confirmationDialog);
  }
  
  private buildConfirmationMessage(
    operation: AgentOperation, 
    assessment: RiskAssessment
  ): string {
    let message = `エージェントが以下の操作を実行しようとしています:\n\n`;
    
    // 操作詳細
    message += `**操作**: ${this.getOperationDisplayName(operation.type)}\n`;
    message += `**対象**: ${this.formatOperationTarget(operation)}\n`;
    
    // リスク情報
    if (assessment.risks.length > 0) {
      message += `\n**⚠️ 検出されたリスク**:\n`;
      assessment.risks.forEach(risk => {
        message += `• ${risk.description}\n`;
        if (risk.mitigation) {
          message += `  → 対策: ${risk.mitigation}\n`;
        }
      });
    }
    
    // 影響範囲
    const impact = this.calculateOperationImpact(operation);
    if (impact.filesAffected > 0) {
      message += `\n**影響範囲**: ${impact.filesAffected}個のファイルが影響を受けます\n`;
    }
    
    return message;
  }
  
  private getConfirmationOptions(riskLevel: RiskLevel): ConfirmationOption[] {
    const baseOptions = [
      { 
        id: 'approve', 
        label: '実行する', 
        style: 'primary',
        description: 'この操作を実行します'
      },
      { 
        id: 'cancel', 
        label: 'キャンセル', 
        style: 'secondary',
        description: '操作をキャンセルします'
      }
    ];
    
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      return [
        {
          id: 'approve_with_backup',
          label: 'バックアップして実行',
          style: 'primary',
          description: 'バックアップを作成してから実行します'
        },
        {
          id: 'preview',
          label: 'プレビューを見る',
          style: 'secondary',
          description: '実行せずに変更内容を確認します'
        },
        ...baseOptions
      ];
    }
    
    return baseOptions;
  }
}
```

#### 3. データ保護機能

```typescript
export class DataProtectionManager {
  private backupManager: BackupManager;
  private encryptionManager: EncryptionManager;
  
  async protectOperation(operation: AgentOperation): Promise<ProtectionResult> {
    const protections: DataProtection[] = [];
    
    // 1. 自動バックアップ
    if (this.shouldCreateBackup(operation)) {
      const backup = await this.backupManager.createBackup({
        files: this.getAffectedFiles(operation),
        reason: `Before ${operation.type}`,
        timestamp: new Date()
      });
      
      protections.push({
        type: 'backup',
        description: 'Automatic backup created',
        data: { backupId: backup.id, files: backup.files.length }
      });
    }
    
    // 2. 機密データチェック
    const sensitiveData = await this.detectSensitiveData(operation);
    if (sensitiveData.length > 0) {
      protections.push({
        type: 'sensitive_data_warning',
        description: 'Sensitive data detected',
        data: { types: sensitiveData }
      });
    }
    
    // 3. 外部送信データチェック
    if (operation.type.includes('external') || operation.parameters.url) {
      const dataToSend = this.extractDataToSend(operation);
      const sanitized = await this.sanitizeExternalData(dataToSend);
      
      protections.push({
        type: 'data_sanitization',
        description: 'Data sanitized for external transmission',
        data: { original: dataToSend.length, sanitized: sanitized.length }
      });
    }
    
    return {
      protections,
      canProceed: this.evaluateProtectionResult(protections),
      recommendations: this.generateProtectionRecommendations(protections)
    };
  }
  
  private async detectSensitiveData(operation: AgentOperation): Promise<string[]> {
    const sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,          // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/,                                // SSN
      /api[_-]?key|secret|token|password/i,                   // API keys
      /sk-[a-zA-Z0-9]{48}/                                    // OpenAI API key
    ];
    
    const content = operation.parameters.content || '';
    const detected: string[] = [];
    
    sensitivePatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        const types = ['email', 'credit_card', 'ssn', 'api_key', 'openai_key'];
        detected.push(types[index]);
      }
    });
    
    return detected;
  }
}
```

#### 4. 操作履歴とロールバック

```typescript
export class OperationHistoryManager {
  private history: OperationRecord[] = [];
  private maxHistorySize = 1000;
  
  async recordOperation(
    operation: AgentOperation,
    result: OperationResult
  ): Promise<void> {
    const record: OperationRecord = {
      id: generateId(),
      timestamp: new Date(),
      operation,
      result,
      beforeState: await this.captureState(operation),
      afterState: result.success ? await this.captureState(operation) : null,
      reversible: this.isReversible(operation),
      rollbackData: result.success ? await this.createRollbackData(operation) : null
    };
    
    this.history.push(record);
    
    // 履歴サイズ制限
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
    
    // 永続化
    await this.persistHistory();
  }
  
  async rollbackOperation(recordId: string): Promise<RollbackResult> {
    const record = this.history.find(r => r.id === recordId);
    if (!record) {
      return { success: false, message: 'Operation record not found' };
    }
    
    if (!record.reversible || !record.rollbackData) {
      return { success: false, message: 'Operation is not reversible' };
    }
    
    try {
      await this.executeRollback(record.rollbackData);
      
      return {
        success: true,
        message: `Operation ${record.operation.type} has been rolled back`,
        restoredFiles: record.rollbackData.files || []
      };
    } catch (error) {
      return {
        success: false,
        message: `Rollback failed: ${error.message}`
      };
    }
  }
  
  private isReversible(operation: AgentOperation): boolean {
    const reversibleOperations = [
      'create_note',
      'update_note',
      'create_link',
      'move_note',
      'rename_note'
    ];
    
    return reversibleOperations.includes(operation.type);
  }
  
  private async createRollbackData(operation: AgentOperation): Promise<RollbackData> {
    switch (operation.type) {
      case 'create_note':
        return {
          type: 'delete_file',
          targetPath: operation.parameters.path
        };
        
      case 'update_note':
        const originalContent = await this.app.vault.read(
          this.app.vault.getAbstractFileByPath(operation.parameters.path)
        );
        return {
          type: 'restore_content',
          targetPath: operation.parameters.path,
          originalContent
        };
        
      case 'delete_note':
        const fileContent = await this.app.vault.read(
          this.app.vault.getAbstractFileByPath(operation.parameters.path)
        );
        return {
          type: 'restore_file',
          targetPath: operation.parameters.path,
          content: fileContent
        };
        
      default:
        return null;
    }
  }
}
```

### 🎛️ **セキュリティ設定UI**

```typescript
const SecuritySettingsPanel: React.FC = () => {
  const [policy, setPolicy] = useState<SecurityPolicy>(defaultPolicy);
  
  return (
    <div className="security-settings">
      <h3>🛡️ セキュリティ設定</h3>
      
      {/* 自動実行許可操作 */}
      <div className="setting-group">
        <h4>自動実行を許可する操作</h4>
        <CheckboxGroup
          options={AVAILABLE_OPERATIONS}
          selected={policy.autoExecuteAllowed}
          onChange={(selected) => 
            setPolicy({...policy, autoExecuteAllowed: selected})
          }
        />
      </div>
      
      {/* バッチ操作制限 */}
      <div className="setting-group">
        <h4>バッチ操作制限</h4>
        <NumberInput
          label="最大ファイル数"
          value={policy.batchLimits.maxFiles}
          onChange={(value) => 
            setPolicy({
              ...policy, 
              batchLimits: {...policy.batchLimits, maxFiles: value}
            })
          }
        />
        <NumberInput
          label="最大サイズ (MB)"
          value={policy.batchLimits.maxSize / (1024 * 1024)}
          onChange={(value) => 
            setPolicy({
              ...policy, 
              batchLimits: {...policy.batchLimits, maxSize: value * 1024 * 1024}
            })
          }
        />
      </div>
      
      {/* データ保護オプション */}
      <div className="setting-group">
        <h4>データ保護</h4>
        <Toggle
          label="自動バックアップを有効にする"
          checked={policy.autoBackup}
          onChange={(checked) => 
            setPolicy({...policy, autoBackup: checked})
          }
        />
        <Toggle
          label="機密データ検出を有効にする"
          checked={policy.sensitiveDataDetection}
          onChange={(checked) => 
            setPolicy({...policy, sensitiveDataDetection: checked})
          }
        />
      </div>
    </div>
  );
};
```

### 📋 **実装優先度**

#### フェーズ1-3 (最優先・1週間)
1. ✅ **基本リスク評価システム**
2. ✅ **シンプルな確認ダイアログ**
3. ✅ **操作履歴記録**
4. ✅ **基本的なロールバック機能**

#### フェーズ1-4 (重要・2週間)
1. 📋 **高度なリスク分析**
2. 📋 **自動バックアップシステム**
3. 📋 **機密データ検出**
4. 📋 **セキュリティ設定UI**

#### フェーズ1-5 (拡張・3-4週間)
1. 📋 **外部アクセス制御**
2. 📋 **詳細な操作プレビュー**
3. 📋 **セキュリティ監査ログ**
4. 📋 **アクセス権限管理**

## まとめ

このセキュリティフレームワークにより：

- **安全性**: 重要操作の確認とバックアップ
- **透明性**: すべての操作の可視化
- **制御性**: ユーザーによる細かい制御
- **回復性**: 問題発生時の迅速な復旧

エージェントの自立性を保ちながら、ユーザーのデータと信頼を確実に保護できます。