/**
 * Abstract base class for all Obsius tools
 * Provides validation, risk assessment, and execution patterns
 */

import { z } from 'zod';
import { App } from 'obsidian';
import {
  ToolResult,
  ExecutionContext,
  ValidationResult,
  ToolDefinition,
  RiskLevel,
  ToolExecutionError,
  ToolValidationError,
  UserCancelledError,
  ToolProgressCallback
} from '../utils/types';

/**
 * Abstract base class that all tools must extend
 */
export abstract class BaseTool<TParams = any> {
  protected app: App;
  protected context: ExecutionContext;

  constructor(app: App, context: ExecutionContext) {
    this.app = app;
    this.context = context;
  }

  // Abstract methods that concrete tools must implement
  abstract get name(): string;
  abstract get description(): string;
  abstract get parameterSchema(): z.ZodSchema<TParams>;
  abstract get riskLevel(): RiskLevel;
  
  protected abstract executeInternal(params: TParams): Promise<ToolResult>;

  /**
   * Main execution method with full validation and error handling
   */
  async execute(
    rawParams: unknown,
    progressCallback?: ToolProgressCallback
  ): Promise<ToolResult> {
    try {
      progressCallback?.({ stage: 'validation', percentage: 10, message: 'Validating parameters...' });
      
      // 1. Validate parameters
      const validationResult = this.validateParameters(rawParams);
      if (!validationResult.valid) {
        throw new ToolValidationError(
          `Invalid parameters for ${this.name}: ${validationResult.message}`,
          validationResult.errors || []
        );
      }

      const params = rawParams as TParams;

      progressCallback?.({ stage: 'risk_assessment', percentage: 20, message: 'Assessing operation risk...' });

      // 2. Assess risk and request confirmation if needed
      const shouldConfirm = await this.shouldRequestConfirmation(params);
      if (shouldConfirm) {
        const confirmed = await this.requestUserConfirmation(params);
        if (!confirmed) {
          return {
            success: false,
            message: 'Operation cancelled by user',
            userCancelled: true
          };
        }
      }

      progressCallback?.({ stage: 'execution', percentage: 50, message: 'Executing operation...' });

      // 3. Execute the actual tool logic
      const result = await this.executeInternal(params);

      progressCallback?.({ stage: 'completion', percentage: 100, message: 'Operation completed' });

      // 4. Log successful execution
      this.logExecution(params, result);

      return result;

    } catch (error) {
      // Handle different types of errors appropriately
      if (error instanceof UserCancelledError) {
        return {
          success: false,
          message: error.message,
          userCancelled: true
        };
      }

      if (error instanceof ToolValidationError) {
        return {
          success: false,
          message: error.message,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }

      if (error instanceof ToolExecutionError) {
        return {
          success: false,
          message: error.message,
          error: error.originalError?.message || 'Unknown execution error'
        };
      }

      // Unknown error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        message: `${this.name} execution failed`,
        error: errorMessage
      };
    }
  }

