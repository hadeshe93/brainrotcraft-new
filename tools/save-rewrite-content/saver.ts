import { CONFIG } from './config';
import fs from 'fs/promises';

export class Saver {
  /**
   * Save content to markdown file
   * @param gameTitle - Game title
   * @param content - Game content
   */
  async saveContentFile(gameTitle: string, content: any): Promise<void> {
    const fileName = `${this.slugify(gameTitle)}.md`;
    const filePath = `${CONFIG.outputDir}/content/${fileName}`;

    const markdown = `${content.shortDescription}

## What is ${gameTitle}?

${content.whatIs}

## How to Play ${gameTitle}?

${content.howToPlay}

## What Makes ${gameTitle} Special?

${content.whatMakesSpecial}

## Frequently Asked Questions

${content.faqs.map((faq: any) => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}
`;

    await fs.mkdir(`${CONFIG.outputDir}/content`, { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf-8');
  }

  /**
   * Convert string to URL-friendly slug
   * @param text - Text to slugify
   * @returns Slugified text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}