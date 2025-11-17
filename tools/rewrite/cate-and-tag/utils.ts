import type { ParsedSection, ValidationResult, CategoriesOutput, TagsOutput } from './types';

/**
 * Generate a kebab-case slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]/g, '') // Remove non-word chars except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

/**
 * Parse markdown content into sections
 */
export function parseMarkdown(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];

  // Split by H2 headings (##)
  const h2Pattern = /^## (.+)$/gm;
  const matches = Array.from(content.matchAll(h2Pattern));

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const name = match[1].trim();
    const startIndex = match.index! + match[0].length;
    const endIndex = matches[i + 1]?.index ?? content.length;

    const sectionContent = content.slice(startIndex, endIndex);

    // Extract Content section
    const contentMatch = sectionContent.match(/### Content\s+([\s\S]+?)(?=###|---|\n##|$)/);
    const extractedContent = contentMatch ? contentMatch[1].trim().replace(/\n\n+/g, '\n\n') : '';

    // Extract Meta Title
    const metaTitleMatch = sectionContent.match(/### Meta Title\s+(.+?)(?=\n|$)/);
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : '';

    // Extract Meta Description
    const metaDescMatch = sectionContent.match(/### Meta Description\s+([\s\S]+?)(?=\n---|$)/);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // Only add if we have valid content
    if (name && extractedContent) {
      sections.push({
        name,
        content: extractedContent,
        metaTitle,
        metaDescription,
      });
    }
  }

  return sections;
}

/**
 * Validate the output data
 */
export function validateOutput(data: CategoriesOutput | TagsOutput, type: 'categories' | 'tags'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const items = 'categories' in data ? data.categories : data.tags;
  const expectedCount = type === 'categories' ? 15 : 60;

  // Check count
  if (items.length !== expectedCount) {
    warnings.push(`Expected ${expectedCount} ${type}, but got ${items.length}`);
  }

  // Check each item
  const slugs = new Set<string>();
  items.forEach((item, index) => {
    const itemType = type === 'categories' ? 'Category' : 'Tag';

    // Check required fields
    if (!item.name) {
      errors.push(`${itemType} ${index + 1}: Missing name`);
    }
    if (!item.slug) {
      errors.push(`${itemType} ${index + 1}: Missing slug`);
    }
    if (!item.content) {
      errors.push(`${itemType} ${index + 1} (${item.name}): Missing content`);
    }
    if (!item.metaTitle) {
      errors.push(`${itemType} ${index + 1} (${item.name}): Missing metaTitle`);
    }
    if (!item.metaDescription) {
      errors.push(`${itemType} ${index + 1} (${item.name}): Missing metaDescription`);
    }

    // Check slug uniqueness
    if (slugs.has(item.slug)) {
      errors.push(`${itemType} ${index + 1} (${item.name}): Duplicate slug "${item.slug}"`);
    }
    slugs.add(item.slug);

    // Check meta title length (50-60 chars)
    if (item.metaTitle) {
      const titleLength = item.metaTitle.length;
      if (titleLength < 50 || titleLength > 60) {
        warnings.push(`${itemType} "${item.name}": Meta Title length is ${titleLength} (recommended: 50-60)`);
      }
    }

    // Check meta description length (140-160 chars)
    if (item.metaDescription) {
      const descLength = item.metaDescription.length;
      if (descLength < 140 || descLength > 160) {
        warnings.push(`${itemType} "${item.name}": Meta Description length is ${descLength} (recommended: 140-160)`);
      }
    }

    // Check for markdown artifacts
    if (item.content.includes('###') || item.content.includes('##')) {
      warnings.push(`${itemType} "${item.name}": Content contains markdown heading artifacts`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation results for console output
 */
export function formatValidationResults(result: ValidationResult, type: string): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push(`✓ ${type} validation passed`);
  } else {
    lines.push(`✗ ${type} validation failed`);
  }

  if (result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach((error) => {
      lines.push(`  - ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push('\nWarnings:');
    result.warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
  }

  return lines.join('\n');
}
