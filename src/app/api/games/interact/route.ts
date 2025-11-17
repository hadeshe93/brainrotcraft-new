/**
 * Game Interaction API
 * Handles user interactions with games (upvote, downvote, save, share)
 */

import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors, APISuccess } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import {
  getGameByUuid,
  incrementInteract,
  incrementUpvote,
  incrementDownvote,
  incrementSave,
  incrementShare,
  decrementUpvote,
  decrementDownvote,
  decrementSave,
} from '@/services/content/games';
import { checkRateLimit, getClientIP, RateLimits } from '@/lib/rate-limit';
import { validateUuid, validateEnum } from '@/lib/validation';

// Valid interaction actions
const ACTIONS = ['upvote', 'downvote', 'save', 'share', 'cancel_upvote', 'cancel_downvote', 'cancel_save'] as const;

/**
 * POST /api/games/interact
 * Handle game interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any;
    const { game_uuid, action } = body;

    // Validate required fields
    if (!game_uuid || !action) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Missing required fields: game_uuid and action',
      });
    }

    // Validate game UUID
    const uuidValidation = validateUuid(game_uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: uuidValidation.message,
      });
    }

    // Validate action
    const actionValidation = validateEnum(action, 'action', ACTIONS);
    if (!actionValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: actionValidation.message,
      });
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Check rate limit (1 action per 10 seconds)
    const rateLimitResult = await checkRateLimit(clientIP, RateLimits.INTERACT);
    if (!rateLimitResult.allowed) {
      return await APIErrors.tooManyRequests(ECommonErrorCode.RATE_LIMIT_EXCEEDED, {
        customMessage: `Too many interactions. Please wait ${rateLimitResult.resetIn} seconds`,
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Check if game exists
    const game = await getGameByUuid(game_uuid, db);
    if (!game) {
      return await APIErrors.notFound(ECommonErrorCode.RESOURCE_NOT_FOUND, { customMessage: 'Resource not found' });
    }

    // Check if game is online
    if (game.status !== 'online') {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Game is not available for interactions',
      });
    }

    // Perform the action
    let updatedGame;
    let newCount;

    switch (action) {
      case 'upvote':
        updatedGame = await incrementUpvote(game_uuid, db);
        await incrementInteract(game_uuid, db);
        newCount = updatedGame?.upvoteCount || 0;
        break;

      case 'downvote':
        updatedGame = await incrementDownvote(game_uuid, db);
        await incrementInteract(game_uuid, db);
        newCount = updatedGame?.downvoteCount || 0;
        break;

      case 'save':
        updatedGame = await incrementSave(game_uuid, db);
        await incrementInteract(game_uuid, db);
        newCount = updatedGame?.saveCount || 0;
        break;

      case 'share':
        updatedGame = await incrementShare(game_uuid, db);
        await incrementInteract(game_uuid, db);
        newCount = updatedGame?.shareCount || 0;
        break;

      case 'cancel_upvote':
        updatedGame = await decrementUpvote(game_uuid, db);
        newCount = updatedGame?.upvoteCount || 0;
        break;

      case 'cancel_downvote':
        updatedGame = await decrementDownvote(game_uuid, db);
        newCount = updatedGame?.downvoteCount || 0;
        break;

      case 'cancel_save':
        updatedGame = await decrementSave(game_uuid, db);
        newCount = updatedGame?.saveCount || 0;
        break;

      default:
        return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, { customMessage: 'Invalid action' });
    }

    return await APISuccess.ok({
      success: true,
      message: 'Interaction recorded successfully',
      action,
      new_count: newCount,
      game: {
        upvote_count: updatedGame?.upvoteCount || 0,
        downvote_count: updatedGame?.downvoteCount || 0,
        save_count: updatedGame?.saveCount || 0,
        share_count: updatedGame?.shareCount || 0,
        interact: updatedGame?.interact || 0,
      },
    });
  } catch (error) {
    console.error('POST /api/games/interact error:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
