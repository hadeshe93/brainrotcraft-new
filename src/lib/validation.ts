/**
 * API Request Validation Utilities
 * Provides common validation helpers for API routes
 */

import { ECommonErrorCode, EValidationErrorCode, ServiceErrorCode } from '@/types/services/errors';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errorCode?: ServiceErrorCode;
  message?: string;
}

/**
 * UUID validation regex (nanoid format: 21 characters)
 */
const UUID_REGEX = /^[a-zA-Z0-9_-]{21}$/;

/**
 * Slug validation regex (lowercase alphanumeric with hyphens)
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates if a string is a valid UUID
 */
export function validateUuid(uuid: string | null | undefined): ValidationResult {
  if (!uuid) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: 'UUID is required',
    };
  }

  if (!UUID_REGEX.test(uuid)) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: 'Invalid UUID format',
    };
  }

  return { valid: true };
}

/**
 * Validates if a string is a valid slug
 */
export function validateSlug(slug: string | null | undefined, required: boolean = true): ValidationResult {
  // IMPORTANT: Allow empty string for homepage game
  // Empty string ('') is different from null/undefined
  if (slug === '') {
    return { valid: true };
  }

  // Handle null or undefined (preserve original logic)
  if (slug === null || slug === undefined) {
    return required
      ? {
          valid: false,
          errorCode: EValidationErrorCode.INVALID_PARAMETER,
          message: 'Slug is required',
        }
      : { valid: true };
  }

  // Length check (only for non-empty strings)
  if (slug.length < 1 || slug.length > 100) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: 'Slug must be between 1 and 100 characters',
    };
  }

  // Format check
  if (!SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: 'Slug can only contain lowercase letters, numbers, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Validates if a string is not empty
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} is required`,
    };
  }

  return { valid: true };
}

/**
 * Validates string length
 */
export function validateLength(
  value: string | null | undefined,
  fieldName: string,
  min?: number,
  max?: number,
): ValidationResult {
  if (!value) {
    return { valid: true }; // Use validateRequired for required checks
  }

  const length = value.length;

  if (min !== undefined && length < min) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be at least ${min} characters`,
    };
  }

  if (max !== undefined && length > max) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be at most ${max} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validates a number is within range
 */
export function validateNumberRange(
  value: number | null | undefined,
  fieldName: string,
  min?: number,
  max?: number,
): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: true }; // Use validateRequired for required checks
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be a valid number`,
    };
  }

  if (min !== undefined && value < min) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be at least ${min}`,
    };
  }

  if (max !== undefined && value > max) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be at most ${max}`,
    };
  }

  return { valid: true };
}

/**
 * Validates an enum value
 */
export function validateEnum<T extends string>(
  value: T | null | undefined,
  fieldName: string,
  allowedValues: readonly T[],
  required: boolean = true,
): ValidationResult {
  if (!value) {
    return required
      ? {
          valid: false,
          errorCode: EValidationErrorCode.INVALID_PARAMETER,
          message: `${fieldName} is required`,
        }
      : { valid: true };
  }

  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates a URL
 */
export function validateUrl(
  url: string | null | undefined,
  fieldName: string,
  required: boolean = true,
): ValidationResult {
  if (!url) {
    return required
      ? {
          valid: false,
          errorCode: EValidationErrorCode.INVALID_PARAMETER,
          message: `${fieldName} is required`,
        }
      : { valid: true };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `${fieldName} must be a valid URL`,
    };
  }
}

/**
 * Validates pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function validatePagination(
  page: string | number | null | undefined,
  pageSize: string | number | null | undefined,
  maxPageSize: number = 100,
): ValidationResult & { params?: PaginationParams } {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : (page ?? 1);
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : (pageSize ?? 20);

  if (isNaN(pageNum) || pageNum < 1) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: 'Page must be a positive integer',
    };
  }

  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > maxPageSize) {
    return {
      valid: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
      message: `Page size must be between 1 and ${maxPageSize}`,
    };
  }

  return {
    valid: true,
    params: {
      page: pageNum,
      pageSize: pageSizeNum,
    },
  };
}

/**
 * Composes multiple validation results
 * Returns the first error found, or success if all valid
 */
export function composeValidation(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
