/**
 * Gemini Rewriter
 * Interface with Gemini AI using Google Search Grounding
 */

import { smartChat, getAIProvider, AIProvider } from '../../../../tools/ai';
import { CONFIG } from '../config';
import type { GameContent } from '../types';

export class GeminiRewriter {
  /**
   * Get the appropriate model name for the current provider
   * @returns Model name with provider-specific prefix if needed
   */
  private getModelName(): string {
    const provider = getAIProvider();
    const baseModel = CONFIG.model;

    // OpenRouter requires 'google/' prefix for Google models
    if (provider === AIProvider.OPENROUTER) {
      return `google/${baseModel}`;
    }

    return baseModel;
  }

  /**
   * Rewrite game content using Gemini AI with Google Search Grounding
   * Uses smartChat which automatically selects provider based on AI_PROVIDER env var
   * @param gameName - Name of the game
   * @param originalContent - Original content for reference
   * @param prompt - Generated prompt from PromptBuilder
   * @returns Parsed game content
   */
  async rewriteGameContent(_gameName: string, _originalContent: string, prompt: string): Promise<GameContent> {
    const response = await smartChat({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: this.getModelName(),
      temperature: CONFIG.temperature,
      maxTokens: CONFIG.maxTokens,
    });

    // Parse JSON response
    // Try to extract JSON from code block first
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response.content;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        shortDescription: parsed.shortDescription,
        whatIs: parsed.whatIs,
        howToPlay: parsed.howToPlay,
        whatMakesSpecial: parsed.whatMakesSpecial,
        faqs: parsed.faqs,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
      };
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error}`);
    }
  }
}
