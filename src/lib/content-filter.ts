/**
 * Content Filtering Utilities
 * Provides content moderation using bad-words
 */

import { Filter } from 'bad-words';

// Initialize bad-words filter
const filter = new Filter();

/**
 * Filter result
 */
export interface FilterResult {
  /**
   * Whether the content is clean
   */
  isClean: boolean;
  /**
   * Cleaned content (with profanity replaced)
   */
  cleanedContent: string;
  /**
   * Whether profanity was detected
   */
  hasProfanity: boolean;
}

/**
 * Check and filter content for profanity
 * @param content Content to check
 * @returns Filter result
 */
export function filterContent(content: string): FilterResult {
  try {
    const isProfane = filter.isProfane(content);
    const cleanedContent = filter.clean(content);

    return {
      isClean: !isProfane,
      cleanedContent,
      hasProfanity: isProfane,
    };
  } catch (error) {
    console.error('Content filtering error:', error);
    // On error, return the original content as clean to avoid blocking
    return {
      isClean: true,
      cleanedContent: content,
      hasProfanity: false,
    };
  }
}

/**
 * Add custom words to filter
 * @param words Words to add
 */
export function addCustomWords(words: string[]) {
  filter.addWords(...words);
}

/**
 * Remove words from filter
 * @param words Words to remove
 */
export function removeWords(words: string[]) {
  filter.removeWords(...words);
}

/**
 * Check if content is too short
 * @param content Content to check
 * @param minLength Minimum length
 * @returns Whether content is valid
 */
export function validateContentLength(
  content: string,
  minLength: number,
  maxLength: number,
): {
  valid: boolean;
  message?: string;
} {
  const trimmedContent = content.trim();
  const length = trimmedContent.length;

  if (length < minLength) {
    return {
      valid: false,
      message: `Content must be at least ${minLength} characters`,
    };
  }

  if (length > maxLength) {
    return {
      valid: false,
      message: `Content must be at most ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param email Email to validate
 * @returns Whether email is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate name format (no special characters, reasonable length)
 * @param name Name to validate
 * @returns Whether name is valid
 */
export function validateName(name: string): {
  valid: boolean;
  message?: string;
} {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return {
      valid: false,
      message: 'Name must be at least 2 characters',
    };
  }

  if (trimmedName.length > 50) {
    return {
      valid: false,
      message: 'Name must be at most 50 characters',
    };
  }

  // Allow letters, numbers, spaces, hyphens, and underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    return {
      valid: false,
      message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { valid: true };
}
