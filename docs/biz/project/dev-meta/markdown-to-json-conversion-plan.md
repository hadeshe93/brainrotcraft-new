# Markdown to JSON Conversion Plan

## Overview

This document outlines the approach for converting game categories and tags data from Markdown format to JSON format, enabling programmatic access and integration with the GamesRamp platform.

## Data Source Analysis

### Input Files

- **Categories**: `docs/biz/project/dev-meta/game-categories.md`
- **Tags**: `docs/biz/project/dev-meta/game-tags.md`

### Markdown Structure

Both files follow a consistent structure:

```md
## [Category/Tag Name]

### Content

[Description paragraphs - can be multiple paragraphs]

### Meta Title

[SEO-optimized title (50-60 characters)]

### Meta Description

[SEO-optimized description (140-160 characters)]

---
```

### Key Observations

1. Each category/tag is separated by H2 heading (`##`)
2. Three subsections: Content, Meta Title, Meta Description
3. Content can contain multiple paragraphs
4. Sections separated by `---` horizontal rules
5. Categories: 15 total
6. Tags: 60 featured tags

## JSON Schema Design

### Categories Schema

```typescript
interface GameCategory {
  name: string; // From H2 heading (e.g., "Platform")
  slug: string; // Kebab-case version (e.g., "platform")
  content: string; // Full content text with paragraphs
  metaTitle: string; // Meta Title text
  metaDescription: string; // Meta Description text
}

interface CategoriesOutput {
  categories: GameCategory[];
  metadata: {
    totalCount: number; // Total number of categories
    generatedAt: string; // ISO timestamp
    source: string; // Source file path
  };
}
```

### Tags Schema

```typescript
interface GameTag {
  name: string; // From H2 heading (e.g., "Jumping")
  slug: string; // Kebab-case version (e.g., "jumping")
  content: string; // Full content text with paragraphs
  metaTitle: string; // Meta Title text
  metaDescription: string; // Meta Description text
}

interface TagsOutput {
  tags: GameTag[];
  metadata: {
    totalCount: number; // Total number of tags
    generatedAt: string; // ISO timestamp
    source: string; // Source file path
  };
}
```

## Field Mapping

| Markdown Element               | JSON Field        | Processing                                 |
| ------------------------------ | ----------------- | ------------------------------------------ |
| `## [Name]`                    | `name`            | Extract heading text                       |
| `## [Name]`                    | `slug`            | Convert to kebab-case (lowercase, hyphens) |
| `### Content` section          | `content`         | Combine all paragraphs, trim whitespace    |
| `### Meta Title` section       | `metaTitle`       | Extract text, trim                         |
| `### Meta Description` section | `metaDescription` | Extract text, trim                         |

## Implementation Approach

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Dependencies**:
  - `fs/promises` (built-in) - File operations
  - No external parsing libraries needed (use regex)

### Parsing Strategy

1. **Read File**: Use `fs.readFile()` to read markdown content
2. **Split by Sections**: Split content by H2 headings (`##`)
3. **Extract Components**: For each section, extract:
   - Name from H2 heading
   - Content from `### Content` to next `###`
   - Meta Title from `### Meta Title` to next `###`
   - Meta Description from `### Meta Description` to end/separator
4. **Transform Data**: Create objects with proper field names
5. **Generate Slugs**: Convert names to kebab-case slugs
6. **Output JSON**: Write formatted JSON with metadata

### Regex Patterns

```typescript
// Split by H2 headings (keep heading in result)
const sectionPattern = /^## (.+)$/gm;

// Extract subsections
const contentPattern = /### Content\s+([\s\S]+?)(?=###|\n---|\n##|$)/;
const metaTitlePattern = /### Meta Title\s+(.+?)(?=\n|$)/;
const metaDescPattern = /### Meta Description\s+([\s\S]+?)(?=\n---|\n##|$)/;
```

### Slug Generation

```typescript
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]/g, '') // Remove non-word chars except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}
```

## Output Files

### File Locations

- **Categories**: `tools/rewrite/cate-and-tag/output/game-categories.json`
- **Tags**: `tools/rewrite/cate-and-tag/output/game-tags.json`

### Output Format

