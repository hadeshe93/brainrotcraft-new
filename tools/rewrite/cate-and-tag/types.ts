/**
 * Game Category Interface
 */
export interface GameCategory {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Game Tag Interface
 */
export interface GameTag {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Metadata for generated JSON
 */
export interface Metadata {
  totalCount: number;
  generatedAt: string;
  source: string;
}

/**
 * Categories Output
 */
export interface CategoriesOutput {
  categories: GameCategory[];
  metadata: Metadata;
}

/**
 * Tags Output
 */
export interface TagsOutput {
  tags: GameTag[];
  metadata: Metadata;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parsed Section from Markdown
 */
export interface ParsedSection {
  name: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Featured Item Interface
 */
export interface FeaturedItem {
  name: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

/**
 * Featured Output
 */
export interface FeaturedOutput {
  featured: FeaturedItem[];
  metadata: Metadata;
}
