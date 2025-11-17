/**
 * AI Comments Generation API
 * POST /api/admin/comments/generate - Generate comments using AI for a specific game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateUuid, validateNumberRange, composeValidation } from '@/lib/validation';
import { getGameByUuid } from '@/services/content/games';
import { batchCreateComments } from '@/services/content/comments';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

/**
 * POST /api/admin/comments/generate
 * Generate AI comments for a game
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as any;
    const { gameUuid, count = 5, autoApprove = false } = body;

    // Validate required fields
    const gameUuidValidation = validateUuid(gameUuid);
    const countValidation = validateNumberRange(count, 'Count', 1, 50);

    const validation = composeValidation(gameUuidValidation, countValidation);

    if (!validation.valid) {
      return await APIErrors.badRequest(validation.errorCode!, { customMessage: validation.message });
    }

    const env = await getCloudflareEnv();
    const db = env.DB;

    // Check if game exists
    const game = await getGameByUuid(gameUuid, db);
    if (!game) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, { customMessage: 'Game not found' });
    }

    // Check if OpenRouter API key is configured
    const openrouterApiKey = (env as any).OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR, {
        customMessage: 'OpenRouter API key not configured',
      });
    }

    // Generate comments using AI
    const openrouter = createOpenRouter({
      apiKey: openrouterApiKey,
    });

    const prompt = `You are a helpful assistant that generates realistic user comments for online games.

Game Information:
- Name: ${game.name}
- Slug: ${game.slug}

Task: Generate ${count} diverse, authentic-sounding user comments about this game.
Each comment should:
- Be 20-150 characters long
- Sound natural and genuine (not overly promotional)
- Express various opinions (positive, neutral, constructive)
- Use casual language that real players would use
- Be unique and different from each other

Format your response as a JSON array of strings, like this:
["comment 1", "comment 2", "comment 3", ...]

Only return the JSON array, no additional text or explanation.`;

    let generatedComments: string[] = [];

    try {
      const { text } = await generateText({
        model: openrouter('anthropic/claude-3-haiku'),
        prompt,
      });

      // Parse the response
      const parsedComments = JSON.parse(text);

      if (Array.isArray(parsedComments)) {
        generatedComments = parsedComments
          .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
          .slice(0, count);
      }

      if (generatedComments.length === 0) {
        throw new Error('No valid comments generated');
      }
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR, {
        customMessage: 'Failed to generate comments with AI',
      });
    }

    // Save comments to database
    const newComments = await batchCreateComments(
      generatedComments.map((content) => ({
        gameUuid,
        userUuid: null,
        content,
        status: autoApprove ? 'approved' : 'pending',
        isAiGenerated: true,
      })),
      db,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          comments: newComments,
          count: newComments.length,
          autoApproved: autoApprove,
        },
        message: `Successfully generated ${newComments.length} AI comments`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error generating comments:', error);

    if (error instanceof Error && error.message === 'Admin access required') {
      return await APIErrors.forbidden(ECommonErrorCode.FORBIDDEN);
    }

    if (error instanceof Error && error.message === 'Authentication required') {
      return await APIErrors.unauthorized(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }

    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
