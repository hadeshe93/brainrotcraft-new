/**
 * Translation Task Processor
 * Core service for processing batch translation tasks
 *
 * Architecture:
 * - Local development: Directly called by API
 * - Production: Called by Worker queue consumer
 */

import { translateGameName, translateSEOContent } from '@/services/translation/ai';
import { updateTranslationTask, getTranslationTaskByUuid } from '@/services/i18n/translation-tasks';
import type { TranslationTaskProgress } from '@/services/i18n/translation-tasks';
import { DEFAULT_LOCALE } from '@/i18n/language';
import { getLanguageByCode } from '@/services/i18n/languages';
import type { Language } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';
import { TRANSLATABLE_FIELDS, isTranslationComplete } from '@/lib/translation-completeness';
import { getAllTranslations } from '@/services/i18n/translation';
import { categoryTranslations, tagTranslations, featuredTranslations, introductionTranslations } from '@/db/schema';

interface ProcessTaskParams {
  taskUuid: string;
  languageCode: string;
  translationType: 'full' | 'supplement';
  categories: {
    games: boolean;
    categories: boolean;
    tags: boolean;
    featured: boolean;
  };
  db: D1Database;
}

/**
 * Helper: Update task progress for a specific module
 */
async function updateTaskProgress(
  taskUuid: string,
  module: keyof TranslationTaskProgress,
  progress: { done: number; total: number },
  db: D1Database,
): Promise<void> {
  // Get current task
  const task = await getTranslationTaskByUuid(taskUuid, db);
  if (!task) return;

  // Update progress
  const updatedProgress: TranslationTaskProgress = {
    ...task.progress,
    [module]: progress,
  };

  // Save to database
  await updateTranslationTask(
    taskUuid,
    {
      progress: updatedProgress,
    },
    db,
  );
}

/**
 * Translate Games (updates nameI18n JSON field AND game introductions)
 */
async function translateGames(
  taskUuid: string,
  languageCode: string,
  translationType: 'full' | 'supplement',
  db: D1Database,
): Promise<void> {
  console.log(`[translateGames] Starting translation for language: ${languageCode}, type: ${translationType}`);

  // Query all non-deleted online games WITH their introductions
  const gamesResult = await db
    .prepare(
      `SELECT g.uuid, g.name, g.name_i18n,
              i.metadata_title, i.metadata_description, i.content
       FROM games g
       LEFT JOIN introductions i ON g.uuid = i.game_uuid AND i.deleted_at IS NULL
       WHERE g.status = ? AND g.deleted_at IS NULL`,
    )
    .bind('online')
    .all();

  const games = gamesResult.results || [];
  const total = games.length;
  let done = 0;

  console.log(`[translateGames] Found ${total} games to process`);

  // Initialize progress
  await updateTaskProgress(taskUuid, 'games', { done, total }, db);

  // Get target language from database
  const languageRecord = await getLanguageByCode(languageCode, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${languageCode} not found or disabled`);
  }

  for (const game of games) {
    try {
      const gameUuid = game.uuid as string;
      const gameName = game.name as string;
      const nameI18n = game.name_i18n ? JSON.parse(game.name_i18n as string) : {};

      // Get introduction data
      const hasIntroduction = !!game.metadata_title;
      const introData = hasIntroduction
        ? {
            metadataTitle: (game.metadata_title as string) || '',
            metadataDescription: (game.metadata_description as string) || '',
            content: (game.content as string) || '',
          }
        : null;

      // Check if translations exist (for supplement mode)
      let nameTranslationExists = false;
      let introTranslationComplete = false;

      if (translationType === 'supplement') {
        // Check name translation
        nameTranslationExists = !!nameI18n[languageCode];

        // Check introduction translation using shared logic
        if (hasIntroduction && introData) {
          // Use getAllTranslations to get properly formatted translation (camelCase fields)
          const introTranslations = await getAllTranslations(
            introductionTranslations,
            introductionTranslations.gameUuid,
            gameUuid,
            db,
          );

          const existingIntroTranslation = introTranslations[languageCode] || null;

          // Use shared logic to check if translation is complete
          introTranslationComplete = isTranslationComplete(
            introData,
            existingIntroTranslation,
            TRANSLATABLE_FIELDS.introduction,
          );
        }

        // Skip if both translations exist and are complete
        if (nameTranslationExists && (!hasIntroduction || introTranslationComplete)) {
          done++;
          await updateTaskProgress(taskUuid, 'games', { done, total }, db);
          continue;
        }
      }

      console.log(
        `[translateGames] Translating game: ${gameName}. Because: name=${nameTranslationExists}, intro=${introTranslationComplete}, hasIntro=${hasIntroduction}`,
      );

      // Translate game name (if needed)
      if (!nameTranslationExists) {
        const translatedName = await translateGameName(gameName, languageRecord.englishName);

        // Update nameI18n JSON field
        const updatedNameI18n = {
          ...nameI18n,
          [languageCode]: translatedName,
        };

        await db
          .prepare('UPDATE games SET name_i18n = ? WHERE uuid = ?')
          .bind(JSON.stringify(updatedNameI18n), gameUuid)
          .run();

        console.log(`[translateGames] Translated name: ${gameName} -> ${translatedName}`);
      }

      // Translate game introduction (if exists and needed)
      if (hasIntroduction && introData && !introTranslationComplete) {
        const translatedIntro = await translateSEOContent(introData, languageRecord.englishName);

        const now = Math.floor(Date.now() / 1000);

        // Upsert introduction translation
        await db
          .prepare(
            `INSERT INTO introduction_translations (game_uuid, locale, metadata_title, metadata_description, content, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(game_uuid, locale) DO UPDATE SET
               metadata_title = excluded.metadata_title,
               metadata_description = excluded.metadata_description,
               content = excluded.content,
               updated_at = excluded.updated_at`,
          )
          .bind(
            gameUuid,
            languageCode,
            translatedIntro.metadataTitle,
            translatedIntro.metadataDescription,
            translatedIntro.content,
            now,
            now,
          )
          .run();

        console.log(`[translateGames] Translated introduction for: ${gameName}`);
      }

      done++;
      await updateTaskProgress(taskUuid, 'games', { done, total }, db);

      console.log(`[translateGames] Completed ${done}/${total}: ${gameName}`);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[translateGames] Failed to translate game ${game.uuid}:`, error);
      // Continue with next game
      done++;
      await updateTaskProgress(taskUuid, 'games', { done, total }, db);
    }
  }

  console.log(`[translateGames] Completed: ${done}/${total} games translated`);
}

