/**
 * Admin API - Fix User Credit Pool
 * GET /api/admin/credits/fix
 *
 * Features:
 * 1. Check and fix logical issues in user credit pool
 * 2. Clean up expired credit reservations
 * 3. Compare consistency between credit pool and database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createAPIErrorResult } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode, EUserCreditsErrorCode } from '@/types/services/errors';
import { fixUserCreditPool } from '@/services/user/credits';

/**
 * GET request handler
 *
 * @param request - Next.js request object
 * @returns API response
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Get and validate token
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const userUuid = searchParams.get('uuid');

    // 1.1 Check if token exists
    if (!token) {
      return createErrorResponse({
        errorCode: EValidationErrorCode.MISSING_REQUIRED_PARAMETER,
        customMessage: 'Missing required parameter: token',
      });
    }

    // 1.2 Verify token is correct
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (!adminToken) {
      console.error('ADMIN_API_TOKEN environment variable is not configured');
      return createErrorResponse({
        errorCode: ECommonErrorCode.ENV_VAR_MISSING,
        customMessage: 'Server configuration error',
      });
    }

    if (token !== adminToken) {
      return createErrorResponse({
        errorCode: ECommonErrorCode.FORBIDDEN,
        customMessage: 'Invalid admin token',
        statusCode: 403,
      });
    }

    // 2. Validate user UUID
    if (!userUuid) {
      return createErrorResponse({
        errorCode: EValidationErrorCode.MISSING_REQUIRED_PARAMETER,
        customMessage: 'Missing required parameter: uuid',
      });
    }

    if (typeof userUuid !== 'string' || userUuid.length === 0) {
      return createErrorResponse({
        errorCode: EUserCreditsErrorCode.INVALID_USER_UUID,
        customMessage: 'Invalid user UUID format',
      });
    }

    // 3. Execute credit pool fix
    console.log(`Starting credit pool fix: userUuid=${userUuid}`);

    const fixResult = await fixUserCreditPool(userUuid);

    if (!fixResult.success) {
      console.error(`Credit pool fix failed: userUuid=${userUuid}, errorCode=${fixResult.errorCode}`);

      const errorResponse = await createAPIErrorResult({
        errorCode: fixResult.errorCode || EUserCreditsErrorCode.CREDIT_SYSTEM_UNAVAILABLE,
        customMessage: fixResult.message,
      });

      return NextResponse.json(errorResponse, { status: 200 });
    }

    // 4. Return success response
    const result = fixResult.data!;
    console.log(`Credit pool fix completed: userUuid=${userUuid}`);
    console.log(`   - Number of fixes: ${result.poolFixDetails.fixedIssues.length}`);
    console.log(`   - Has changes: ${result.poolFixDetails.hasChanges}`);
    if (result.dbAlignmentInfo) {
      console.log(`   - Database difference: ${result.dbAlignmentInfo.hasDifference ? 'exists' : 'none'}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: result.poolFixDetails.hasChanges
          ? `Successfully fixed ${result.poolFixDetails.fixedIssues.length} issues`
          : 'Credit pool is healthy, no fixes needed',
        data: {
          userUuid,
          hasChanges: result.poolFixDetails.hasChanges,
          fixedIssues: result.poolFixDetails.fixedIssues,
          poolState: {
            before: {
              totalCreditsInCurrentCycle: result.poolFixDetails.beforeState.totalCreditsInCurrentCycle,
              usedCreditsInCurrentCycle: result.poolFixDetails.beforeState.usedCreditsInCurrentCycle,
              totalPermanentCredits: result.poolFixDetails.beforeState.totalPermanentCredits,
              usedPermanentCredits: result.poolFixDetails.beforeState.usedPermanentCredits,
              pendingReservationsCount: Object.keys(result.poolFixDetails.beforeState.pendingReservations).length,
            },
            after: {
              totalCreditsInCurrentCycle: result.poolFixDetails.afterState.totalCreditsInCurrentCycle,
              usedCreditsInCurrentCycle: result.poolFixDetails.afterState.usedCreditsInCurrentCycle,
              totalPermanentCredits: result.poolFixDetails.afterState.totalPermanentCredits,
              usedPermanentCredits: result.poolFixDetails.afterState.usedPermanentCredits,
              pendingReservationsCount: Object.keys(result.poolFixDetails.afterState.pendingReservations).length,
              currentCycleStartTime: result.poolFixDetails.afterState.currentCycleStartTime,
              currentCycleEndTime: result.poolFixDetails.afterState.currentCycleEndTime,
            },
          },
          dbAlignment: result.dbAlignmentInfo
            ? {
                hasDifference: result.dbAlignmentInfo.hasDifference,
                dbUsedCycleCredits: result.dbAlignmentInfo.dbUsedCycleCredits,
                dbUsedPermanentCredits: result.dbAlignmentInfo.dbUsedPermanentCredits,
                differenceNotes: result.dbAlignmentInfo.differenceNotes,
              }
            : null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Credit pool fix API error:', error);

    return createErrorResponse({
      errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      customMessage: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
