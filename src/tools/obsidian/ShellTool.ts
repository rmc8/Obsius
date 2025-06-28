/**
 * ShellTool for Obsius - Shell Command Execution
 * Adapted from gemini-cli for Obsidian environment
 * 
 * This tool executes shell commands in a secure, controlled manner within the Obsidian vault.
 */

import { BaseTool } from '../BaseTool';
import { ToolResult, ShellParams } from '../../utils/types';
import { z } from 'zod';
import { spawn } from 'child_process';
import { platform } from 'os';
import { resolve } from 'path';

/**
 * Schema for shell command parameters
 */
const ShellParamsSchema = z.object({
  command: z.string().min(1, 'Command cannot be empty'),
  description: z.string().optional(),
  directory: z.string().optional()
});

/**
 * ShellTool - Execute shell commands with security controls
 * 
 * Features:
 * - Cross-platform command execution (bash on Unix, cmd on Windows)
 * - Working directory control (relative to vault root)
 * - Output capture with real-time streaming
 * - Process control and cleanup
 * - Security validation and confirmation
 */
export class ShellTool extends BaseTool<ShellParams> {
  
  get name(): string {
    return 'shell';
  }

  get description(): string {
    return 'Execute shell commands in the vault directory with security controls and output capture';
  }

  get parameterSchema(): z.ZodSchema<ShellParams> {
    return ShellParamsSchema;
  }

  get riskLevel() {
    return 'medium' as const;
  }

  /**
   * Extract the root command for security validation
   */
  private getCommandRoot(command: string): string | undefined {
    return command
      .trim()
      .replace(/[{}()]/g, '') // remove grouping operators
      .split(/[\s;&|]+/)[0] // split on whitespace or operators
      ?.split(/[/\\]/) // split on path separators
      .pop(); // get command name
  }

  /**
   * Validate command parameters and security constraints
   */
  private validateCommand(params: ShellParams): string | null {
    // Schema validation
    const validation = this.parameterSchema.safeParse(params);
    if (!validation.success) {
      return `Invalid parameters: ${validation.error.message}`;
    }

    // Command safety checks
    const command = params.command.trim();
    if (!command) {
      return 'Command cannot be empty';
    }

    const rootCommand = this.getCommandRoot(command);
    if (!rootCommand) {
      return 'Could not identify command for security validation';
    }

    // Directory validation (must be relative to vault)
    if (params.directory) {
      if (params.directory.includes('..') || params.directory.startsWith('/')) {
        return 'Directory must be relative to vault root and cannot contain ".."';
      }
    }

    // Basic security: block dangerous commands
    const dangerousCommands = ['rm', 'del', 'format', 'fdisk', 'mkfs', 'dd'];
    if (dangerousCommands.includes(rootCommand.toLowerCase())) {
      return `Command "${rootCommand}" is blocked for security reasons`;
    }

    return null;
  }

  /**
   * Execute shell command with proper security and error handling
   */
  protected async executeInternal(params: ShellParams): Promise<ToolResult> {
    this.ensureVaultAccess();

    try {
      // Validate command
      const validationError = this.validateCommand(params);
      if (validationError) {
        return this.createErrorResult(
          validationError,
          new Error(validationError)
        );
      }

      // Determine shell and command
      const isWindows = platform() === 'win32';
      const shell = isWindows ? 'cmd.exe' : 'bash';
      const shellArgs = isWindows ? ['/c'] : ['-c'];
      const command = params.command;

      // Set working directory (vault root or specified subdirectory)
      const vaultPath = (this.app.vault.adapter as any).path || '';
      const workingDir = params.directory 
        ? resolve(vaultPath, params.directory)
        : vaultPath;

      // Execute command
      const startTime = Date.now();
      const result = await this.executeCommand(shell, [...shellArgs, command], workingDir);
      const duration = Date.now() - startTime;

      return {
        success: result.exitCode === 0,
        message: result.exitCode === 0 
          ? `Command executed successfully${result.stdout ? ': ' + result.stdout.slice(0, 100) + (result.stdout.length > 100 ? '...' : '') : ''}`
          : `Command failed with exit code ${result.exitCode}${result.stderr ? ': ' + result.stderr.slice(0, 100) : ''}`,
        data: {
          command,
          directory: params.directory || '(vault root)',
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          duration
        }
      };

    } catch (error) {
      return this.createErrorResult(
        `Shell command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : new Error('Unknown shell execution error')
      );
    }
  }

  /**
   * Execute command and capture output
   */
  private executeCommand(
    command: string, 
    args: string[], 
    cwd: string
  ): Promise<{stdout: string, stderr: string, exitCode: number}> {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000 // 30 second timeout
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      process.on('error', (error) => {
        resolve({
          stdout: stdout.trim(),
          stderr: error.message,
          exitCode: 1
        });
      });

      // Handle timeout
      process.on('exit', (code, signal) => {
        if (signal === 'SIGTERM') {
          resolve({
            stdout: stdout.trim(),
            stderr: 'Command timed out after 30 seconds',
            exitCode: 124
          });
        }
      });
    });
  }
}