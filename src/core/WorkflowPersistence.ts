/**
 * Workflow state persistence and recovery system
 * Handles saving/loading workflow states for interruption recovery
 */

import { App } from 'obsidian';
import { WorkflowState, WorkflowStateManager } from './WorkflowState';
import { STATE_CONSTANTS } from '../utils/constants';

export interface PersistenceConfig {
  enablePersistence: boolean;
  persistenceInterval: number;
  maxStateSize: number;
  retentionDays: number;
  storageLocation: 'vault' | 'plugin-data';
}

export interface PersistedWorkflow {
  workflowId: string;
  sessionId: string;
  timestamp: Date;
  state: string; // Serialized WorkflowState
  metadata: {
    version: string;
    userRequest: string;
    phase: string;
    iteration: number;
  };
}

/**
 * Workflow persistence manager
 */
export class WorkflowPersistence {
  private app: App;
  private config: PersistenceConfig;
  private persistenceInterval?: NodeJS.Timeout;
  private pendingPersistence = new Map<string, WorkflowState>();

  constructor(app: App, config?: Partial<PersistenceConfig>) {
    this.app = app;
    this.config = {
      enablePersistence: true,
      persistenceInterval: STATE_CONSTANTS.PERSISTENCE_INTERVAL_MS,
      maxStateSize: STATE_CONSTANTS.MAX_STATE_SIZE,
      retentionDays: 7,
      storageLocation: 'plugin-data',
      ...config
    };

    if (this.config.enablePersistence) {
      this.startPeriodicPersistence();
    }
  }

  /**
   * Save workflow state to persistent storage
   */
  async saveWorkflowState(workflowState: WorkflowState): Promise<boolean> {
    if (!this.config.enablePersistence) {
      return false;
    }

    try {
      const stateManager = new WorkflowStateManager(workflowState);
      const serializedState = stateManager.serialize();
      
      // Check size limits
      if (serializedState.length > this.config.maxStateSize) {
        console.warn(`Workflow state too large (${serializedState.length} bytes), skipping persistence`);
        return false;
      }

      const persistedWorkflow: PersistedWorkflow = {
        workflowId: workflowState.workflowId,
        sessionId: workflowState.sessionId,
        timestamp: new Date(),
        state: serializedState,
        metadata: {
          version: '1.0.0',
          userRequest: workflowState.originalRequest,
          phase: workflowState.currentPhase,
          iteration: workflowState.currentIteration
        }
      };

      const success = await this.writeToStorage(persistedWorkflow);
      
      if (success) {
        console.log(`Persisted workflow ${workflowState.workflowId} (${serializedState.length} bytes)`);
      }

      return success;

    } catch (error) {
      console.error('Failed to save workflow state:', error);
      return false;
    }
  }

  /**
   * Load workflow state from persistent storage
   */
  async loadWorkflowState(workflowId: string): Promise<WorkflowState | null> {
    if (!this.config.enablePersistence) {
      return null;
    }

    try {
      const persistedWorkflow = await this.readFromStorage(workflowId);
      
      if (!persistedWorkflow) {
        return null;
      }

      // Deserialize state
      const workflowState = WorkflowStateManager.deserialize(persistedWorkflow.state);
      
      console.log(`Loaded workflow ${workflowId} from persistence`);
      return workflowState;

    } catch (error) {
      console.error('Failed to load workflow state:', error);
      return null;
    }
  }

  /**
   * List all persisted workflows for a session
   */
  async listPersistedWorkflows(sessionId?: string): Promise<PersistedWorkflow[]> {
    if (!this.config.enablePersistence) {
      return [];
    }

    try {
      const allWorkflows = await this.listAllFromStorage();
      
      if (sessionId) {
        return allWorkflows.filter(w => w.sessionId === sessionId);
      }
      
      return allWorkflows;

    } catch (error) {
      console.error('Failed to list persisted workflows:', error);
      return [];
    }
  }

