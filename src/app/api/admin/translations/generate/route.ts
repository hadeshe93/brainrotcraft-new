/**
 * Translation Generation API Routes
 * POST /api/admin/translations/generate - Generate AI translation for content or create batch translation task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { generateTranslation } from '@/services/content/translation-generator';
import { createTranslationTask } from '@/services/i18n/translation-tasks';
import { getLanguageByCode } from '@/services/i18n/languages';
import { processTranslationTask } from '@/services/translation/processor';
import { auditTranslations } from '@/services/content/translation-audit';
import type { ContentType } from '@/types/services/translation-audit';
import type { TranslationQueueMessage } from '@/types/services/queue';

/**
 * POST /api/admin/translations/generate
 *
 * Mode 1 - Single content translation (original behavior):
 * Request body:
 * {
 *   "contentType": "category" | "tag" | "featured" | "game",
 *   "contentUuid": "uuid-string",
 *   "targetLocale": "zh" | "ja" | ...
 * }
 *
 * Mode 2 - Batch translation task (new behavior):
 * Request body:
 * {
 *   "languageCode": "zh" | "ja" | ...,
 *   "type": "full" | "supplement"
 * }
 *
 * Response (Mode 1):
 * {
 *   "success": true,
 *   "data": {
 *     "translations": { "field1": "value1", ... },
 *     "cost": 0.001,
 *     "tokensUsed": 123,
 *     "sourceContent": { "uuid": "...", "name": "...", "type": "..." }
 *   }
 * }
 *
 * Response (Mode 2):
 * {
 *   "success": true,
 *   "data": {
 *     "taskUuid": "...",
 *     "status": "pending"
 *   },
 *   "message": "Translation task created successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin(request);

    // Get database
    const env = await getCloudflareEnv();
    const db = env.DB;

    // Parse request body
    const body = (await request.json()) as {
      contentType?: string;
      contentUuid?: string;
      targetLocale?: string;
      languageCode?: string;
      type?: 'full' | 'supplement';
    };
    const { contentType, contentUuid, targetLocale, languageCode, type } = body;

    // Mode 2: Batch translation task
    if (languageCode && type) {
      // Validate language code
      const language = await getLanguageByCode(languageCode, db);
      if (!language) {
        return NextResponse.json(
          {
            success: false,
            message: 'Language not found',
          },
          { status: 404 },
        );
      }

      // Validate type
      if (type !== 'full' && type !== 'supplement') {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid type. Must be "full" or "supplement"',
          },
          { status: 400 },
        );
      }

      // Get accurate counts based on translation type
      // For supplement: count items needing translation (missing + partial)
      // For full: count all items
      let gamesCount = 0;
      let categoriesCount = 0;
      let tagsCount = 0;
      let featuredCount = 0;

      if (type === 'supplement') {
        // Use audit system to count items actually needing translation
        const auditData = await auditTranslations({ locales: [languageCode] }, db);

        if (auditData.stats?.byType) {
          const typeStats = auditData.stats.byType;

          // Games: use online games statistics (primary focus)
          if (typeStats.game?.online) {
            gamesCount = typeStats.game.online.missingItems + typeStats.game.online.partialItems;
          } else if (typeStats.game) {
            gamesCount = typeStats.game.missingItems + typeStats.game.partialItems;
          }

          // Other content types
          if (typeStats.category) {
            categoriesCount = typeStats.category.missingItems + typeStats.category.partialItems;
          }
          if (typeStats.tag) {
            tagsCount = typeStats.tag.missingItems + typeStats.tag.partialItems;
          }
          if (typeStats.featured) {
            featuredCount = typeStats.featured.missingItems + typeStats.featured.partialItems;
          }
        }
      } else {
        // Full translation: count all items
        const [games, categories, tags, featured] = await Promise.all([
          db
            .prepare("SELECT COUNT(*) as count FROM games WHERE deleted_at IS NULL AND status = 'online'")
            .first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM categories WHERE deleted_at IS NULL').first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM tags WHERE deleted_at IS NULL').first<{ count: number }>(),
          db.prepare('SELECT COUNT(*) as count FROM featured WHERE deleted_at IS NULL').first<{ count: number }>(),
        ]);

        gamesCount = games?.count || 0;
        categoriesCount = categories?.count || 0;
        tagsCount = tags?.count || 0;
        featuredCount = featured?.count || 0;
      }

      // Check if there's any content to translate
      const totalCount = gamesCount + categoriesCount + tagsCount + featuredCount;
      if (totalCount === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'No content needs translation. All translations are up to date.',
          },
          { status: 400 },
        );
      }

      // Create translation task with accurate progress estimation
      const task = await createTranslationTask(
        {
          languageCode,
          type,
          estimatedProgress: {
            games: { done: 0, total: gamesCount },
            categories: { done: 0, total: categoriesCount },
            tags: { done: 0, total: tagsCount },
            featured: { done: 0, total: featuredCount },
          },
        },
        db,
      );

      // Environment-based processing
      if (process.env.NODE_ENV === 'development') {
        // Local development: Process task immediately (non-blocking)
        console.log(`[API] Local development mode: Triggering translation task ${task.uuid} immediately`);

        // Process in the background (don't await)
        processTranslationTask({
          taskUuid: task.uuid,
          languageCode,
          translationType: type,
          categories: {
            games: true,
            categories: true,
            tags: true,
            featured: true,
          },
          db,
        }).catch((error) => {
          console.error(`[API] Background translation task ${task.uuid} failed:`, error);
        });
      } else {
        // Production: Send to Cloudflare Queue
        console.log(`[API] Production mode: Sending translation task ${task.uuid} to queue`);

        const message: TranslationQueueMessage = {
          type: 'TRANSLATION_TASK',
          data: {
            taskUuid: task.uuid,
            languageCode,
            translationType: type,
            categories: {
              games: true,
              categories: true,
              tags: true,
              featured: true,
            },
          },
        };

        // Send to queue (requires QUEUE to be configured in wrangler.jsonc)
        const envWithQueue = env as CloudflareEnv & { QUEUE?: Queue<TranslationQueueMessage> };
        if (envWithQueue.QUEUE) {
          await envWithQueue.QUEUE.send(message);
        } else {
          console.warn('[API] QUEUE not configured. Task will not be processed.');
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          taskUuid: task.uuid,
          status: task.status,
        },
        message: 'Translation task created successfully. Task will be processed in the background.',
      });
    }

    // Mode 1: Single content translation (original behavior)
    // Validate inputs
    if (!contentType || !contentUuid || !targetLocale) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields. Provide either (languageCode, type) for batch translation or (contentType, contentUuid, targetLocale) for single translation.',
        },
        { status: 400 },
      );
    }

    const validContentTypes: ContentType[] = ['category', 'tag', 'featured', 'game'];
    if (!validContentTypes.includes(contentType as ContentType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Generate translation
    const result = await generateTranslation(
      {
        contentType: contentType as ContentType,
        contentUuid: contentUuid as string,
        targetLocale: targetLocale as string,
      },
      db,
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Translation generated successfully',
    });
  } catch (error) {
    console.error('Error generating translation:', error);

    if (error instanceof Error) {
      // Handle specific errors
      if (error.message === 'Admin access required') {
        return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
      }

      if (error.message === 'Authentication required') {
        return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
      }

      if (
        error.message.includes('not found') ||
        error.message.includes('Cannot translate') ||
        error.message.includes('No content')
      ) {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
          },
          { status: 400 },
        );
      }

      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          {
            success: false,
            message: 'OpenAI API is not configured. Please contact the administrator.',
          },
          { status: 503 },
        );
      }

      if (error.message.includes('OpenAI API error')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Translation service error. Please try again later.',
            error: error.message,
          },
          { status: 503 },
        );
      }
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