/**
 * Translate Categories (inserts/updates category_translations table)
 */
async function translateCategories(
  taskUuid: string,
  languageCode: string,
  translationType: 'full' | 'supplement',
  db: D1Database,
): Promise<void> {
  console.log(`[translateCategories] Starting translation for language: ${languageCode}, type: ${translationType}`);

  // Query all non-deleted categories with SEO fields
  const categoriesResult = await db
    .prepare(
      'SELECT uuid, name, metadata_title, metadata_description, content FROM categories WHERE deleted_at IS NULL',
    )
    .all();

  const categories = categoriesResult.results || [];
  const total = categories.length;
  let done = 0;

  console.log(`[translateCategories] Found ${total} categories to process`);

  // Initialize progress
  await updateTaskProgress(taskUuid, 'categories', { done, total }, db);

  // Get target language from database
  const languageRecord = await getLanguageByCode(languageCode, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${languageCode} not found or disabled`);
  }

  for (const category of categories) {
    try {
      const categoryUuid = category.uuid as string;
      const categoryName = category.name as string;
      const metadataTitle = (category.metadata_title as string) || '';
      const metadataDescription = (category.metadata_description as string) || '';
      const content = (category.content as string) || '';

      // Check if translation exists and is complete using shared logic
      if (translationType === 'supplement') {
        // Use getAllTranslations to get properly formatted translation (camelCase fields)
        const translations = await getAllTranslations(
          categoryTranslations,
          categoryTranslations.categoryUuid,
          categoryUuid,
          db,
        );

        const existing = translations[languageCode] || null;

        // Build source content
        const sourceContent = {
          name: categoryName,
          metadataTitle: metadataTitle,
          metadataDescription: metadataDescription,
          content: content,
        };

        // Check if translation is complete using shared logic
        if (isTranslationComplete(sourceContent, existing, TRANSLATABLE_FIELDS.category)) {
          done++;
          await updateTaskProgress(taskUuid, 'categories', { done, total }, db);
          continue;
        }
      }

      // Translate category fields
      console.log(`[translateCategories] Translating category: ${categoryName}`);

      const translationResult = await translateSEOContent(
        {
          name: categoryName,
          metadataTitle: metadataTitle || categoryName,
          metadataDescription: metadataDescription,
          content: content,
        },
        languageRecord.englishName,
      );

      const now = Math.floor(Date.now() / 1000);

      // Upsert translation
      await db
        .prepare(
          `INSERT INTO category_translations (category_uuid, locale, name, metadata_title, metadata_description, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(category_uuid, locale) DO UPDATE SET
             name = excluded.name,
             metadata_title = excluded.metadata_title,
             metadata_description = excluded.metadata_description,
             content = excluded.content,
             updated_at = excluded.updated_at`,
        )
        .bind(
          categoryUuid,
          languageCode,
          translationResult.name || categoryName,
          translationResult.metadataTitle,
          translationResult.metadataDescription,
          translationResult.content || null,
          now,
          now,
        )
        .run();

      done++;
      await updateTaskProgress(taskUuid, 'categories', { done, total }, db);

      console.log(`[translateCategories] Translated ${done}/${total}: ${categoryName}`);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[translateCategories] Failed to translate category ${category.uuid}:`, error);
      // Continue with next category
      done++;
      await updateTaskProgress(taskUuid, 'categories', { done, total }, db);
    }
  }

  console.log(`[translateCategories] Completed: ${done}/${total} categories translated`);
}