  /**
   * Clean up old persisted workflows
   */
  async cleanupOldWorkflows(): Promise<number> {
    if (!this.config.enablePersistence) {
      return 0;
    }

    try {
      const allWorkflows = await this.listAllFromStorage();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
      
      const oldWorkflows = allWorkflows.filter(w => 
        new Date(w.timestamp) < cutoffDate
      );

      let cleanedCount = 0;
      for (const workflow of oldWorkflows) {
        const success = await this.deleteFromStorage(workflow.workflowId);
        if (success) {
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old workflow states`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('Failed to cleanup old workflows:', error);
      return 0;
    }
  }

  /**
   * Queue workflow state for periodic persistence
   */
  queueForPersistence(workflowState: WorkflowState): void {
    if (this.config.enablePersistence) {
      this.pendingPersistence.set(workflowState.workflowId, workflowState);
    }
  }

  /**
   * Start periodic persistence of queued states
   */
  private startPeriodicPersistence(): void {
    this.persistenceInterval = setInterval(async () => {
      if (this.pendingPersistence.size > 0) {
        const statesToPersist = Array.from(this.pendingPersistence.values());
        this.pendingPersistence.clear();

        for (const state of statesToPersist) {
          await this.saveWorkflowState(state);
        }
      }
    }, this.config.persistenceInterval);
  }

  /**
   * Stop periodic persistence
   */
  stopPeriodicPersistence(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = undefined;
    }
  }

  /**
   * Get persistence statistics
   */
  async getStats(): Promise<{
    totalWorkflows: number;
    totalSize: number;
    oldestWorkflow?: Date;
    newestWorkflow?: Date;
  }> {
    try {
      const allWorkflows = await this.listAllFromStorage();
      
      let totalSize = 0;
      let oldestDate: Date | undefined;
      let newestDate: Date | undefined;

      for (const workflow of allWorkflows) {
        totalSize += workflow.state.length;
        
        const workflowDate = new Date(workflow.timestamp);
        if (!oldestDate || workflowDate < oldestDate) {
          oldestDate = workflowDate;
        }
        if (!newestDate || workflowDate > newestDate) {
          newestDate = workflowDate;
        }
      }

      return {
        totalWorkflows: allWorkflows.length,
        totalSize,
        oldestWorkflow: oldestDate,
        newestWorkflow: newestDate
      };

    } catch (error) {
      console.error('Failed to get persistence stats:', error);
      return {
        totalWorkflows: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Write workflow to storage backend
   */
  private async writeToStorage(workflow: PersistedWorkflow): Promise<boolean> {
    try {
      if (this.config.storageLocation === 'vault') {
        return await this.writeToVault(workflow);
      } else {
        return await this.writeToPluginData(workflow);
      }
    } catch (error) {
      console.error('Storage write failed:', error);
      return false;
    }
  }

  /**
   * Read workflow from storage backend
   */
  private async readFromStorage(workflowId: string): Promise<PersistedWorkflow | null> {
    try {
      if (this.config.storageLocation === 'vault') {
        return await this.readFromVault(workflowId);
      } else {
        return await this.readFromPluginData(workflowId);
      }
    } catch (error) {
      console.error('Storage read failed:', error);
      return null;
    }
  }

  /**
   * List all workflows from storage backend
   */
  private async listAllFromStorage(): Promise<PersistedWorkflow[]> {
    try {
      if (this.config.storageLocation === 'vault') {
        return await this.listAllFromVault();
      } else {
        return await this.listAllFromPluginData();
      }
    } catch (error) {
      console.error('Storage list failed:', error);
      return [];
    }
  }

  /**
   * Delete workflow from storage backend
   */
  private async deleteFromStorage(workflowId: string): Promise<boolean> {
    try {
      if (this.config.storageLocation === 'vault') {
        return await this.deleteFromVault(workflowId);
      } else {
        return await this.deleteFromPluginData(workflowId);
      }
    } catch (error) {
      console.error('Storage delete failed:', error);
      return false;
    }
  }

  /**
   * Vault-based storage implementation
   */
  private async writeToVault(workflow: PersistedWorkflow): Promise<boolean> {
    const filePath = `.obsius/workflows/${workflow.workflowId}.json`;
    
    try {
      // Ensure directory exists
      const dirPath = '.obsius/workflows';
      if (!(await this.app.vault.adapter.exists(dirPath))) {
        await this.app.vault.createFolder(dirPath);
      }

      await this.app.vault.adapter.write(filePath, JSON.stringify(workflow, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to write to vault:', error);
      return false;
    }
  }

  private async readFromVault(workflowId: string): Promise<PersistedWorkflow | null> {
    const filePath = `.obsius/workflows/${workflowId}.json`;
    
    try {
      if (!(await this.app.vault.adapter.exists(filePath))) {
        return null;
      }

      const content = await this.app.vault.adapter.read(filePath);
      const workflow = JSON.parse(content) as PersistedWorkflow;
      
      // Convert timestamp back to Date
      workflow.timestamp = new Date(workflow.timestamp);
      
      return workflow;
    } catch (error) {
      console.error('Failed to read from vault:', error);
      return null;
    }
  }

  private async listAllFromVault(): Promise<PersistedWorkflow[]> {
    const dirPath = '.obsius/workflows';
    
    try {
      if (!(await this.app.vault.adapter.exists(dirPath))) {
        return [];
      }

      const files = await this.app.vault.adapter.list(dirPath);
      const workflows: PersistedWorkflow[] = [];

      for (const file of files.files) {
        if (file.endsWith('.json')) {
          const content = await this.app.vault.adapter.read(file);
          const workflow = JSON.parse(content) as PersistedWorkflow;
          workflow.timestamp = new Date(workflow.timestamp);
          workflows.push(workflow);
        }
      }

      return workflows;
    } catch (error) {
      console.error('Failed to list from vault:', error);
      return [];
    }
  }

  private async deleteFromVault(workflowId: string): Promise<boolean> {
    const filePath = `.obsius/workflows/${workflowId}.json`;
    
    try {
      if (await this.app.vault.adapter.exists(filePath)) {
        await this.app.vault.adapter.remove(filePath);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete from vault:', error);
      return false;
    }
  }

  /**
   * Plugin data storage implementation (fallback)
   */
  private async writeToPluginData(workflow: PersistedWorkflow): Promise<boolean> {
    // For now, use localStorage as fallback
    // In real implementation, would use Obsidian's plugin data API
    try {
      const key = `obsius_workflow_${workflow.workflowId}`;
      localStorage.setItem(key, JSON.stringify(workflow));
      return true;
    } catch (error) {
      console.error('Failed to write to plugin data:', error);
      return false;
    }
  }

  private async readFromPluginData(workflowId: string): Promise<PersistedWorkflow | null> {
    try {
      const key = `obsius_workflow_${workflowId}`;
      const data = localStorage.getItem(key);
      
      if (!data) {
        return null;
      }

      const workflow = JSON.parse(data) as PersistedWorkflow;
      workflow.timestamp = new Date(workflow.timestamp);
      
      return workflow;
    } catch (error) {
      console.error('Failed to read from plugin data:', error);
      return null;
    }
  }

  private async listAllFromPluginData(): Promise<PersistedWorkflow[]> {
    try {
      const workflows: PersistedWorkflow[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('obsius_workflow_')) {
          const data = localStorage.getItem(key);
          if (data) {
            const workflow = JSON.parse(data) as PersistedWorkflow;
            workflow.timestamp = new Date(workflow.timestamp);
            workflows.push(workflow);
          }
        }
      }

      return workflows;
    } catch (error) {
      console.error('Failed to list from plugin data:', error);
      return [];
    }
  }

  private async deleteFromPluginData(workflowId: string): Promise<boolean> {
    try {
      const key = `obsius_workflow_${workflowId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete from plugin data:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicPersistence();
    this.pendingPersistence.clear();
  }
}