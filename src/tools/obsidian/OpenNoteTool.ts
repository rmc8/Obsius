/**
 * OpenNoteTool for Obsius - Open Notes in Tabs/Panes
 * 
 * This tool opens notes in the Obsidian workspace using the powerful
 * tab and pane management system for efficient navigation.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, OpenNoteParams } from '../../utils/types';
import { z } from 'zod';
import { TFile, WorkspaceLeaf, PaneType } from 'obsidian';

/**
 * Schema for open note parameters
 */
const OpenNoteParamsSchema = z.object({
  path: z.string()
    .optional()
    .describe('Exact path to the note file'),
  
  title: z.string()
    .optional()
    .describe('Note title for lookup (alternative to path)'),
  
  paneType: z.enum(['tab', 'split', 'window'])
    .default('tab')
    .describe('How to open the note: tab (current pane), split (new pane), or window (new window)'),
  
  splitDirection: z.enum(['horizontal', 'vertical'])
    .optional()
    .describe('Split direction when paneType is "split"'),
  
  focus: z.boolean()
    .default(true)
    .describe('Whether to focus the opened note'),
  
  viewState: z.object({
    mode: z.enum(['source', 'preview', 'live']).optional(),
    line: z.number().optional(),
    column: z.number().optional()
  }).optional()
    .describe('View state configuration for the opened note')
}).refine(
  data => data.path || data.title,
  {
    message: "Either 'path' or 'title' must be provided",
    path: ['path']
  }
);

/**
 * OpenNoteTool - Open notes in Obsidian workspace
 * 
 * Features:
 * - Multiple opening modes (tab, split pane, new window)
 * - Flexible note lookup (by path or title)
 * - Workspace navigation and focus control
 * - View state management (source/preview/live mode)
 * - Cursor positioning for precise navigation
 */
export class OpenNoteTool extends BaseTool<OpenNoteParams> {
  
  get name(): string {
    return 'open_note';
  }

  get description(): string {
    return 'Open a note in the Obsidian workspace with flexible pane management and navigation options';
  }

  get parameterSchema(): z.ZodSchema<OpenNoteParams> {
    return OpenNoteParamsSchema;
  }

  get riskLevel() {
    return 'low' as const;
  }

  /**
   * Resolve note file from path or title
   */
  private async resolveNoteFile(params: OpenNoteParams): Promise<TFile | null> {
    // If path is provided, use it directly
    if (params.path) {
      const file = this.app.vault.getAbstractFileByPath(params.path);
      return file instanceof TFile ? file : null;
    }

    // If title is provided, search for it
    if (params.title) {
      return this.findNoteByTitle(params.title);
    }

    return null;
  }

  /**
   * Find note by title (case-insensitive with fuzzy matching)
   */
  private findNoteByTitle(title: string): TFile | null {
    const files = this.app.vault.getMarkdownFiles();
    
    // First try exact match
    for (const file of files) {
      if (file.basename === title) {
        return file;
      }
    }

    // Then try case-insensitive match
    const titleLower = title.toLowerCase();
    for (const file of files) {
      if (file.basename.toLowerCase() === titleLower) {
        return file;
      }
    }

    // Finally try partial match
    for (const file of files) {
      if (file.basename.toLowerCase().includes(titleLower)) {
        return file;
      }
    }

    return null;
  }

  /**
   * Get or create a workspace leaf based on pane type
   */
  private async getTargetLeaf(params: OpenNoteParams): Promise<WorkspaceLeaf> {
    const workspace = this.app.workspace;

    switch (params.paneType) {
      case 'tab':
        // Use the current active leaf
        return workspace.activeLeaf || workspace.createLeafInParent(workspace.rootSplit, 0);

      case 'split':
        // Create a new split pane
        const activeLeaf = workspace.activeLeaf;
        if (!activeLeaf) {
          return workspace.createLeafInParent(workspace.rootSplit, 0);
        }

        const splitDirection = params.splitDirection || 'vertical';
        return workspace.createLeafBySplit(
          activeLeaf,
          splitDirection === 'vertical' ? 'vertical' : 'horizontal'
        );

      case 'window':
        // Create a new window (popout)
        const newLeaf = workspace.createLeafInParent(workspace.rootSplit, 0);
        // Note: Creating a new window requires special handling
        // For now, we'll create a new tab and suggest using split
        return newLeaf;

      default:
        return workspace.activeLeaf || workspace.createLeafInParent(workspace.rootSplit, 0);
    }
  }

