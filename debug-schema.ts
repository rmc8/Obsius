/**
 * Debug script to test Zod schema conversion
 */

import { z } from 'zod';

// Replicate the test schema
const testSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  count: z.number().optional().default(1)
});

console.log('Schema:', testSchema);
console.log('Schema _def:', (testSchema as any)._def);
console.log('Schema shape:', (testSchema as any)._def.shape);

if ((testSchema as any)._def.shape) {
  const shapeFunc = (testSchema as any)._def.shape;
  const shape = typeof shapeFunc === 'function' ? shapeFunc() : shapeFunc;
  console.log('Shape function result:', shape);
  console.log('Shape keys:', Object.keys(shape));
  
  for (const [key, value] of Object.entries(shape)) {
    console.log(`Field ${key}:`, value);
    console.log(`Field ${key} _def:`, (value as any)._def);
  }
}

// Test manual conversion
function convertSchema(schema: z.ZodSchema): any {
  const zodDef = (schema as any)._def;
  
  if (zodDef.typeName === 'ZodObject') {
    const shapeFunc = zodDef.shape;
    const shape = typeof shapeFunc === 'function' ? shapeFunc() : shapeFunc || {};
    console.log('Converting ZodObject, shape function:', shapeFunc);
    console.log('Converting ZodObject, actual shape:', shape);
    
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const [fieldName, fieldSchema] of Object.entries(shape)) {
      const fieldDef = (fieldSchema as any)._def;
      console.log(`Processing field ${fieldName}:`, fieldDef);
      
      let isRequired = true;
      let property: any = { type: 'string' };
      
      // Handle ZodOptional
      if (fieldDef.typeName === 'ZodOptional') {
        isRequired = false;
        const innerDef = fieldDef.innerType._def;
        console.log(`Field ${fieldName} is optional, inner type:`, innerDef);
        
        if (innerDef.typeName === 'ZodString') {
          property = { type: 'string' };
        } else if (innerDef.typeName === 'ZodNumber') {
          property = { type: 'number' };
        }
      }
      // Handle ZodDefault
      else if (fieldDef.typeName === 'ZodDefault') {
        isRequired = false;
        const innerDef = fieldDef.innerType._def;
        console.log(`Field ${fieldName} has default, inner type:`, innerDef);
        
        if (innerDef.typeName === 'ZodString') {
          property = { type: 'string' };
        } else if (innerDef.typeName === 'ZodNumber') {
          property = { type: 'number' };
        }
        
        try {
          const defaultValue = typeof fieldDef.defaultValue === 'function' 
            ? fieldDef.defaultValue() 
            : fieldDef.defaultValue;
          property.default = defaultValue;
        } catch (error) {
          console.log(`Error getting default for ${fieldName}:`, error);
        }
      }
      // Handle basic types
      else if (fieldDef.typeName === 'ZodString') {
        property = { type: 'string' };
      } else if (fieldDef.typeName === 'ZodNumber') {
        property = { type: 'number' };
      }
      
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
  
  return { type: 'object', properties: {} };
}

const converted = convertSchema(testSchema);
console.log('Converted schema:', JSON.stringify(converted, null, 2));