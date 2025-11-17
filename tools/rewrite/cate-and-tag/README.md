# Game Categories & Tags Markdown to JSON Converter

A TypeScript-based tool to convert game categories and tags metadata from Markdown format to structured JSON, enabling programmatic access and integration with the GamesRamp platform.

## Features

✨ **Automatic Parsing**: Extracts structured data from Markdown files
🔍 **Validation**: Built-in validation for data integrity and SEO compliance
📊 **Metadata**: Includes generation timestamp and source information
⚡ **TypeScript**: Fully typed with comprehensive type definitions
🎯 **SEO-Friendly**: Validates Meta Title and Description character counts

## File Structure

```
tools/rewrite/cate-and-tag/
├── convert.ts              # Main conversion script (Markdown to JSON)
├── export-featured.ts      # Featured data export script (Database to JSON)
├── types.ts                # TypeScript type definitions
├── utils.ts                # Parsing and validation utilities
├── output/                 # Generated JSON files
│   ├── game-categories.json
│   ├── game-tags.json
│   └── game-featured.json
└── README.md              # This file
```

## Input Files

- **Categories**: `docs/biz/project/dev-meta/game-categories.md` (15 categories)
- **Tags**: `docs/biz/project/dev-meta/game-tags.md` (60 featured tags)

### Markdown Format

Each category/tag follows this structure:

```md
## [Name]

### Content

[Description paragraphs - can be multiple paragraphs]

### Meta Title

[SEO-optimized title (50-60 characters)]

### Meta Description

[SEO-optimized description (140-160 characters)]

---
```

## Output Format

### JSON Structure

```json
{
  "categories": [
    {
      "name": "Platform",
      "slug": "platform",
      "content": "Full description text with paragraphs...",
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

### Field Mapping

| Markdown Element               | JSON Field        | Processing                                   |
| ------------------------------ | ----------------- | -------------------------------------------- |
| `## [Name]`                    | `name`            | Extract heading text                         |
| `## [Name]`                    | `slug`            | Convert to kebab-case (lowercase, hyphens)   |
| `### Content` section          | `content`         | Combine all paragraphs, preserve line breaks |
| `### Meta Title` section       | `metaTitle`       | Extract text, trim whitespace                |
| `### Meta Description` section | `metaDescription` | Extract text, trim whitespace                |

## Usage

### Running the Markdown to JSON Conversion

From the project root:

```bash
cd tools/rewrite/cate-and-tag
npx tsx convert.ts
```

Or using pnpm:

```bash
pnpm exec tsx tools/rewrite/cate-and-tag/convert.ts
```

### Exporting Featured Data from Database

To export featured collections data from the local D1 database:

```bash
cd tools/rewrite/cate-and-tag
npx tsx export-featured.ts
```

Or from the project root:

```bash
npx tsx tools/rewrite/cate-and-tag/export-featured.ts
```

This script will:

1. Connect to the local D1 database using wrangler
2. Query all featured items (games, hot, new, categories, tags)
3. Transform the data to match the output format
4. Save to `output/game-featured.json`

### Expected Output

#### Markdown to JSON Conversion (`convert.ts`)

```
=== Game Metadata Markdown to JSON Conversion ===

📁 Converting Categories...

Reading docs/biz/project/dev-meta/game-categories.md...
Parsed 15 categories
Writing tools/rewrite/cate-and-tag/output/game-categories.json...
✓ Categories validation passed

Warnings:
  - Category "Rhythm": Meta Description length is 138 (recommended: 140-160)

📁 Converting Tags...

Reading docs/biz/project/dev-meta/game-tags.md...
Parsed 60 tags
Writing tools/rewrite/cate-and-tag/output/game-tags.json...
✓ Tags validation passed

=== Conversion Summary ===
✓ Categories: 15 items
✓ Tags: 60 items

✅ Conversion completed successfully!
```

#### Featured Data Export (`export-featured.ts`)

```
=== Featured Data Export Tool ===

📡 Fetching featured items from local D1 database...
✓ Fetched 5 featured items from database

🔄 Transforming data...
💾 Writing to /Users/.../tools/rewrite/cate-and-tag/output/game-featured.json...
✓ Saved to /Users/.../tools/rewrite/cate-and-tag/output/game-featured.json

=== Export Summary ===
Total featured items: 5
Generated at: 2025-11-05T08:56:13.222Z
Source: database (featured table - local D1)

Featured items:
  1. All Tags (tags)
  2. All Categories (categories)
  3. Hot (hot)
  4. New (new)
  5. All Games (games)

✅ Export completed successfully!
```

## Validation

The script performs the following validation checks:

### Data Integrity

- ✅ Count validation (15 categories, 60 tags)
- ✅ Required fields present and non-empty
- ✅ Unique slugs (no duplicates)

### SEO Compliance

- ⚠️ Meta Title: 50-60 characters (warns if outside range)
- ⚠️ Meta Description: 140-160 characters (warns if outside range)

