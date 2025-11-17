/**
 * AI Translation Service
 * Core AI translation functions using OpenRouter via Vercel AI SDK
 */

import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { TRANSLATION_PROMPTS } from './prompts';
import { getCloudflareEnv } from '../base';
import { parseJSON } from '@/lib/json';

/**
 * AI model configuration
 */
const AI_MODEL = 'openai/gpt-4o-mini'; // Fast and cost-effective
const AI_TEMPERATURE = 0.3; // Lower temperature for more consistent translations
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

/**
 * Get OpenRouter API key from environment
 */
async function getOpenRouterKey(): Promise<string> {
  const env = await getCloudflareEnv();
  // Try Cloudflare env first (production)
  if (env?.OPENROUTER_API_KEY) {
    return env.OPENROUTER_API_KEY;
  }

  // Fallback to process.env (development)
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  throw new Error('OPENROUTER_API_KEY is not configured');
}

/**
 * Create OpenRouter provider with API key
 */
function createProvider(apiKey: string) {
  return createOpenRouter({ apiKey });
}

/**
 * Call AI with retry logic
 */
async function callAI(prompt: string, apiKey: string, maxTokens: number, retries = 0): Promise<string> {
  try {
    const openrouter = createProvider(apiKey);
    const model = openrouter(AI_MODEL);

    const { text } = await generateText({
      model,
      prompt,
      temperature: AI_TEMPERATURE,
      ...(maxTokens && { maxTokens }),
    });

    return text.trim();
  } catch (error) {
    // Retry on network errors
    if (retries < MAX_RETRIES && error instanceof Error && error.message.includes('fetch')) {
      console.log(`Retrying AI request (attempt ${retries + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return callAI(prompt, apiKey, maxTokens, retries + 1);
    }

    throw error;
  }
}

/**
 * Translate game name using AI
 *
 * @param text - Game name to translate
 * @param targetLang - Target language
 * @param env - Cloudflare environment (optional, for local development)
 * @returns Translated game name
 *
 * @example
 * ```typescript
 * const translated = await translateGameName(
 *   'Super Mario Bros',
 *   { lang: 'zh', language: '简体中文', languageLocal: '简体中文' }
 * );
 * // Returns: "超级马里奥兄弟"
 * ```
 */
export async function translateGameName(text: string, language: string): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('No text provided for translation');
  }

  const apiKey = await getOpenRouterKey();
  const prompt = TRANSLATION_PROMPTS.game_name(text, language);

  console.log(`[translateGameName] Translating "${text}" to ${language}`);

  const result = await callAI(prompt, apiKey, 200);

  return result;
}

/**
 * Parse JSON response from AI
 */
function parseJSONResponse(content: string): Record<string, string> {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleanContent);

    // Validate that it's an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid JSON structure');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI JSON response:', content);
    throw new Error(
      `Failed to parse AI translation response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Translate SEO content using AI
 *
 * @param data - SEO content to translate (name, title, description, content)
 * @param targetLang - Target language
 * @param env - Cloudflare environment (optional, for local development)
 * @returns Translated SEO content
 *
 * @example
 * ```typescript
 * const translated = await translateSEOContent(
 *   {
 *     name: 'Action Games',
 *     metadataTitle: 'Action Games - Play Free Online',
 *     metadataDescription: 'Discover the best action games...',
 *     content: '# Action Games\n\nAction games are...'
 *   },
 *   { lang: 'zh', language: '简体中文', languageLocal: '简体中文' }
 * );
 * ```
 */
export async function translateSEOContent(
  data: { name?: string; metadataTitle: string; metadataDescription: string; content: string },
  language: string,
): Promise<{ name?: string; metadataTitle: string; metadataDescription: string; content: string }> {
  if (!data.name && !data.metadataTitle && !data.metadataDescription && !data.content) {
    throw new Error('No content provided for translation');
  }

  const apiKey = await getOpenRouterKey();
  const prompt = TRANSLATION_PROMPTS.seo_content(
    {
      name: data.name || '',
      title: data.metadataTitle || '',
      desc: data.metadataDescription || '',
      content: data.content || '',
    },
    language,
  );

  console.log(`[translateSEOContent] Translating SEO content to ${language}`);

  const result = await callAI(prompt, apiKey, 2000);

  // Parse JSON response
  const parsed = parseJSON(result) as Record<string, string> | null;

  return {
    ...(data.name !== undefined && { name: parsed?.name || data.name }),
    metadataTitle: parsed?.metadataTitle || data.metadataTitle,
    metadataDescription: parsed?.metadataDescription || data.metadataDescription,
    content: parsed?.content || data.content,
  };
}
