/**
 * Translation Prompts
 * AI translation prompt templates for different content types
 *
 * NOTE: Using English prompts for better translation quality and consistency
 */

import type { Language } from '@/i18n/language';

/**
 * Translation prompt templates
 */
export const TRANSLATION_PROMPTS = {
  /**
   * Game name translation prompt
   */
  game_name: (name: string, language: string) => `
You are a professional game localization expert. Translate the following game name to ${language}.

Requirements:
- Keep the translation concise and natural
- Preserve brand names and proper nouns when appropriate
- Follow local gaming community conventions
- Use official translations for well-known games
- **Output ONLY the translated name, no explanations or extra content**

Game name: ${name}

Translation:`,

  /**
   * SEO content translation prompt
   * Returns JSON format with translated fields
   */
  seo_content: (data: { title: string; desc: string; content: string; name?: string }, language: string) => `
You are a professional SEO and localization expert. Translate the following content to ${language}.

Requirements:
- Maintain SEO optimization principles with natural keyword distribution
- Use idiomatic and natural native expressions
- Preserve all HTML tags and Markdown formatting
- Keep consistent tone and style
- Accurately convey the original meaning

Original content:${data.name ? `\nName: ${data.name}` : ''}
SEO Title: ${data.title}
SEO Description: ${data.desc}
Content: ${data.content}

Output the translation in JSON format:
{${data.name ? '\n  "name": "translated name",' : ''}
  "metadataTitle": "translated SEO title",
  "metadataDescription": "translated SEO description",
  "content": "translated content"
}

**Output ONLY valid JSON, no explanations or extra content**`,
};
