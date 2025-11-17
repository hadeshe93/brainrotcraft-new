/**
 * Queue Message Types
 * Defines message formats for Cloudflare Queues
 */

/**
 * Translation Queue Message
 * Used to trigger batch translation tasks
 */
export interface TranslationQueueMessage {
  type: 'TRANSLATION_TASK';
  data: {
    taskUuid: string; // Translation task UUID
    languageCode: string; // Target language code (e.g., 'zh', 'ja')
    translationType: 'full' | 'supplement'; // Full translation or supplement missing translations
    categories: {
      games: boolean; // Whether to translate games
      categories: boolean; // Whether to translate categories
      tags: boolean; // Whether to translate tags
      featured: boolean; // Whether to translate featured items
    };
  };
}

/**
 * Union type for all queue messages
 * Add more message types here as needed
 */
export type QueueMessage = TranslationQueueMessage;
