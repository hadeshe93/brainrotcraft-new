/**
 * 数据验证器 - 验证从母站点拉取的数据格式
 */

// UUID 格式验证（标准 UUID v4 格式或自定义格式）
export function isValidUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;

  // 支持标准 UUID 格式或自定义格式（如 mock-xxx-xxx）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customRegex = /^[a-z0-9-_]+$/i;

  return uuidRegex.test(uuid) || customRegex.test(uuid);
}

// Slug 格式验证（只允许小写字母、数字、连字符）
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

// 验证分类数据
export interface CategoryData {
  uuid: string;
  name: string;
  slug: string;
  iconUrl?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export function validateCategory(data: any): data is CategoryData {
  if (!data || typeof data !== 'object') return false;

  // 必填字段验证
  if (!isValidUuid(data.uuid)) return false;
  if (!data.name || typeof data.name !== 'string') return false;
  if (!isValidSlug(data.slug)) return false;

  // 日期字段验证
  if (data.createdAt && isNaN(Date.parse(data.createdAt))) return false;
  if (data.updatedAt && isNaN(Date.parse(data.updatedAt))) return false;

  return true;
}

// 验证标签数据（结构同分类）
export type TagData = CategoryData;
export const validateTag = validateCategory;

// 验证特性合集数据（结构同分类）
export type FeaturedData = CategoryData;
export const validateFeatured = validateCategory;

// 验证游戏介绍数据
export interface IntroductionData {
  uuid: string;
  metadataTitle?: string;
  metadataDescription?: string;
  content?: string;
}

export function validateIntroduction(data: any): data is IntroductionData {
  if (!data || typeof data !== 'object') return false;
  if (!isValidUuid(data.uuid)) return false;
  return true;
}

// 验证游戏数据
export interface GameData {
  uuid: string;
  name: string;
  slug: string;
  thumbnail?: string;
  source?: string;
  status: 'draft' | 'online' | 'offline';
  nameI18n?: Record<string, string>;
  interact: number;
  rating: number;
  ratingCount?: number;
  upvoteCount?: number;
  downvoteCount?: number;
  saveCount?: number;
  shareCount?: number;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  categories: string[];
  tags: string[];
  featured: string[];
  introduction?: IntroductionData;
}

export function validateGame(data: any): data is GameData {
  if (!data || typeof data !== 'object') return false;

  // 必填字段验证
  if (!isValidUuid(data.uuid)) {
    console.warn('Invalid UUID:', data.uuid);
    return false;
  }
  if (!data.name || typeof data.name !== 'string') {
    console.warn('Invalid name:', data.name);
    return false;
  }
  if (data.slug && !isValidSlug(data.slug)) {
    console.warn('Invalid slug:', data.slug);
    return false;
  }

  // 状态验证
  if (!['draft', 'online', 'offline'].includes(data.status)) {
    console.warn('Invalid status:', data.status);
    return false;
  }

  // 数值字段验证
  if (typeof data.interact !== 'number') {
    console.warn('Invalid interact:', data.interact);
    return false;
  }
  if (typeof data.rating !== 'number') {
    console.warn('Invalid rating:', data.rating);
    return false;
  }

  // 日期字段验证
  if (isNaN(data.createdAt)) {
    console.warn('Invalid createdAt:', data.createdAt);
    return false;
  }
  if (isNaN(data.updatedAt)) {
    console.warn('Invalid updatedAt:', data.updatedAt);
    return false;
  }

  // 关联数据验证（必须是数组）
  if (!Array.isArray(data.categories)) {
    console.warn('Invalid categories:', data.categories);
    return false;
  }
  if (!Array.isArray(data.tags)) {
    console.warn('Invalid tags:', data.tags);
    return false;
  }
  if (!Array.isArray(data.featured)) {
    console.warn('Invalid featured:', data.featured);
    return false;
  }

  // 验证关联UUID
  if (!data.categories.every((uuid: any) => typeof uuid === 'string' && isValidUuid(uuid))) return false;
  if (!data.tags.every((uuid: any) => typeof uuid === 'string' && isValidUuid(uuid))) return false;
  if (!data.featured.every((uuid: any) => typeof uuid === 'string' && isValidUuid(uuid))) return false;

  // 验证介绍（可选）
  if (data.introduction && !validateIntroduction(data.introduction)) return false;

  return true;
}

// 批量验证
export function validateBatch<T>(data: any[], validator: (item: any) => item is T): { valid: T[]; invalid: any[] } {
  const valid: T[] = [];
  const invalid: any[] = [];

  for (const item of data) {
    if (validator(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  }

  return { valid, invalid };
}

// API 响应格式验证
export interface FetchResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  timestamp: string;
}

export function validateFetchResponse<T>(response: any, validator: (item: any) => item is T): FetchResponse<T> | null {
  if (!response || typeof response !== 'object') return null;
  if (typeof response.success !== 'boolean') return null;
  if (!Array.isArray(response.data)) return null;
  if (typeof response.total !== 'number') return null;

  // 验证数据项
  const { valid, invalid } = validateBatch(response.data, validator);

  if (invalid.length > 0) {
    console.warn(`Found ${invalid.length} invalid items in response:`, invalid);
  }

  return {
    success: response.success,
    data: valid,
    total: valid.length,
    timestamp: response.timestamp || new Date().toISOString(),
  };
}
