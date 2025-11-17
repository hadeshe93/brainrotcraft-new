/**
 * Configuration for game content rewriting system
 */

export const CONFIG = {
  // AI Model Settings
  model: 'gemini-2.5-pro' as const,
  temperature: 0.7,
  maxTokens: 4000,

  // Processing Settings
  concurrency: 4, // 3-5 concurrent requests
  retryAttempts: 1, // Retry once on failure
  retryDelay: 2000, // 2 seconds between retries

  // Meta Length Limits
  metaTitle: { min: 50, max: 60 },
  metaDescription: { min: 150, max: 160 },
  shortDescription: { minWords: 20, maxWords: 40 },

  // Validation Settings
  validationDeltaRange: 5, // Allow ±5 characters tolerance for metaTitle and metaDescription validation

  // FAQ Settings
  faqCount: { min: 3, max: 5 },

  // Paths
  inputDir: 'tools/spider/geometrylite.io/output',
  outputDir: 'tools/rewrite/geometrylite.io/output',

  // Brand Name (optional, low priority)
  brandName: 'GamesRamp',
} as const;