/**
 * Translate Tags (inserts/updates tag_translations table)
 */
async function translateTags(
  taskUuid: string,
  languageCode: string,
  translationType: 'full' | 'supplement',
  db: D1Database,
): Promise<void> {
  console.log(`[translateTags] Starting translation for language: ${languageCode}, type: ${translationType}`);

  // Query all non-deleted tags with SEO fields
  const tagsResult = await db
    .prepare('SELECT uuid, name, metadata_title, metadata_description, content FROM tags WHERE deleted_at IS NULL')
    .all();

  const tags = tagsResult.results || [];
  const total = tags.length;
  let done = 0;

  console.log(`[translateTags] Found ${total} tags to process`);

  // Initialize progress
  await updateTaskProgress(taskUuid, 'tags', { done, total }, db);

  // Get target language from database
  const languageRecord = await getLanguageByCode(languageCode, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${languageCode} not found or disabled`);
  }

  for (const tag of tags) {
    try {
      const tagUuid = tag.uuid as string;
      const tagName = tag.name as string;
      const metadataTitle = (tag.metadata_title as string) || '';
      const metadataDescription = (tag.metadata_description as string) || '';
      const content = (tag.content as string) || '';

      // Check if translation exists and is complete using shared logic
      if (translationType === 'supplement') {
        // Use getAllTranslations to get properly formatted translation (camelCase fields)
        const translations = await getAllTranslations(tagTranslations, tagTranslations.tagUuid, tagUuid, db);

        const existing = translations[languageCode] || null;

        // Build source content
        const sourceContent = {
          name: tagName,
          metadataTitle: metadataTitle,
          metadataDescription: metadataDescription,
          content: content,
        };

        // Check if translation is complete using shared logic
        if (isTranslationComplete(sourceContent, existing, TRANSLATABLE_FIELDS.tag)) {
          done++;
          await updateTaskProgress(taskUuid, 'tags', { done, total }, db);
          continue;
        }
      }

      // Translate tag fields
      console.log(`[translateTags] Translating tag: ${tagName}`);

      const translationResult = await translateSEOContent(
        {
          name: tagName,
          metadataTitle: metadataTitle || tagName,
          metadataDescription: metadataDescription,
          content: content,
        },
        languageRecord.englishName,
      );

      const now = Math.floor(Date.now() / 1000);

      // Upsert translation
      await db
        .prepare(
          `INSERT INTO tag_translations (tag_uuid, locale, name, metadata_title, metadata_description, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(tag_uuid, locale) DO UPDATE SET
             name = excluded.name,
             metadata_title = excluded.metadata_title,
             metadata_description = excluded.metadata_description,
             content = excluded.content,
             updated_at = excluded.updated_at`,
        )
        .bind(
          tagUuid,
          languageCode,
          translationResult.name || tagName,
          translationResult.metadataTitle,
          translationResult.metadataDescription,
          translationResult.content || null,
          now,
          now,
        )
        .run();

      done++;
      await updateTaskProgress(taskUuid, 'tags', { done, total }, db);

      console.log(`[translateTags] Translated ${done}/${total}: ${tagName}`);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[translateTags] Failed to translate tag ${tag.uuid}:`, error);
      // Continue with next tag
      done++;
      await updateTaskProgress(taskUuid, 'tags', { done, total }, db);
    }
  }

  console.log(`[translateTags] Completed: ${done}/${total} tags translated`);
}

/**
 * Translate Featured (inserts/updates featured_translations table)
 */