  /**
   * Validate parameters against the tool's schema
   */
  validateParameters(params: unknown): ValidationResult {
    try {
      this.parameterSchema.parse(params);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        return {
          valid: false,
          errors,
          message: `Parameter validation failed: ${errors.join(', ')}`
        };
      }
      
      return {
        valid: false,
        errors: ['Unknown validation error'],
        message: 'Parameter validation failed'
      };
    }
  }

  /**
   * Determine if user confirmation is required for this operation
   */
  protected async shouldRequestConfirmation(params: TParams): Promise<boolean> {
    // High risk operations always require confirmation
    if (this.riskLevel === 'high') {
      return true;
    }

    // Medium risk operations require confirmation for destructive actions
    if (this.riskLevel === 'medium') {
      return this.isDestructiveOperation(params);
    }

    // Low risk operations generally don't require confirmation
    return false;
  }

  /**
   * Check if the operation is destructive (modifies or deletes data)
   * Override in concrete tools for more specific logic
   */
  protected isDestructiveOperation(params: TParams): boolean {
    // Default implementation: check for common destructive keywords
    const paramsStr = JSON.stringify(params).toLowerCase();
    const destructiveKeywords = ['delete', 'remove', 'clear', 'replace', 'overwrite'];
    return destructiveKeywords.some(keyword => paramsStr.includes(keyword));
  }

  /**
   * Request confirmation from the user
   * This should be implemented to show a proper confirmation dialog
   */
  protected async requestUserConfirmation(params: TParams): Promise<boolean> {
    // TODO: Implement proper confirmation dialog
    // For now, return true (auto-approve) - this will be replaced with actual UI
    console.log(`Confirmation requested for ${this.name}:`, params);
    return true;
  }

  /**
   * Log tool execution for audit and debugging purposes
   */
  protected logExecution(params: TParams, result: ToolResult): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      tool: this.name,
      parameters: params,
      result: {
        success: result.success,
        message: result.message,
        hasData: !!result.data
      },
      context: {
        currentFile: this.context.currentFile?.path,
        vaultPath: this.context.vaultPath
      }
    };

    console.log('[Obsius Tool Execution]', logEntry);
    
    // TODO: Implement proper logging system that persists to file/storage
  }

  /**
   * Generate tool definition for AI provider integration
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.zodSchemaToJsonSchema(this.parameterSchema)
    };
  }

  /**
   * Get parameter schema in JSON Schema format
   */
  getParameterSchema(): object {
    return this.zodSchemaToJsonSchema(this.parameterSchema);
  }

  /**
   * Convert Zod schema to JSON Schema format for AI providers
   */
  private zodSchemaToJsonSchema(schema: z.ZodSchema): object {
    try {
      return this.convertZodSchemaToJson(schema);
    } catch (error) {
      console.warn(`Failed to convert schema for ${this.name}:`, error);
      return { 
        type: 'object',
        properties: {}
      };
    }
  }
  
  /**
   * Internal method to convert Zod schema to JSON Schema
   */
  private convertZodSchemaToJson(schema: z.ZodSchema): object {
    const zodDef = (schema as any)._def;
    
    // Handle ZodObject (most common case for tool parameters)
    if (zodDef.typeName === 'ZodObject') {
      return this.convertZodObjectToJson(schema);
    }
    
    // Handle ZodEffects (schemas with refine/transform)
    if (zodDef.typeName === 'ZodEffects') {
      return this.convertZodSchemaToJson(zodDef.schema);
    }
    
    // Handle other types as primitive fields
    return this.convertZodField(schema).property;
  }
  
  /**
   * Convert ZodObject specifically to JSON Schema
   */
  private convertZodObjectToJson(schema: z.ZodSchema): object {
    const zodDef = (schema as any)._def;
    
    // Handle Zod shape - it can be a function or object
    let shape = zodDef.shape;
    if (typeof shape === 'function') {
      shape = shape();
    }
    shape = shape || {};
    
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    // Process each field in the object shape
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const { property, isRequired } = this.convertZodField(fieldSchema as z.ZodSchema);
      properties[fieldName] = property;
      
      if (isRequired) {
        required.push(fieldName);
      }
    }
    
    const result: any = {
      type: 'object',
      properties
    };
    
    if (required.length > 0) {
      result.required = required;
    }
    
    return result;
  }

  /**
   * Convert individual Zod field to JSON Schema property
   */
  private convertZodField(field: z.ZodSchema): { property: object; isRequired: boolean } {
    if (!field || !(field as any)._def) {
      return { property: { type: 'string' }, isRequired: true };
    }
    
    const fieldDef = (field as any)._def;
    let isRequired = true;
    let property: any = { type: 'string' }; // default
    
    // Handle ZodOptional - field is not required
    if (fieldDef.typeName === 'ZodOptional') {
      const innerResult = this.convertZodField(fieldDef.innerType);
      return { ...innerResult, isRequired: false };
    }
    
    // Handle ZodDefault - field has default value, not required
    if (fieldDef.typeName === 'ZodDefault') {
      const innerResult = this.convertZodField(fieldDef.innerType);
      const propertyWithDefault = { ...innerResult.property as any };
      
      // Add default value if it's a function, call it
      try {
        const defaultValue = typeof fieldDef.defaultValue === 'function' 
          ? fieldDef.defaultValue() 
          : fieldDef.defaultValue;
        propertyWithDefault.default = defaultValue;
      } catch (error) {
        // If default value generation fails, ignore it
      }
      
      return { property: propertyWithDefault, isRequired: false };
    }
    
    // Handle basic types
    switch (fieldDef.typeName) {
      case 'ZodString':
        property = { type: 'string' };
        // Add string constraints if available
        if (fieldDef.checks) {
          for (const check of fieldDef.checks) {
            if (check.kind === 'min') {
              property.minLength = check.value;
            } else if (check.kind === 'max') {
              property.maxLength = check.value;
            }
          }
        }
        break;
        
      case 'ZodNumber':
        property = { type: 'number' };
        // Add number constraints if available
        if (fieldDef.checks) {
          for (const check of fieldDef.checks) {
            if (check.kind === 'min') {
              property.minimum = check.value;
            } else if (check.kind === 'max') {
              property.maximum = check.value;
            }
          }
        }
        break;
        
      case 'ZodBoolean':
        property = { type: 'boolean' };
        break;
        
      case 'ZodArray':
        const itemsResult = this.convertZodField(fieldDef.type);
        property = { 
          type: 'array',
          items: itemsResult.property
        };
        break;
        
      case 'ZodObject':
        property = this.convertZodObjectToJson(field);
        break;
        
      case 'ZodEnum':
        property = {
          type: 'string',
          enum: fieldDef.values
        };
        break;
        
      case 'ZodLiteral':
        property = {
          type: typeof fieldDef.value,
          const: fieldDef.value
        };
        break;
        
      case 'ZodUnion':
        // Handle union types by using the first type or creating anyOf
        if (fieldDef.options && fieldDef.options.length > 0) {
          const unionResults = fieldDef.options.map((option: z.ZodSchema) => 
            this.convertZodField(option).property
          );
          property = { anyOf: unionResults };
        } else {
          property = { type: 'string' }; // fallback
        }
        break;
        
      default:
        // Fallback for unknown types
        property = { type: 'string' };
        console.warn(`Unknown Zod type: ${fieldDef.typeName}`);
    }
    
    // Add description if available
    if (fieldDef.description) {
      property.description = fieldDef.description;
    }
    
    return { property, isRequired };
  }

  /**
   * Utility method to safely access Obsidian app features
   */
  protected ensureVaultAccess(): void {
    if (!this.app || !this.app.vault) {
      throw new ToolExecutionError(
        'Vault access not available',
        this.name,
        undefined,
        new Error('App or vault is not initialized')
      );
    }
  }

  /**
   * Utility method to create consistent error responses
   */
  protected createErrorResult(message: string, error?: Error): ToolResult {
    return {
      success: false,
      message,
      error: error?.message || 'Unknown error'
    };
  }

  /**
   * Utility method to create successful responses
   */
  protected createSuccessResult(message: string, data?: any): ToolResult {
    return {
      success: true,
      message,
      data
    };
  }
}