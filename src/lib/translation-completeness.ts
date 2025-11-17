/**
 * Translation Completeness Utilities
 * Shared logic for checking translation completeness across audit and processor
 */

/**
 * Translatable fields definition for each content type
 */
export const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  category: ['name', 'metadataTitle', 'metadataDescription', 'content'],
  tag: ['name', 'metadataTitle', 'metadataDescription', 'content'],
  featured: ['name', 'metadataTitle', 'metadataDescription', 'content'],
  introduction: ['metadataTitle', 'metadataDescription', 'content'],
  game: ['name'], // Game name is handled separately
} as const;

/**
 * Check if a field value is considered "empty"
 */
export function isFieldEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Get required fields from source content
 * Returns only fields that have non-empty values in the source
 */
export function getRequiredFields(sourceContent: Record<string, any>, translatableFields: string[]): string[] {
  return translatableFields.filter((field) => !isFieldEmpty(sourceContent[field]));
}

/**
 * Check if translation is complete for given source content
 * @param sourceContent - Source content in default locale
 * @param translation - Translation content
 * @param translatableFields - List of fields that can be translated
 * @returns true if translation is complete (all required fields are translated)
 */
export function isTranslationComplete(
  sourceContent: Record<string, any>,
  translation: Record<string, any> | null,
  translatableFields: string[],
): boolean {
  // Get fields that need to be translated (have values in source)
  const requiredFields = getRequiredFields(sourceContent, translatableFields);

  // If no fields need translation, it's complete
  if (requiredFields.length === 0) {
    return true;
  }

  // If translation is missing entirely, it's not complete
  if (!translation) {
    return false;
  }

  // Check if all required fields are present and non-empty in translation
  return requiredFields.every((field) => !isFieldEmpty(translation[field]));
}

/**
 * Get missing fields from translation
 * @param sourceContent - Source content in default locale
 * @param translation - Translation content
 * @param translatableFields - List of fields that can be translated
 * @returns Array of field names that are missing or empty in translation
 */
export function getMissingFields(
  sourceContent: Record<string, any>,
  translation: Record<string, any> | null,
  translatableFields: string[],
): string[] {
  const requiredFields = getRequiredFields(sourceContent, translatableFields);

  if (!translation) {
    return requiredFields;
  }

  return requiredFields.filter((field) => isFieldEmpty(translation[field]));
}

/**
 * Calculate translation completeness percentage
 * @param sourceContent - Source content in default locale
 * @param translation - Translation content
 * @param translatableFields - List of fields that can be translated
 * @returns Completeness value between 0 and 1
 */
export function calculateCompleteness(
  sourceContent: Record<string, any>,
  translation: Record<string, any> | null,
  translatableFields: string[],
): number {
  const requiredFields = getRequiredFields(sourceContent, translatableFields);

  if (requiredFields.length === 0) {
    return 1;
  }

  if (!translation) {
    return 0;
  }

  const missingFields = getMissingFields(sourceContent, translation, translatableFields);
  return 1 - missingFields.length / requiredFields.length;
}