### Content Quality

- ✅ No markdown artifacts in extracted text
- ✅ Proper paragraph formatting preserved

## TypeScript Types

### Main Interfaces

```typescript
interface GameCategory {
  name: string; // Category name
  slug: string; // URL-friendly slug
  content: string; // Full description
  metaTitle: string; // SEO meta title
  metaDescription: string; // SEO meta description
}

interface CategoriesOutput {
  categories: GameCategory[];
  metadata: {
    totalCount: number;
    generatedAt: string;
    source: string;
  };
}
```

## Development

### Adding New Features

1. **Custom Validation**: Extend `validateOutput()` in `utils.ts`
2. **New Fields**: Update interfaces in `types.ts`
3. **Parsing Logic**: Modify `parseMarkdown()` in `utils.ts`

### Testing Changes

After modifying the code, run the conversion and verify:

```bash
# Run conversion
npx tsx convert.ts

# Check output
cat output/game-categories.json | head -50
cat output/game-tags.json | head -50
```

## Implementation Details

### Slug Generation

Converts category/tag names to URL-friendly slugs:

```typescript
"Platform Games" → "platform-games"
"2 Player" → "2-player"
"One Button" → "one-button"
```

Algorithm:

1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove non-word characters (except hyphens)
4. Collapse multiple hyphens
5. Trim leading/trailing hyphens

### Parsing Strategy

1. Split content by H2 headings (`##`)
2. For each section, extract:
   - Name from H2 heading
   - Content from `### Content` to next `###`
   - Meta Title from `### Meta Title`
   - Meta Description from `### Meta Description`
3. Transform to JSON structure
4. Add metadata (count, timestamp, source)

## Common Issues

### Issue: Missing Tags/Categories

**Symptom**: Parser finds fewer items than expected

**Cause**: Malformed markdown headings or missing sections

**Solution**: Check that all entries have:

- H2 heading (`## Name`)
- Content section (`### Content`)
- Meta Title section (`### Meta Title`)
- Meta Description section (`### Meta Description`)

### Issue: Character Count Warnings

**Symptom**: Warnings about meta title/description length

**Cause**: SEO recommendations not met (but not critical)

**Solution**:

- Meta Title: Adjust to 50-60 characters
- Meta Description: Adjust to 140-160 characters

## Future Enhancements

- [ ] Watch mode for auto-regeneration
- [ ] Multi-language support (Chinese versions)
- [ ] CLI flags (`--validate`, `--dry-run`)
- [ ] Integration with build pipeline
- [ ] Schema export for TypeScript consumers

## Featured Data Export

### Overview

The `export-featured.ts` script exports featured collection data directly from the Cloudflare D1 database. This data includes SEO content for special pages like Hot Games, New Games, All Games, Categories, and Tags.

### Data Source

- **Database**: Cloudflare D1 (`gamesramp`)
- **Table**: `featured`
- **Method**: Direct query using `wrangler d1 execute`

### Output Format

```json
{
  "featured": [
    {
      "name": "Hot",
      "slug": "hot",
      "content": "Full markdown content for the page...",
      "metaTitle": "Hot Games - Most Popular Games Right Now | GamesRamp",
      "metaDescription": "Play the hottest and most popular games on GamesRamp..."
    }
  ],
  "metadata": {
    "totalCount": 5,
    "generatedAt": "2025-11-05T08:56:13.222Z",
    "source": "database (featured table - local D1)"
  }
}
```

### Featured Items

The featured table typically includes:

1. **games** - All Games collection page
2. **hot** - Hot/Trending games page
3. **new** - New games page
4. **categories** - Categories aggregation page
5. **tags** - Tags aggregation page

### Requirements

- Local D1 database must be set up with `pnpm drizzle:generate` and `pnpm d1:apply`
- Wrangler CLI must be available in the project
- Featured data must exist in the database (can be managed through `/admin/featured`)

### Troubleshooting

**Issue**: "Couldn't find a D1 DB with the name or binding"

- **Solution**: Check that `wrangler.jsonc` has the correct database configuration
- Database name should be `gamesramp` (not `games-ramp-d1`)

**Issue**: Empty results returned

- **Solution**: Add featured items through the admin interface at `/admin/featured`
- Or insert data directly using D1 migrations

## Related Documentation

- **Implementation Plan**: `docs/biz/project/dev-meta/markdown-to-json-conversion-plan.md`
- **Categories Source**: `docs/biz/project/dev-meta/game-categories.md`
- **Tags Source**: `docs/biz/project/dev-meta/game-tags.md`
- **Database Schema**: `src/db/schema.ts` (featured table definition)
- **Featured Management**: `src/app/[locale]/admin/featured/page.tsx`

## License

Part of the GamesRamp project.

---

**Generated**: 2025-11-04
**Last Updated**: 2025-11-05
**Version**: 1.1.0
