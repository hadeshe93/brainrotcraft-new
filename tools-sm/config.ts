/**
 * Configuration for SimilarWeb scraper
 */

/**
 * Target domains to scrape from SimilarWeb
 * Can be full URLs or just domain names
 */
export const TARGET_DOMAINS = [
  'github.com',
  // Add more domains here
];

/**
 * Scraper configuration options
 */
export const CONFIG = {
  // Maximum timeout for page navigation (in milliseconds)
  timeout: 90000,

  // Additional wait time after page load (in milliseconds)
  stabilizationDelay: 5000,

  // Slow down automation for better visibility (in milliseconds)
  slowMo: 50,

  // Whether to show browser window
  headless: false,

  // Viewport size
  viewport: {
    width: 1920,
    height: 1080,
  },

  // User agent
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};