  /**
   * Configure view state for the opened note
   */
  private createViewState(file: TFile, params: OpenNoteParams) {
    const baseState = {
      file: file.path,
      active: true
    };

    if (params.viewState) {
      const viewState = params.viewState;
      
      // Set view mode
      if (viewState.mode) {
        Object.assign(baseState, {
          mode: viewState.mode === 'source' ? 'source' : 
                viewState.mode === 'preview' ? 'preview' : 'source',
          source: viewState.mode === 'source'
        });
      }

      // Set cursor position
      if (viewState.line !== undefined) {
        Object.assign(baseState, {
          eState: {
            cursor: {
              from: { line: viewState.line, ch: viewState.column || 0 },
              to: { line: viewState.line, ch: viewState.column || 0 }
            },
            scroll: viewState.line
          }
        });
      }
    }

    return baseState;
  }

  /**
   * Execute note opening with proper workspace management
   */
  protected async executeInternal(params: OpenNoteParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // 1. Resolve the note file
      const file = await this.resolveNoteFile(params);
      if (!file) {
        const identifier = params.path || params.title || 'unknown';
        return this.createErrorResult(
          `Note not found: ${identifier}`,
          new Error('File not found')
        );
      }

      // 2. Get target leaf for opening
      const targetLeaf = await this.getTargetLeaf(params);

      // 3. Configure view state
      const viewState = this.createViewState(file, params);

      // 4. Open the file in the target leaf
      await targetLeaf.openFile(file, viewState);

      // 5. Focus the leaf if requested
      if (params.focus) {
        this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
      }

      // 6. Get workspace information for response
      const workspaceInfo = this.getWorkspaceInfo();

      return this.createSuccessResult(
        `Successfully opened "${file.basename}" in ${params.paneType}`,
        {
          file: {
            path: file.path,
            basename: file.basename,
            size: file.stat.size,
            lastModified: new Date(file.stat.mtime)
          },
          paneType: params.paneType,
          splitDirection: params.splitDirection,
          focused: params.focus,
          viewState: params.viewState,
          workspace: workspaceInfo
        }
      );

    } catch (error) {
      const identifier = params.path || params.title || 'unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to open note "${identifier}": ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
    }
  }

  /**
   * Get current workspace information
   */
  private getWorkspaceInfo() {
    const workspace = this.app.workspace;
    const activeLeaf = workspace.activeLeaf;
    
    return {
      activeFile: (activeLeaf?.view as any)?.file?.path || null,
      openTabs: workspace.getLeavesOfType('markdown').map(leaf => {
        const view = leaf.view as any;
        return {
          path: view.file?.path || 'unknown',
          basename: view.file?.basename || 'unknown',
          isPinned: leaf.getViewState().pinned || false,
          isActive: leaf === activeLeaf
        };
      }),
      totalTabs: workspace.getLeavesOfType('markdown').length,
      splitLayout: this.describeSplitLayout()
    };
  }

  /**
   * Describe the current split layout
   */
  private describeSplitLayout(): string {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType('markdown');
    
    if (leaves.length === 0) return 'empty';
    if (leaves.length === 1) return 'single';
    
    // Simple heuristic for split detection
    const parents = new Set(leaves.map(leaf => leaf.parent));
    if (parents.size === 1) return 'tabs';
    if (parents.size > 1) return 'split';
    
    return 'complex';
  }

  /**
   * Note opening is generally safe
   */
  protected isDestructiveOperation(params: OpenNoteParams): boolean {
    // Opening notes is generally safe, but opening many splits could be disruptive
    return params.paneType === 'split' || params.paneType === 'window';
  }
}