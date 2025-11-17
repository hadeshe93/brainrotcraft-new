/**
 * 将 FormData 转成 JSONValue 格式
 */

// 定义 JSONValue 类型，支持常见的 JSON 数据结构
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null
  | File
  | JSONValue[]
  | { [key: string]: JSONValue };

// 定义配置选项
export interface FormDataToJSONOptions {
  /** 是否保留数组格式（多个同名字段） */
  preserveArrays?: boolean;
  /** 是否尝试自动类型转换 */
  autoTypeConversion?: boolean;
  /** 是否包含文件信息 */
  includeFiles?: boolean;
  /** 自定义文件处理器 */
  fileHandler?: (file: File, key: string) => JSONValue;
}

/**
 * 获取 FormData 的所有键值对
 * 兼容不同环境的 FormData 实现
 */
function getFormDataEntries(formData: FormData): Array<[string, File | string]> {
  const entries: Array<[string, File | string]> = [];
  
  // 优先使用标准的 entries() 方法
  if (typeof (formData as any).entries === 'function') {
    for (const entry of (formData as any).entries()) {
      entries.push(entry);
    }
    return entries;
  }
  
  // 降级方案：使用 forEach（如果可用）
  if (typeof (formData as any).forEach === 'function') {
    (formData as any).forEach((value: File | string, key: string) => {
      entries.push([key, value]);
    });
    return entries;
  }
  
  // 最后的降级方案：手动枚举（不太完整，但基本可用）
  console.warn('FormData 不支持标准的遍历方法，将使用降级方案');
  return entries;
}

/**
 * 检查值是否为文件对象
 */
function isFileObject(value: File | string): value is File {
  if (value instanceof File) {
    return true;
  }
  
  if (typeof value === 'string') {
    return false;
  }
  
  // 检查是否具有文件对象的特征
  return (
    value !== null && 
    value !== undefined &&
    typeof value === 'object' && 
    'name' in value && 
    'size' in value && 
    'type' in value
  );
}

/**
 * 将 FormData 转换为 JSON 对象
 * @param formData - 要转换的 FormData 对象
 * @param options - 转换选项
 * @returns 转换后的 JSON 对象
 * 
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('name', 'John');
 * formData.append('age', '25');
 * formData.append('tags', 'react');
 * formData.append('tags', 'typescript');
 * 
 * // 基础转换
 * const json1 = formDataToJSON(formData);
 * // { name: 'John', age: '25', tags: 'typescript' }
 * 
 * // 保留数组
 * const json2 = formDataToJSON(formData, { preserveArrays: true });
 * // { name: 'John', age: '25', tags: ['react', 'typescript'] }
 * 
 * // 自动类型转换
 * const json3 = formDataToJSON(formData, { 
 *   preserveArrays: true, 
 *   autoTypeConversion: true 
 * });
 * // { name: 'John', age: 25, tags: ['react', 'typescript'] }
 * ```
 */
export function formDataToJSON(
  formData: FormData, 
  options: FormDataToJSONOptions = {}
): { [key: string]: JSONValue } {
  const {
    preserveArrays = false,
    autoTypeConversion = false,
    includeFiles = false,
    fileHandler,
  } = options;

  const result: { [key: string]: JSONValue } = {};
  const multiValueKeys = new Set<string>();

  // 获取所有键值对
  const entries = getFormDataEntries(formData);

  // 首先遍历一遍，找出哪些键有多个值
  if (preserveArrays) {
    const keyCountMap = new Map<string, number>();
    for (const [key] of entries) {
      keyCountMap.set(key, (keyCountMap.get(key) || 0) + 1);
    }
    keyCountMap.forEach((count, key) => {
      if (count > 1) {
        multiValueKeys.add(key);
      }
    });
  }

  // 遍历 FormData 并转换
  for (const [key, value] of entries) {
    let convertedValue: JSONValue;

    // 检查是否为文件对象（兼容不同环境）
    const isFile = isFileObject(value);

    if (isFile) {
      // 处理文件
      if (!includeFiles) {
        continue; // 跳过文件
      }

      if (fileHandler) {
        convertedValue = fileHandler(value as File, key);
      } else {
        // 默认文件处理：转换为文件信息对象
        const file = value as any;
        convertedValue = {
          name: file.name || 'unknown',
          size: file.size || 0,
          type: file.type || 'unknown',
          lastModified: file.lastModified || Date.now(),
        };
      }
    } else {
      // 处理字符串值
      convertedValue = convertValue(value as string, autoTypeConversion);
    }

    // 根据配置决定如何存储值
    if (preserveArrays && multiValueKeys.has(key)) {
      // 多值处理：创建或扩展数组
      if (Array.isArray(result[key])) {
        (result[key] as JSONValue[]).push(convertedValue);
      } else if (result[key] !== undefined) {
        result[key] = [result[key] as JSONValue, convertedValue];
      } else {
        result[key] = [convertedValue];
      }
    } else {
      // 单值处理：后来的值覆盖前面的值
      result[key] = convertedValue;
    }
  }

  return result;
}

/**
 * 转换字符串值为适当的类型
 * @param value - 字符串值
 * @param autoTypeConversion - 是否进行自动类型转换
 * @returns 转换后的值
 */
function convertValue(value: string, autoTypeConversion: boolean): JSONValue {
  if (!autoTypeConversion) {
    return value;
  }

  // 尝试转换为布尔值
  if (value === 'true') return true;
  if (value === 'false') return false;

  // 尝试转换为 null
  if (value === 'null') return null;

  // 尝试转换为数字
  if (value !== '' && !isNaN(Number(value))) {
    const num = Number(value);
    // 检查是否为整数
    if (Number.isInteger(num)) {
      return num;
    }
    // 检查是否为有效的浮点数
    if (Number.isFinite(num)) {
      return num;
    }
  }

  // 保持为字符串
  return value;
}

/**
 * 获取 FormData 中所有的键名
 * @param formData - FormData 对象
 * @returns 键名数组
 */
export function getFormDataKeys(formData: FormData): string[] {
  const keys = new Set<string>();
  const entries = getFormDataEntries(formData);
  
  for (const [key] of entries) {
    keys.add(key);
  }
  return Array.from(keys);
}

/**
 * 检查 FormData 是否为空
 * @param formData - FormData 对象
 * @returns 是否为空
 */
export function isFormDataEmpty(formData: FormData): boolean {
  const entries = getFormDataEntries(formData);
  return entries.length === 0;
}

/**
 * 从对象创建 FormData
 * @param obj - 要转换的对象
 * @returns FormData 对象
 */
export function jsonToFormData(obj: Record<string, any>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // 数组值：为每个元素添加同名字段
      value.forEach(item => {
        formData.append(key, String(item));
      });
    } else if (value instanceof File || value instanceof Blob) {
      // 文件对象
      formData.append(key, value);
    } else if (value !== null && value !== undefined) {
      // 其他值转换为字符串
      formData.append(key, String(value));
    }
  }
  
  return formData;
}
