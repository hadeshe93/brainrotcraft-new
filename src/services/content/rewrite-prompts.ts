/**
 * Content Rewrite Prompt Builder
 * 基于 tools/rewrite/geometrylite.io/lib/prompt-builder.ts 严格对齐
 * 生成 SEO 优化的内容改写提示词
 */

export type EntityType = 'category' | 'tag' | 'featured' | 'game';

export interface SEOContent {
  metadataTitle: string;
  metadataDescription: string;
  content: string;
}

/**
 * 改写提示词构建器
 */
export class RewritePromptBuilder {
  /**
   * 构建内容改写提示词
   * @param entity - 实体类型 (category/tag/featured/game)
   * @param originalName - 原始名称
   * @param originalContent - 原始内容
   * @returns 结构化提示词
   */
  buildRewritePrompt(entity: EntityType, originalName: string, originalContent: SEOContent): string {
    const entityDisplay = {
      category: 'Game Category',
      tag: 'Game Tag',
      featured: 'Featured Collection',
      game: 'Game',
    }[entity];

    // 根据实体类型决定内容要求
    const contentRequirements =
      entity === 'game'
        ? {
            shortDescription: '1-2 engaging sentences (20-40 words) that hook players immediately',
            whatIs:
              'Comprehensive introduction covering: concept, genre, platform, main objective, target audience (150-250 words)',
            howToPlay:
              'Detailed gameplay instructions including: basic controls, mechanics, progression system, beginner tips (200-300 words)',
            whatMakesSpecial:
              'Unique selling points: standout features, what differentiates from similar items, why players love it (150-200 words)',
            faqs: '3-5 FAQs covering: platform compatibility, difficulty, multiplayer, updates, tips (50-100 words per answer)',
          }
        : {
            // 对于分类/标签/特性合集，使用更通用的结构
            introduction: 'Comprehensive overview of this ' + entityDisplay.toLowerCase() + ' (150-200 words)',
            features: 'Key features and characteristics (150-200 words)',
            benefits: 'Value proposition and why it matters to players (100-150 words)',
          };

    return `You are a professional game content writer creating engaging descriptions for players.

**TASK**: Research and rewrite comprehensive content for the ${entityDisplay} "${originalName}".

**ORIGINAL CONTENT** (for reference):
- Title: ${originalContent.metadataTitle}
- Description: ${originalContent.metadataDescription}
- Content:
${originalContent.content}

**INSTRUCTIONS**:
1. Use Google Search to research the latest information about "${originalName}"
2. Focus on what players want to know: gameplay, features, tips, and unique aspects
3. Write in an engaging, player-focused tone
4. Ensure accuracy by verifying information from multiple sources
5. Create completely new phrasing while keeping the same factual information

**OUTPUT REQUIREMENTS**:

Generate a JSON object with the following structure:

\`\`\`json
{
  "content": "${entity === 'game' ? 'Rewritten comprehensive content following the structure below' : 'Rewritten content maintaining original structure and information'}",
  "metadataTitle": "SEO-optimized title (50-60 characters, include '${originalName}' and key benefit)",
  "metadataDescription": "Compelling meta description (150-160 characters, include main features and call-to-action)"
}
\`\`\`

${
  entity === 'game'
    ? `
**CONTENT STRUCTURE FOR GAMES**:
The "content" field should be a comprehensive rewrite in Markdown format covering:

1. **Short Description**: ${contentRequirements.shortDescription}
2. **What Is ${originalName}**: ${contentRequirements.whatIs}
3. **How to Play**: ${contentRequirements.howToPlay}
4. **What Makes It Special**: ${contentRequirements.whatMakesSpecial}
5. **FAQs**: ${contentRequirements.faqs}
   Include 3-5 FAQs covering: platform compatibility, difficulty level, multiplayer options, updates, tips

The "content" field format should be like this:
"""
[Short description Content]

## What Is ${originalName}?
[What Is ${originalName} Content]

## How to Play ${originalName}?
[How to Play ${originalName} Content]

## What Makes ${originalName} Special?
[What Makes ${originalName} Special Content]

## FAQs
### [Common player question]
[Clear, helpful answer (50-100 words)]
"""
`
    : `
**CONTENT STRUCTURE FOR ${entityDisplay.toUpperCase()}**:
The "content" field should maintain the original structure while rewriting to cover:

1. **Introduction**: ${contentRequirements.introduction}
2. **Key Features**: ${contentRequirements.features}
3. **Benefits**: ${contentRequirements.benefits}

The "content" field format should be like this:
"""
[Introduction Content]

## Key Features
[Key Features Content]

## Benefits
[Benefits Content]
"""
`
}

**META GUIDELINES**:
- **metadataTitle**: 50-60 characters, format: "${originalName} - [Key Feature/Benefit]"
- **metadataDescription**: 150-160 characters, include game/category name, main features, and call-to-action
- Brand name is optional (low priority, only if space permits)

**STYLE GUIDELINES**:
- Write from player's perspective
- Use active voice and present tense
- Be specific and avoid generic descriptions
- Include concrete examples and details
- Make content scannable with clear sections
- Maintain professional gaming industry tone

**RESEARCH FOCUS**:
- Current gameplay mechanics and features
- Player reviews and common questions
- Recent updates or versions
- Platform availability
- Difficulty level and learning curve
- Community feedback and tips

Return ONLY the JSON object, no additional text.`;
  }
}
