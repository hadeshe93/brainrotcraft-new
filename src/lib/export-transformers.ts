/**
 * Export Data Transformers
 * Functions to transform database records to export JSON format
 */

import { EXPORT_CONFIG } from '@/constants/export';
import type { categories, tags, featured, games, introductions } from '@/db/schema';
import { toKebabCase } from './string';


/**
 * Category database record type
 */
type CategoryRecord = typeof categories.$inferSelect;

/**
 * Tag database record type
 */
type TagRecord = typeof tags.$inferSelect;

/**
 * Featured database record type
 */
type FeaturedRecord = typeof featured.$inferSelect;

/**
 * Game database record type (extended with relationships)
 */
type GameRecord = typeof games.$inferSelect & {
  introduction?: typeof introductions.$inferSelect;
  categoryNames?: string[];
  tagNames?: string[];
};

/**
 * Export metadata interface
 */
export interface ExportMetadata {
  totalCount: number;
  generatedAt: string;
  source: string;
}

/**
 * Category export format
 */
export interface CategoryExport {
  name: string;
  slug: string;
  iconUrl: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Tag export format
 */
export interface TagExport {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Featured export format
 */
export interface FeaturedExport {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Game export format
 */
export interface GameExport {
  title: string;
  pageUrl: string;
  gameUrl: string;
  coverImage: string;
  rating: string;
  contentPath: string;
  metaTitle: string;
  metaDescription: string;
  categories: string[];
  tags: string[];
  content?: string; // Optional: markdown content for generating .md files
}

/**
 * Transform category record to export format
 */
export function transformCategoryForExport(category: CategoryRecord): CategoryExport {
  return {
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl || '',
    content: category.content || '',
    metaTitle: category.metadataTitle || '',
    metaDescription: category.metadataDescription || '',
  };
}

/**
 * Transform tag record to export format
 */
export function transformTagForExport(tag: TagRecord): TagExport {
  return {
    name: tag.name,
    slug: tag.slug,
    content: tag.content || '',
    metaTitle: tag.metadataTitle || '',
    metaDescription: tag.metadataDescription || '',
  };
}

/**
 * Transform featured record to export format
 */
export function transformFeaturedForExport(featuredRecord: FeaturedRecord): FeaturedExport {
  return {
    name: featuredRecord.name,
    slug: featuredRecord.slug,
    content: featuredRecord.content || '',
    metaTitle: featuredRecord.metadataTitle || '',
    metaDescription: featuredRecord.metadataDescription || '',
  };
}

/**
 * Transform game record to export format
 */
export function transformGameForExport(game: GameRecord, includeContent: boolean = false): GameExport {
  // Use game name in kebab-case for file name (safer than slug which might be empty)
  const fileName = toKebabCase(game.name);

  const exportData: GameExport = {
    title: game.name,
    pageUrl: `${EXPORT_CONFIG.gameBaseUrl}/${game.slug}`,
    gameUrl: game.source,
    coverImage: game.thumbnail || '',
    rating: String(game.rating || 0),
    contentPath: `${EXPORT_CONFIG.contentBasePath}/${fileName}.md`,
    metaTitle: game.introduction?.metadataTitle || '',
    metaDescription: game.introduction?.metadataDescription || '',
    categories: game.categoryNames || [],
    tags: game.tagNames || [],
  };

  // Include content if requested (for generating markdown files)
  if (includeContent && game.introduction?.content) {
    exportData.content = game.introduction.content;
  }

  return exportData;
}

/**
 * Generate export metadata
 */
export function generateExportMetadata(
  items: any[],
  source: string,
): ExportMetadata {
  return {
    totalCount: items.length,
    generatedAt: new Date().toISOString(),
    source,
  };
}

/**
 * Wrap categories data with metadata
 */
export function wrapCategoriesExport(categories: CategoryExport[]) {
  return {
    categories,
    metadata: generateExportMetadata(categories, EXPORT_CONFIG.sources.categories),
  };
}

/**
 * Wrap tags data with metadata
 */
export function wrapTagsExport(tags: TagExport[]) {
  return {
    tags,
    metadata: generateExportMetadata(tags, EXPORT_CONFIG.sources.tags),
  };
}

/**
 * Wrap featured data with metadata
 */
export function wrapFeaturedExport(featured: FeaturedExport[]) {
  return {
    featured,
    metadata: generateExportMetadata(featured, EXPORT_CONFIG.sources.featured),
  };
}
