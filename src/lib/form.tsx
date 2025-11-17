import { z, ZodString, ZodArray, ZodCustom } from 'zod';
import { FormField as FormFieldType } from '@/types/blocks/form';

export function buildFieldSchema(field: FormFieldType) {
  let schema = z.string();

  if (field.validation?.required) {
    if (field.type === 'file') {
      const schema = z.array(z.instanceof(File));
      return schema.refine((val) => {
        return val.length > 0 && Array.from(val).every(file => file instanceof File);
      }, {
        message: field.validation.message || '',
      });
    } else {
      schema = schema.min(1, {
        message: field.validation.message || `${field.title} is required`,
      });
    }
  }

  if (field.validation?.min) {
    // 检查是否为数字字符串的数值范围验证
    if (field.validation?.numeric) {
      schema = schema.refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= field.validation!.min!;
      }, {
        message: field.validation.message || `${field.title} must be at least ${field.validation.min}`,
      });
    } else {
      // 原有的字符串长度验证
      schema = schema.min(field.validation.min, {
        message: field.validation.message || `${field.title} must be at least ${field.validation.min} characters`,
      });
    }
  }

  if (field.validation?.max) {
    // 检查是否为数字字符串的数值范围验证
    if (field.validation?.numeric) {
      schema = schema.refine((val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num <= field.validation!.max!;
      }, {
        message: field.validation.message || `${field.title} must be at most ${field.validation.max}`,
      });
    } else {
      // 原有的字符串长度验证
      schema = schema.max(field.validation.max, {
        message: field.validation.message || `${field.title} must be at most ${field.validation.max} characters`,
      });
    }
  }

  if (field.validation?.email) {
    schema = schema.email({
      message: field.validation.message || `${field.title} must be a valid email`,
    });
  }

  // 数字格式验证
  if (field.validation?.numeric) {
    schema = schema.refine((val) => {
      return /^\d+$/.test(val) && !isNaN(parseInt(val, 10));
    }, {
      message: field.validation.message || `${field.title} must be a valid number`,
    });
  }

  return schema;
}

export function generateFormSchema(fields: FormFieldType[]) {
  const schemaFields: Record<string, ZodString | ZodArray<ZodCustom<File, File>>> = {};

  fields.forEach((field) => {
    if (field.name) {
      schemaFields[field.name] = buildFieldSchema(field);
    }
  });

  return z.object(schemaFields);
};