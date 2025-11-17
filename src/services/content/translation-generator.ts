/**
 * Translation Generator Service
 * Fetches source content and generates translations using AI
 */

import { translateGameName, translateSEOContent } from '@/services/translation/ai';
import { DEFAULT_LOCALE } from '@/i18n/language';
import { getLanguageByCode } from '@/services/i18n/languages';
import type { TranslationTaskFields } from '@/types/services/translation';
import type { ContentType } from '@/types/services/translation-audit';

interface GenerateTranslationRequest {
  contentType: ContentType;
  contentUuid: string;
  targetLocale: string;
}

interface GenerateTranslationResponse {
  translations: Record<string, string>;
  cost: number;
  tokensUsed: number;
  sourceContent: {
    uuid: string;
    name: string;
    type: ContentType;
  };
}

/**
 * Get source content from database
 */
async function getSourceContent(
  contentType: ContentType,
  contentUuid: string,
  db: D1Database,
): Promise<{
  name: string;
  fields: TranslationTaskFields;
  context?: string;
}> {
  switch (contentType) {
    case 'category': {
      const result = await db
        .prepare(
          'SELECT uuid, name, metadata_title, metadata_description, content FROM categories WHERE uuid = ? AND deleted_at IS NULL',
        )
        .bind(contentUuid)
        .first();

      if (!result) {
        throw new Error('Category not found');
      }

      return {
        name: result.name as string,
        fields: {
          name: result.name as string,
          metadataTitle: (result.metadata_title as string) || (result.name as string),
          metadataDescription: (result.metadata_description as string) || '',
          content: (result.content as string) || '',
        },
        context: 'This is a game category name and description for SEO purposes.',
      };
    }

    case 'tag': {
      const result = await db
        .prepare(
          'SELECT uuid, name, metadata_title, metadata_description, content FROM tags WHERE uuid = ? AND deleted_at IS NULL',
        )
        .bind(contentUuid)
        .first();

      if (!result) {
        throw new Error('Tag not found');
      }

      return {
        name: result.name as string,
        fields: {
          name: result.name as string,
          metadataTitle: (result.metadata_title as string) || (result.name as string),
          metadataDescription: (result.metadata_description as string) || '',
          content: (result.content as string) || '',
        },
        context: 'This is a game tag name and description for SEO purposes.',
      };
    }

    case 'featured': {
      const result = await db
        .prepare(
          'SELECT uuid, name, metadata_title, metadata_description, content FROM featured WHERE uuid = ? AND deleted_at IS NULL',
        )
        .bind(contentUuid)
        .first();

      if (!result) {
        throw new Error('Featured collection not found');
      }

      return {
        name: result.name as string,
        fields: {
          name: result.name as string,
          metadataTitle: (result.metadata_title as string) || (result.name as string),
          metadataDescription: (result.metadata_description as string) || '',
          content: (result.content as string) || '',
        },
        context: 'This is a featured game collection name and description for SEO purposes.',
      };
    }

    case 'game': {
      const result = await db
        .prepare('SELECT uuid, name, slug FROM games WHERE uuid = ? AND deleted_at IS NULL')
        .bind(contentUuid)
        .first();

      if (!result) {
        throw new Error('Game not found');
      }

      // Get introduction (contains metadata_title, metadata_description, content)
      const intro = await db
        .prepare(
          'SELECT metadata_title, metadata_description, content FROM introductions WHERE game_uuid = ? AND deleted_at IS NULL',
        )
        .bind(contentUuid)
        .first();

      if (!intro) {
        throw new Error('Game introduction not found');
      }

      const fields: TranslationTaskFields = {
        name: result.name as string,
        metadataTitle: (intro.metadata_title as string) || (result.name as string),
        metadataDescription: (intro.metadata_description as string) || '',
        content: (intro.content as string) || '',
      };

      return {
        name: result.name as string,
        fields,
        context: `This is a game named "${result.name}". Translate the name and SEO fields. For the game name, keep it natural and appealing in the target language.`,
      };
    }

    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

/**
 * Generate translation for a content item using AI
 */
export async function generateTranslation(
  request: GenerateTranslationRequest,
  db: D1Database,
): Promise<GenerateTranslationResponse> {
  const { contentType, contentUuid, targetLocale } = request;

  // Validate target locale
  if (targetLocale === DEFAULT_LOCALE) {
    throw new Error('Cannot translate to default locale');
  }

  // Get target language from database
  const languageRecord = await getLanguageByCode(targetLocale, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${targetLocale} not found or disabled`);
  }
  // Get source content
  const sourceContent = await getSourceContent(contentType, contentUuid, db);

  // Prepare texts for translation
  const textsToTranslate: Record<string, string> = {};
  Object.entries(sourceContent.fields).forEach(([field, value]) => {
    if (value) {
      textsToTranslate[field] = value;
    }
  });

  if (Object.keys(textsToTranslate).length === 0) {
    throw new Error('No content to translate');
  }

  // Call new AI translation API
  const translations: Record<string, string> = {};

  // For games, translate name separately using game-specific function
  if (contentType === 'game' && textsToTranslate.name) {
    const translatedName = await translateGameName(textsToTranslate.name, languageRecord.englishName);
    translations.name = translatedName;
  }

  // For category/tag/featured, also translate name using the same function
  if ((contentType === 'category' || contentType === 'tag' || contentType === 'featured') && textsToTranslate.name) {
    const translatedName = await translateGameName(textsToTranslate.name, languageRecord.englishName);
    translations.name = translatedName;
  }

  // Translate SEO content (title, description, content)
  const seoResult = await translateSEOContent(
    {
      metadataTitle: textsToTranslate.metadataTitle || textsToTranslate.name || '',
      metadataDescription: textsToTranslate.metadataDescription || '',
      content: textsToTranslate.content || '',
    },
    languageRecord.englishName,
  );

  // Map results
  if (textsToTranslate.metadataTitle || textsToTranslate.name) {
    translations.metadataTitle = seoResult.metadataTitle;
  }

  if (textsToTranslate.metadataDescription) {
    translations.metadataDescription = seoResult.metadataDescription;
  }

  if (textsToTranslate.content) {
    translations.content = seoResult.content;
  }

  return {
    translations,
    cost: 0, // Cost tracking removed in new implementation
    tokensUsed: 0, // Token tracking removed in new implementation
    sourceContent: {
      uuid: contentUuid,
      name: sourceContent.name,
      type: contentType,
    },
  };
}

/**
 * Generate translations for multiple content items
 */
export async function batchGenerateTranslations(
  requests: GenerateTranslationRequest[],
  db: D1Database,
  onProgress?: (current: number, total: number) => void,
): Promise<GenerateTranslationResponse[]> {
  const results: GenerateTranslationResponse[] = [];

  for (let i = 0; i < requests.length; i++) {
    try {
      const result = await generateTranslation(requests[i], db);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, requests.length);
      }

      // Small delay between requests
      if (i < requests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate translation for ${requests[i].contentUuid}:`, error);
      throw error;
    }
  }

  return results;
}
