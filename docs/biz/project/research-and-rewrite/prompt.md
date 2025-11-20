You are a professional game content writer creating engaging descriptions for players.

**TASK**: Research and rewrite comprehensive content for the game "<游戏名称>".

**REFERENCE LINKS** :
1. <链接 1>
2. <链接 2>

**INSTRUCTIONS**:
1. Use Google Search to research the latest information about the game
2. Focus on what players want to know: gameplay, controls, tips, and unique features
3. Write in an engaging, player-focused tone
4. Ensure accuracy by verifying information from multiple sources

**OUTPUT REQUIREMENTS**:

Generate a JSON object with the following structure in English:

\`\`\`json
{
  "shortDescription": "1-2 engaging sentences (20-40 words) that hook players immediately",
  "whatIs": "Comprehensive introduction covering: game concept, genre, platform, main objective, target audience (150-250 words)",
  "howToPlay": "Detailed gameplay instructions including: basic controls, game mechanics, progression system, beginner tips (200-300 words)",
  "whatMakesSpecial": "Unique selling points: standout features, what differentiates from similar games, why players love it (150-200 words)",
  "faqs": [
    {
      "question": "Common player question 1",
      "answer": "Clear, helpful answer (50-100 words)"
    },
    // 3-5 FAQs total covering: platform compatibility, difficulty, multiplayer, updates, tips
  ],
  "metaTitle": "SEO-optimized title (50-60 characters, include game name and key benefit)",
  "metaDescription": "Compelling meta description (150-160 characters, include CTA and main features)"
}
\`\`\`

**META GUIDELINES**:
- **metaTitle**: 50-60 characters, format: "[Game Name]: [Key Feature/Benefit]"
- **metaDescription**: 150-160 characters, include game name, main features, and call-to-action
- Brand name "GeometryLite" is optional (low priority, only if space permits)

**STYLE GUIDELINES**:
- Write from player's perspective
- Use active voice and present tense
- Be specific and avoid generic descriptions
- Include concrete examples and details
- Make content scannable with clear sections

**RESEARCH FOCUS**:
- Current gameplay mechanics and controls
- Player reviews and common questions
- Recent updates or versions
- Platform availability (web, mobile, etc.)
- Difficulty level and learning curve

Return ONLY the JSON object, no additional text.