async function translateFeatured(
  taskUuid: string,
  languageCode: string,
  translationType: 'full' | 'supplement',
  db: D1Database,
): Promise<void> {
  console.log(`[translateFeatured] Starting translation for language: ${languageCode}, type: ${translationType}`);

  // Query all non-deleted featured collections with SEO fields
  const featuredResult = await db
    .prepare('SELECT uuid, name, metadata_title, metadata_description, content FROM featured WHERE deleted_at IS NULL')
    .all();

  const featured = featuredResult.results || [];
  const total = featured.length;
  let done = 0;

  console.log(`[translateFeatured] Found ${total} featured collections to process`);

  // Initialize progress
  await updateTaskProgress(taskUuid, 'featured', { done, total }, db);

  // Get target language from database
  const languageRecord = await getLanguageByCode(languageCode, db);
  if (!languageRecord || !languageRecord.enabled) {
    throw new Error(`Language ${languageCode} not found or disabled`);
  }

  for (const item of featured) {
    try {
      const featuredUuid = item.uuid as string;
      const featuredName = item.name as string;
      const metadataTitle = (item.metadata_title as string) || '';
      const metadataDescription = (item.metadata_description as string) || '';
      const content = (item.content as string) || '';

      // Check if translation exists and is complete using shared logic
      if (translationType === 'supplement') {
        // Use getAllTranslations to get properly formatted translation (camelCase fields)
        const translations = await getAllTranslations(
          featuredTranslations,
          featuredTranslations.featuredUuid,
          featuredUuid,
          db,
        );

        const existing = translations[languageCode] || null;

        // Build source content
        const sourceContent = {
          name: featuredName,
          metadataTitle: metadataTitle,
          metadataDescription: metadataDescription,
          content: content,
        };

        // Check if translation is complete using shared logic
        if (isTranslationComplete(sourceContent, existing, TRANSLATABLE_FIELDS.featured)) {
          done++;
          await updateTaskProgress(taskUuid, 'featured', { done, total }, db);
          continue;
        }
      }

      // Translate featured fields
      console.log(`[translateFeatured] Translating featured: ${featuredName}`);

      const translationResult = await translateSEOContent(
        {
          name: featuredName,
          metadataTitle: metadataTitle || featuredName,
          metadataDescription: metadataDescription,
          content: content,
        },
        languageRecord.englishName,
      );

      const now = Math.floor(Date.now() / 1000);

      // Upsert translation
      await db
        .prepare(
          `INSERT INTO featured_translations (featured_uuid, locale, name, metadata_title, metadata_description, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(featured_uuid, locale) DO UPDATE SET
             name = excluded.name,
             metadata_title = excluded.metadata_title,
             metadata_description = excluded.metadata_description,
             content = excluded.content,
             updated_at = excluded.updated_at`,
        )
        .bind(
          featuredUuid,
          languageCode,
          translationResult.name || featuredName,
          translationResult.metadataTitle,
          translationResult.metadataDescription,
          translationResult.content || null,
          now,
          now,
        )
        .run();

      done++;
      await updateTaskProgress(taskUuid, 'featured', { done, total }, db);

      console.log(`[translateFeatured] Translated ${done}/${total}: ${featuredName}`);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[translateFeatured] Failed to translate featured ${item.uuid}:`, error);
      // Continue with next item
      done++;
      await updateTaskProgress(taskUuid, 'featured', { done, total }, db);
    }
  }

  console.log(`[translateFeatured] Completed: ${done}/${total} featured collections translated`);
}

/**
 * Main Translation Task Processor
 * Processes a translation task by translating all selected categories
 */
export async function processTranslationTask(params: ProcessTaskParams): Promise<void> {
  const { taskUuid, languageCode, translationType, categories, db } = params;

  console.log(`[processTranslationTask] Starting task ${taskUuid} for language ${languageCode}`);
  console.log(`[processTranslationTask] Translation type: ${translationType}`);
  console.log(`[processTranslationTask] Categories:`, categories);

  try {
    // Update task status to 'running'
    await updateTranslationTask(
      taskUuid,
      {
        status: 'running',
        startedAt: Math.floor(Date.now() / 1000),
      },
      db,
    );

    // Process each category based on configuration
    if (categories.games) {
      await translateGames(taskUuid, languageCode, translationType, db);
    }

    if (categories.categories) {
      await translateCategories(taskUuid, languageCode, translationType, db);
    }

    if (categories.tags) {
      await translateTags(taskUuid, languageCode, translationType, db);
    }

    if (categories.featured) {
      await translateFeatured(taskUuid, languageCode, translationType, db);
    }

    // Update task status to 'completed'
    await updateTranslationTask(
      taskUuid,
      {
        status: 'completed',
        completedAt: Math.floor(Date.now() / 1000),
        error: null,
      },
      db,
    );

    console.log(`[processTranslationTask] Task ${taskUuid} completed successfully`);
  } catch (error) {
    console.error(`[processTranslationTask] Task ${taskUuid} failed:`, error);

    // Update task status to 'failed'
    await updateTranslationTask(
      taskUuid,
      {
        status: 'failed',
        completedAt: Math.floor(Date.now() / 1000),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      db,
    );

    throw error;
  }
}
