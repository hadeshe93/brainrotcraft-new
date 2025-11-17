import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GameCategory, GameTag, CategoriesOutput, TagsOutput, ParsedSection } from './types';
import { generateSlug, parseMarkdown, validateOutput, formatValidationResults } from './utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root directory
const PROJECT_ROOT = join(__dirname, '../../..');

/**
 * Convert markdown file to JSON
 */
async function convertMarkdownToJson(
  inputPath: string,
  type: 'categories' | 'tags',
): Promise<CategoriesOutput | TagsOutput> {
  const fullInputPath = join(PROJECT_ROOT, inputPath);

  console.log(`\nReading ${inputPath}...`);

  // Read markdown file
  const content = await readFile(fullInputPath, 'utf-8');

  // Parse markdown
  const sections = parseMarkdown(content);
  console.log(`Parsed ${sections.length} ${type}`);

  // Convert to appropriate format
  const items = sections.map((section: ParsedSection) => ({
    name: section.name,
    slug: generateSlug(section.name),
    content: section.content,
    metaTitle: section.metaTitle,
    metaDescription: section.metaDescription,
  }));

  // Create output object
  const output =
    type === 'categories'
      ? {
          categories: items as GameCategory[],
          metadata: {
            totalCount: items.length,
            generatedAt: new Date().toISOString(),
            source: inputPath,
          },
        }
      : {
          tags: items as GameTag[],
          metadata: {
            totalCount: items.length,
            generatedAt: new Date().toISOString(),
            source: inputPath,
          },
        };

  return output;
}

/**
 * Write JSON to file
 */
async function writeJson(outputPath: string, data: CategoriesOutput | TagsOutput): Promise<void> {
  const fullOutputPath = join(PROJECT_ROOT, outputPath);

  // Ensure output directory exists
  await mkdir(dirname(fullOutputPath), { recursive: true });

  // Write JSON file with pretty formatting
  await writeFile(fullOutputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`Writing ${outputPath}...`);
}

/**
 * Main conversion function
 */
async function main() {
  try {
    console.log('=== Game Metadata Markdown to JSON Conversion ===\n');

    // Convert categories
    console.log('📁 Converting Categories...');
    const categoriesData = await convertMarkdownToJson('docs/biz/project/dev-meta/game-categories.md', 'categories');
    await writeJson('tools/rewrite/cate-and-tag/output/game-categories.json', categoriesData);

    // Validate categories
    const categoriesValidation = validateOutput(categoriesData, 'categories');
    console.log(formatValidationResults(categoriesValidation, 'Categories'));

    // Convert tags
    console.log('\n📁 Converting Tags...');
    const tagsData = await convertMarkdownToJson('docs/biz/project/dev-meta/game-tags.md', 'tags');
    await writeJson('tools/rewrite/cate-and-tag/output/game-tags.json', tagsData);

    // Validate tags
    const tagsValidation = validateOutput(tagsData, 'tags');
    console.log(formatValidationResults(tagsValidation, 'Tags'));

    // Summary
    console.log('\n=== Conversion Summary ===');
    console.log(`✓ Categories: ${categoriesData.categories.length} items`);
    console.log(`✓ Tags: ${tagsData.tags.length} items`);

    if (categoriesValidation.valid && tagsValidation.valid) {
      console.log('\n✅ Conversion completed successfully!');
    } else {
      console.log('\n⚠️  Conversion completed with errors. Please review the issues above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error during conversion:', error);
    process.exit(1);
  }
}

// Run the conversion
main();
