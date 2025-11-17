/**
 * Validator
 * Validate generated content against requirements
 */

import { CONFIG } from '../config';
import type { GameContent } from '../types';

export class Validator {
  /**
   * Validate game content against configured requirements
   * @param content - Generated game content
   * @returns Validation result with errors array
   */
  validate(content: GameContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const delta = CONFIG.validationDeltaRange;

    // Validate metaTitle length with tolerance
    const titleLen = content.metaTitle?.length || 0;
    const titleMinWithTolerance = CONFIG.metaTitle.min - delta;
    const titleMaxWithTolerance = CONFIG.metaTitle.max + delta;
    if (titleLen < titleMinWithTolerance || titleLen > titleMaxWithTolerance) {
      errors.push(
        `metaTitle length ${titleLen} outside range ${titleMinWithTolerance}-${titleMaxWithTolerance} (strict: ${CONFIG.metaTitle.min}-${CONFIG.metaTitle.max})`,
      );
    }

    // Validate metaDescription length with tolerance
    const descLen = content.metaDescription?.length || 0;
    const descMinWithTolerance = CONFIG.metaDescription.min - delta;
    const descMaxWithTolerance = CONFIG.metaDescription.max + delta;
    if (descLen < descMinWithTolerance || descLen > descMaxWithTolerance) {
      errors.push(
        `metaDescription length ${descLen} outside range ${descMinWithTolerance}-${descMaxWithTolerance} (strict: ${CONFIG.metaDescription.min}-${CONFIG.metaDescription.max})`,
      );
    }

    // Validate shortDescription word count
    const wordCount = content.shortDescription.split(/\s+/).length;
    if (wordCount < CONFIG.shortDescription.minWords || wordCount > CONFIG.shortDescription.maxWords) {
      errors.push(
        `shortDescription word count ${wordCount} outside range ${CONFIG.shortDescription.minWords}-${CONFIG.shortDescription.maxWords}`,
      );
    }

    // Validate FAQ count
    const faqCount = content.faqs.length;
    if (faqCount < CONFIG.faqCount.min || faqCount > CONFIG.faqCount.max) {
      errors.push(`FAQ count ${faqCount} outside range ${CONFIG.faqCount.min}-${CONFIG.faqCount.max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
