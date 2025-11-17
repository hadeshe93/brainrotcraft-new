/**
 * Search API
 * Provides game search functionality
 */

import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors, APISuccess } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { searchGames } from '@/services/content/search';
import { checkRateLimit, getClientIP, RateLimits } from '@/lib/rate-limit';
import { validatePagination, validateRequired } from '@/lib/validation';

/**
 * GET /api/search?q=keyword&page=1
 * Search games by keyword
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('page_size');

    // Validate query parameter
    const queryValidation = validateRequired(query, 'q');
    if (!queryValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: queryValidation.message,
      });
    }

    // Check query length (2-100 characters)
    const trimmedQuery = query!.trim();
    if (trimmedQuery.length < 2) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Search query must be at least 2 characters',
      });
    }

    if (trimmedQuery.length > 100) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Search query must be at most 100 characters',
      });
    }

    // Validate pagination
    const paginationValidation = validatePagination(page, pageSize, 50);
    if (!paginationValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: paginationValidation.message,
      });
    }

    const { page: pageNum, pageSize: pageSizeNum } = paginationValidation.params!;

    // Get client IP
    const clientIP = getClientIP(request);

    // Check rate limit (30 searches per minute)
    const rateLimitResult = await checkRateLimit(clientIP, RateLimits.SEARCH);
    if (!rateLimitResult.allowed) {
      return await APIErrors.tooManyRequests(ECommonErrorCode.RATE_LIMIT_EXCEEDED, {
        customMessage: `Too many search requests. Please wait ${rateLimitResult.resetIn} seconds`,
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Search games
    const result = await searchGames(
      {
        query: trimmedQuery,
        page: pageNum,
        pageSize: pageSizeNum,
        status: 'online', // Only search online games
      },
      db,
    );

    return await APISuccess.ok({
      results: result.data.map((game) => ({
        uuid: game.uuid,
        name: game.name,
        slug: game.slug,
        thumbnail: game.thumbnail,
        rating: game.rating,
        interact: game.interact,
        upvote_count: game.upvoteCount,
        created_at: game.createdAt,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
