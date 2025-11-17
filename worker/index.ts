// @ts-ignore `.open-next/worker.ts` is generated at build time
import { default as handler } from '../.open-next/worker.js';
import { QueueMessage } from '@/types/services/queue';
import { setCachedEnv } from '@/services/base';
import { processTranslationTask } from '@/services/translation/processor';

export default {
  fetch: handler.fetch,

  async scheduled(event) {},

  // @ts-ignore
  async queue(batch: QueueEvent<QueueMessage>, env: CloudflareEnv, ctx: CloudflareContext) {
    console.log('[Worker] Processing queue batch');
    setCachedEnv(env);

    const { messages } = batch;

    for (const message of messages) {
      console.log('[Worker] Processing message:', JSON.stringify(message.body, null, 2));

      try {
        // Handle translation tasks
        if (message.body.type === 'TRANSLATION_TASK') {
          const { taskUuid, languageCode, translationType, categories } = message.body.data;

          console.log(`[Worker] Starting translation task ${taskUuid} for language ${languageCode}`);

          await processTranslationTask({
            taskUuid,
            languageCode,
            translationType,
            categories,
            db: env.DB,
          });

          console.log(`[Worker] Translation task ${taskUuid} completed successfully`);
        } else {
          console.warn(`[Worker] Unknown message type: ${message.body.type}`);
        }
      } catch (error) {
        console.error(`[Worker] Failed to process message:`, error);
        // Note: Message will be retried automatically by Cloudflare Queues
        throw error; // Re-throw to trigger retry
      }
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;

// The re-export is only required if your app uses the DO Queue and DO Tag Cache
// See https://opennext.js.org/cloudflare/caching for details
// @ts-ignore `.open-next/worker.ts` is generated at build time
export { DOQueueHandler, DOShardedTagCache } from '../.open-next/worker.js';