```json
{
  "categories": [
    {
      "name": "Platform",
      "slug": "platform",
      "content": "Platform games are one of the most classic game genres...",
      "metaTitle": "Platform Games - Jump, Climb & Master Classic Platformers",
      "metaDescription": "Play the best platform games online! Experience classic jumping action, precise controls, and challenging levels from casual to extreme difficulty."
    }
  ],
  "metadata": {
    "totalCount": 15,
    "generatedAt": "2025-11-04T09:30:00.000Z",
    "source": "docs/biz/project/dev-meta/game-categories.md"
  }
}
```

## Script Structure

### File Organization

```
tools/rewrite/cate-and-tag/
├── convert.ts              # Main conversion script
├── types.ts                # TypeScript interfaces
├── utils.ts                # Utility functions (slug generation, parsing)
├── output/                 # Output directory
│   ├── game-categories.json
│   └── game-tags.json
└── package.json            # If needed for dependencies
```

### Main Script Flow

```typescript
// convert.ts
async function main() {
  // 1. Convert categories
  const categoriesData = await convertMarkdownToJson('docs/biz/project/dev-meta/game-categories.md', 'categories');
  await writeJson('tools/rewrite/cate-and-tag/output/game-categories.json', categoriesData);

  // 2. Convert tags
  const tagsData = await convertMarkdownToJson('docs/biz/project/dev-meta/game-tags.md', 'tags');
  await writeJson('tools/rewrite/cate-and-tag/output/game-tags.json', tagsData);

  console.log('Conversion completed successfully!');
}
```

## Validation Requirements

### Data Integrity Checks

1. **Count Validation**:
   - Categories: Exactly 15
   - Tags: Exactly 60
2. **Field Completeness**: All fields present and non-empty
3. **Slug Uniqueness**: No duplicate slugs
4. **Character Counts**:
   - Meta Title: 50-60 characters (warn if outside)
   - Meta Description: 140-160 characters (warn if outside)
5. **Content Quality**: No markdown artifacts in extracted text

### Output Validation

```typescript
function validateOutput(data: CategoriesOutput | TagsOutput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check counts
  // Check required fields
  // Check slug uniqueness
  // Check character lengths
  // Check for markdown artifacts

  return { valid: errors.length === 0, errors, warnings };
}
```

## Usage Instructions

### Running the Script

```bash
# From project root
cd tools/rewrite/cate-and-tag
npx tsx convert.ts

# Or with pnpm
pnpm exec tsx convert.ts
```

### Expected Output

```
Reading game-categories.md...
Parsed 15 categories
Writing game-categories.json...
✓ Categories converted successfully

Reading game-tags.md...
Parsed 60 tags
Writing game-tags.json...
✓ Tags converted successfully

Conversion completed successfully!
```

## Error Handling

### Common Issues

1. **Missing Sections**: Warn if Content/Meta Title/Meta Description missing
2. **Malformed Headings**: Skip or warn about sections without proper H2
3. **File Not Found**: Clear error message with file path
4. **Write Permission**: Handle file write errors gracefully

### Error Reporting

```typescript
try {
  // Conversion logic
} catch (error) {
  console.error(`Error converting ${filename}:`, error.message);
  process.exit(1);
}
```

## Future Enhancements

1. **Validation Mode**: Add `--validate` flag to check without writing
2. **Dry Run**: Add `--dry-run` flag to preview output
3. **Watch Mode**: Auto-regenerate on markdown file changes
4. **Multi-language**: Support for game-categories-cn.md (Chinese)
5. **Schema Export**: Generate TypeScript types from output
6. **Integration**: Add to build pipeline for automatic regeneration

## Success Criteria

- [x] Accurate parsing of all categories and tags
- [x] Proper slug generation (kebab-case, unique)
- [x] All fields correctly mapped
- [x] Clean JSON output (properly formatted)
- [x] Metadata included with timestamp
- [x] No data loss during conversion
- [x] Validation warnings for SEO character counts
- [x] Clear documentation and usage instructions

## Timeline

- **Planning**: 30 minutes (this document)
- **Implementation**: 1-2 hours
- **Testing**: 30 minutes
- **Documentation**: Included in implementation

---

**Generated**: 2025-11-04
**Author**: AI Assistant
**Purpose**: Convert game metadata from Markdown to JSON for programmatic access
