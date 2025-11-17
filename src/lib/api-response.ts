/**
 * API Response Utilities
 * Provides unified error and success response creation for API routes
 */

import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { ErrorCodeUtils, ServiceErrorCode } from '@/types/services/errors';

/**
 * Standard error response structure
 */
export interface APIErrorResponse {
  success: false;
  message: string;
  errorCode: ServiceErrorCode;
  category: string;
}

/**
 * Standard success response structure
 */
export interface APISuccessResponse<T = any, M = any> {
  success: true;
  data: T;
  message: string;
  meta?: M;
}

export type APIResponse<T = any, M = any> = APISuccessResponse<T, M> | APIErrorResponse;

/**
 * Options for creating error response
 */
export interface CreateErrorResponseOptions {
  /** The service error code */
  errorCode: ServiceErrorCode;
  /** HTTP status code (optional, will use ErrorCodeUtils.getHttpStatusCode if not provided) */
  statusCode?: number;
  /** Custom error message (optional, will use translation if not provided) */
  customMessage?: string;
  /** Additional response headers */
  headers?: Record<string, string>;
}

export interface CreateAPIErrorResultOptions {
  errorCode: ServiceErrorCode;
  customMessage?: string;
}

export async function createAPIErrorResult(options: CreateAPIErrorResultOptions): Promise<APIErrorResponse> {
  const { errorCode, customMessage } = options;

  let message = customMessage;
  if (!message) {
    const tError = await getTranslations('error');
    message = typeof errorCode === 'undefined' ? 'Unknown Error' : tError(errorCode.toString() as any);
  }

  return {
    success: false,
    message,
    errorCode: errorCode,
    category: ErrorCodeUtils.getErrorCategory(errorCode),
  };
}

/**
 * Creates a standardized error response with translated message
 *
 * @param options - Error response configuration
 * @returns NextResponse with error structure
 */
export async function createErrorResponse(
  options: CreateErrorResponseOptions,
): Promise<NextResponse<APIErrorResponse>> {
  const { errorCode, statusCode, customMessage, headers } = options;

  let message = customMessage;
  if (!message) {
    const tError = await getTranslations('error');
    message = typeof errorCode === 'undefined' ? 'Unknown Error' : tError(errorCode.toString() as any);
  }

  return NextResponse.json(
    {
      success: false,
      message,
      errorCode: errorCode,
      category: ErrorCodeUtils.getErrorCategory(errorCode),
    },
    {
      // status: statusCode || ErrorCodeUtils.getHttpStatusCode(errorCode),
      status: statusCode || 200,
      headers: headers,
    },
  );
}

/**
 * Creates a standardized success response
 *
 * @param data - Response data
 * @param message - Success message
 * @param meta - Optional metadata
 * @param statusCode - HTTP status code (default: 200)
 * @returns NextResponse with success structure
 */
export async function createSuccessResponse<T = any, M = any>(
  data: T,
  message?: string,
  meta?: M,
  statusCode: number = 200,
): Promise<NextResponse<APISuccessResponse<T, M>>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || 'Success',
      meta,
    },
    { status: statusCode },
  );
}

/**
 * Common success responses for frequently used scenarios
 */
export const APISuccess = {
  /**
   * OK response (200)
   */
  ok: <T = any, M = any>(data: T, message?: string, meta?: M) => createSuccessResponse(data, message, meta, 200),

  /**
   * Created response (201)
   */
  created: <T = any, M = any>(data: T, message?: string, meta?: M) => createSuccessResponse(data, message, meta, 201),

  /**
   * Accepted response (202)
   */
  accepted: <T = any, M = any>(data: T, message?: string, meta?: M) => createSuccessResponse(data, message, meta, 202),

  /**
   * No content response (204)
   */
  noContent: () => new NextResponse(null, { status: 204 }),
};

/**
 * Common error responses for frequently used scenarios
 */
export const APIErrors = {
  /**
   * Invalid request parameters
   */
  badRequest: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 400, ...options }),

  /**
   * Authentication required
   */
  unauthorized: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 401, ...options }),

  /**
   * Permission denied
   */
  forbidden: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 403, ...options }),

  /**
   * Resource not found
   */
  notFound: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 404, ...options }),

  /**
   * Method not allowed
   */
  methodNotAllowed: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 405, ...options }),

  /**
   * Rate limit exceeded
   */
  tooManyRequests: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 429, ...options }),

  /**
   * Internal server error
   */
  internalError: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 500, ...options }),

  /**
   * Service unavailable
   */
  serviceUnavailable: (
    errorCode: ServiceErrorCode,
    options?: Partial<Omit<CreateErrorResponseOptions, 'errorCode' | 'statusCode'>>,
  ) => createErrorResponse({ errorCode, statusCode: 503, ...options }),
};
