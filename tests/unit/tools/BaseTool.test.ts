/**
 * Unit tests for BaseTool class
 * Following TDD methodology: Red → Green → Refactor
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';
import { BaseTool } from '../../../src/tools/BaseTool';
import { 
  ToolResult, 
  ExecutionContext, 
  ValidationResult,
  RiskLevel,
  ToolValidationError,
  ToolExecutionError,
  UserCancelledError
} from '../../../src/utils/types';
import { createMockApp, createMockExecutionContext } from '../../setup';

// Concrete implementation of BaseTool for testing
class TestTool extends BaseTool<{ message: string; count?: number }> {
  get name(): string {
    return 'test_tool';
  }

  get description(): string {
    return 'A test tool for unit testing';
  }

  get parameterSchema(): z.ZodSchema<{ message: string; count?: number }> {
    return z.object({
      message: z.string().min(1, 'Message cannot be empty'),
      count: z.number().optional().default(1)
    });
  }

  get riskLevel(): RiskLevel {
    return 'low';
  }

  protected async executeInternal(params: { message: string; count?: number }): Promise<ToolResult> {
    if (params.message === 'SIMULATE_ERROR') {
      throw new Error('Simulated execution error');
    }
    
    if (params.message === 'SIMULATE_TOOL_ERROR') {
      throw new ToolExecutionError('Simulated tool error', this.name, params);
    }

    return {
      success: true,
      message: `Executed with message: ${params.message}`,
      data: {
        message: params.message,
        count: params.count || 1,
        repeated: params.message.repeat(params.count || 1)
      }
    };
  }
}

// High-risk tool for testing confirmation logic
class HighRiskTool extends BaseTool<{ action: string }> {
  get name(): string {
    return 'high_risk_tool';
  }

  get description(): string {
    return 'A high-risk tool requiring confirmation';
  }

  get parameterSchema(): z.ZodSchema<{ action: string }> {
    return z.object({
      action: z.string()
    });
  }

  get riskLevel(): RiskLevel {
    return 'high';
  }

  protected async executeInternal(params: { action: string }): Promise<ToolResult> {
    return {
      success: true,
      message: `High-risk action executed: ${params.action}`,
      data: { action: params.action }
    };
  }
}

// Destructive tool for testing medium-risk confirmation logic
class DestructiveTool extends BaseTool<{ operation: string; target: string }> {
  get name(): string {
    return 'destructive_tool';
  }

  get description(): string {
    return 'A tool that performs destructive operations';
  }

  get parameterSchema(): z.ZodSchema<{ operation: string; target: string }> {
    return z.object({
      operation: z.string(),
      target: z.string()
    });
  }

  get riskLevel(): RiskLevel {
    return 'medium';
  }

  protected async executeInternal(params: { operation: string; target: string }): Promise<ToolResult> {
    return {
      success: true,
      message: `Destructive operation executed: ${params.operation} on ${params.target}`,
      data: params
    };
  }

  protected isDestructiveOperation(params: { operation: string; target: string }): boolean {
    return params.operation.toLowerCase().includes('delete');
  }
}

describe('BaseTool', () => {
  let mockApp: any;
  let mockContext: ExecutionContext;
  let testTool: TestTool;
  let highRiskTool: HighRiskTool;
  let destructiveTool: DestructiveTool;

  beforeEach(() => {
    mockApp = createMockApp();
    mockContext = createMockExecutionContext(mockApp);
    testTool = new TestTool(mockApp, mockContext);
    highRiskTool = new HighRiskTool(mockApp, mockContext);
    destructiveTool = new DestructiveTool(mockApp, mockContext);
  });

  describe('Constructor and Basic Properties', () => {
    test('should initialize with app and context', () => {
      expect(testTool).toBeInstanceOf(BaseTool);
      expect((testTool as any).app).toBe(mockApp);
      expect((testTool as any).context).toBe(mockContext);
    });

    test('should expose required abstract properties', () => {
      expect(testTool.name).toBe('test_tool');
      expect(testTool.description).toBe('A test tool for unit testing');
      expect(testTool.riskLevel).toBe('low');
      expect(testTool.parameterSchema).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    test('should validate correct parameters', () => {
      const validParams = { message: 'test message', count: 2 };
      const result = testTool.validateParameters(validParams);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    test('should reject invalid parameters', () => {
      const invalidParams = { message: '', count: 'invalid' };
      const result = testTool.validateParameters(invalidParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.message).toContain('validation failed');
    });

    test('should handle missing required parameters', () => {
      const invalidParams = { count: 5 }; // missing message
      const result = testTool.validateParameters(invalidParams);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('message: Required');
    });

    test('should accept optional parameters', () => {
      const validParams = { message: 'test' }; // count is optional
      const result = testTool.validateParameters(validParams);
      
      expect(result.valid).toBe(true);
    });

    test('should handle null/undefined parameters', () => {
      const result1 = testTool.validateParameters(null);
      const result2 = testTool.validateParameters(undefined);
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });

  describe('Risk Assessment and Confirmation', () => {
    test('should not require confirmation for low-risk operations', async () => {
      const shouldConfirm = await (testTool as any).shouldRequestConfirmation({ message: 'safe operation' });
      expect(shouldConfirm).toBe(false);
    });

    test('should require confirmation for high-risk operations', async () => {
      const shouldConfirm = await (highRiskTool as any).shouldRequestConfirmation({ action: 'dangerous' });
      expect(shouldConfirm).toBe(true);
    });

    test('should require confirmation for destructive medium-risk operations', async () => {
      const shouldConfirm = await (destructiveTool as any).shouldRequestConfirmation({ 
        operation: 'delete', 
        target: 'file.txt' 
      });
      expect(shouldConfirm).toBe(true);
    });

    test('should not require confirmation for non-destructive medium-risk operations', async () => {
      const shouldConfirm = await (destructiveTool as any).shouldRequestConfirmation({ 
        operation: 'create', 
        target: 'file.txt' 
      });
      expect(shouldConfirm).toBe(false);
    });

    test('should detect destructive operations by keywords', () => {
      const destructiveParams = { operation: 'delete', target: 'test' };
      const safeParams = { operation: 'create', target: 'test' };
      
      const isDestructive1 = (testTool as any).isDestructiveOperation(destructiveParams);
      const isDestructive2 = (testTool as any).isDestructiveOperation(safeParams);
      
      expect(isDestructive1).toBe(true);
      expect(isDestructive2).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    test('should execute successfully with valid parameters', async () => {
      const params = { message: 'test execution', count: 3 };
      const result = await testTool.execute(params);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Executed with message: test execution');
      expect(result.data).toEqual({
        message: 'test execution',
        count: 3,
        repeated: 'test executiontest executiontest execution'
      });
    });

    test('should handle validation errors gracefully', async () => {
      const invalidParams = { message: '' }; // empty message
      const result = await testTool.execute(invalidParams);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid parameters');
      expect(result.error).toContain('Validation failed');
    });

    test('should handle execution errors', async () => {
      const params = { message: 'SIMULATE_ERROR' };
      const result = await testTool.execute(params);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('execution failed');
      expect(result.error).toContain('Simulated execution error');
    });

    test('should handle ToolExecutionError specifically', async () => {
      const params = { message: 'SIMULATE_TOOL_ERROR' };
      const result = await testTool.execute(params);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Simulated tool error');
    });

    test('should call progress callback during execution', async () => {
      const progressCallback = jest.fn();
      const params = { message: 'test with progress' };
      
      await testTool.execute(params, progressCallback);
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'validation',
        percentage: 10,
        message: 'Validating parameters...'
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'execution',
        percentage: 50,
        message: 'Executing operation...'
      });
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: 'completion',
        percentage: 100,
        message: 'Operation completed'
      });
    });
  });

  describe('User Confirmation Handling', () => {
    test('should proceed without confirmation for low-risk operations', async () => {
      const requestConfirmationSpy = jest.spyOn(testTool as any, 'requestUserConfirmation');
      
      const params = { message: 'safe operation' };
      const result = await testTool.execute(params);
      
      expect(result.success).toBe(true);
      expect(requestConfirmationSpy).not.toHaveBeenCalled();
    });

    test('should request confirmation for high-risk operations', async () => {
      const requestConfirmationSpy = jest.spyOn(highRiskTool as any, 'requestUserConfirmation')
        .mockResolvedValue(true);
      
      const params = { action: 'dangerous operation' };
      const result = await highRiskTool.execute(params);
      
      expect(result.success).toBe(true);
      expect(requestConfirmationSpy).toHaveBeenCalledWith(params);
    });

    test('should handle user cancellation', async () => {
      const requestConfirmationSpy = jest.spyOn(highRiskTool as any, 'requestUserConfirmation')
        .mockResolvedValue(false);
      
      const params = { action: 'dangerous operation' };
      const result = await highRiskTool.execute(params);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Operation cancelled by user');
      expect(result.userCancelled).toBe(true);
      expect(requestConfirmationSpy).toHaveBeenCalled();
    });
  });

  describe('JSON Schema Generation', () => {
    test('should generate valid JSON schema for tool parameters', () => {
      const schema = testTool.getParameterSchema();
      
      expect(schema).toEqual({
        type: 'object',
        properties: {
          message: { 
            type: 'string',
            minLength: 1
          },
          count: { 
            type: 'number',
            default: 1
          }
        },
        required: ['message']
      });
    });

    test('should generate tool definition for AI providers', () => {
      const definition = testTool.getDefinition();
      
      expect(definition).toEqual({
        name: 'test_tool',
        description: 'A test tool for unit testing',
        parameters: {
          type: 'object',
          properties: {
            message: { 
              type: 'string',
              minLength: 1
            },
            count: { 
              type: 'number',
              default: 1
            }
          },
          required: ['message']
        }
      });
    });
  });

  describe('Utility Methods', () => {
    test('should ensure vault access', () => {
      expect(() => {
        (testTool as any).ensureVaultAccess();
      }).not.toThrow();
    });

    test('should throw error when vault is not available', () => {
      const toolWithoutApp = new TestTool(null as any, mockContext);
      
      expect(() => {
        (toolWithoutApp as any).ensureVaultAccess();
      }).toThrow(ToolExecutionError);
    });

    test('should create error results consistently', () => {
      const error = new Error('Test error');
      const result = (testTool as any).createErrorResult('Test message', error);
      
      expect(result).toEqual({
        success: false,
        message: 'Test message',
        error: 'Test error'
      });
    });

    test('should create success results consistently', () => {
      const data = { key: 'value' };
      const result = (testTool as any).createSuccessResult('Success message', data);
      
      expect(result).toEqual({
        success: true,
        message: 'Success message',
        data
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle unknown error types', async () => {
      const tool = new (class extends BaseTool<any> {
        get name() { return 'error_tool'; }
        get description() { return 'Error tool'; }
        get parameterSchema() { return z.any(); }
        get riskLevel(): RiskLevel { return 'low'; }
        
        protected async executeInternal(): Promise<ToolResult> {
          throw 'String error'; // Non-Error object
        }
      })(mockApp, mockContext);
      
      const result = await tool.execute({});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('execution failed');
    });

    test('should handle UserCancelledError', async () => {
      const tool = new (class extends BaseTool<any> {
        get name() { return 'cancel_tool'; }
        get description() { return 'Cancel tool'; }
        get parameterSchema() { return z.any(); }
        get riskLevel(): RiskLevel { return 'low'; }
        
        protected async executeInternal(): Promise<ToolResult> {
          throw new UserCancelledError('Custom cancellation');
        }
      })(mockApp, mockContext);
      
      const result = await tool.execute({});
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Custom cancellation');
      expect(result.userCancelled).toBe(true);
    });
  });

  describe('Logging and Audit', () => {
    test('should log successful executions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const params = { message: 'log test' };
      await testTool.execute(params);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Obsius Tool Execution]',
        expect.objectContaining({
          tool: 'test_tool',
          parameters: params,
          result: expect.objectContaining({
            success: true,
            hasData: true
          })
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});