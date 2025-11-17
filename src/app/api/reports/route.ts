/**
 * Public Reports API
 * Handles user report submissions
 */

import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { APIErrors, APISuccess } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { createReport, type CreateReportInput } from '@/services/content/reports';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { checkRateLimit, getClientIP, RateLimits } from '@/lib/rate-limit';
import { validateContentLength, validateEmail, validateName } from '@/lib/content-filter';
import { validateUuid, validateEnum } from '@/lib/validation';

// Valid report types
const REPORT_TYPES = ['copyright', 'inappropriate', 'broken', 'misleading', 'malware', 'other'] as const;

/**
 * POST /api/reports
 * Submit a game report
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any;
    const { game_uuid, report_type, user_name, user_email, content, turnstile_token } = body;

    // Validate required fields
    if (!game_uuid || !report_type || !user_name || !user_email || !content || !turnstile_token) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Missing required fields',
      });
    }

    // Validate game UUID
    const uuidValidation = validateUuid(game_uuid);
    if (!uuidValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: uuidValidation.message,
      });
    }

    // Validate report type
    const typeValidation = validateEnum(report_type, 'report_type', REPORT_TYPES);
    if (!typeValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: typeValidation.message,
      });
    }

    // Validate name
    const nameValidation = validateName(user_name);
    if (!nameValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: nameValidation.message,
      });
    }

    // Validate email
    if (!validateEmail(user_email)) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: 'Invalid email format',
      });
    }

    // Validate content length (20-1000 characters)
    const lengthValidation = validateContentLength(content, 20, 1000);
    if (!lengthValidation.valid) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER, {
        customMessage: lengthValidation.message,
      });
    }

    // Get client IP
    const clientIP = getClientIP(request);

    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(turnstile_token, clientIP);
    if (!turnstileResult.success) {
      return await APIErrors.badRequest(ECommonErrorCode.TURNSTILE_VERIFICATION_FAILED, {
        customMessage: 'Verification failed',
      });
    }

    // Check rate limit (5 reports per hour)
    const rateLimitResult = await checkRateLimit(clientIP, RateLimits.REPORT);
    if (!rateLimitResult.allowed) {
      const minutesRemaining = Math.ceil(rateLimitResult.resetIn / 60);
      return await APIErrors.tooManyRequests(ECommonErrorCode.RATE_LIMIT_EXCEEDED, {
        customMessage: `Too many reports. Please wait ${minutesRemaining} minutes`,
      });
    }

    // Get database
    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    // Create report
    const reportInput: CreateReportInput = {
      gameUuid: game_uuid,
      reportType: report_type,
      userName: user_name,
      userEmail: user_email,
      content: content.trim(),
      status: 'pending',
      ipAddress: clientIP,
    };

    const newReport = await createReport(reportInput, db);

    return await APISuccess.created({
      success: true,
      message: 'Report submitted successfully. Our team will review it shortly.',
      report_uuid: newReport.uuid,
    });
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
