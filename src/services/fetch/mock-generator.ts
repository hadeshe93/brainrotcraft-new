/**
 * Mock 数据生成器 - 用于本地开发测试
 * 生成 5-10 条模拟数据用于测试数据拉取功能
 */

// Mock 分类数据
export const mockCategories = [
  {
    uuid: 'mock-cat-001',
    name: 'Action Mock',
    slug: 'action',
    iconUrl: '/icons/action.svg',
    metadataTitle: 'Action Games - Fast-Paced Gaming Experience',
    metadataDescription: 'Explore our collection of action-packed games',
    content: '# Action Games\n\nFast-paced games that require quick reflexes.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    uuid: 'mock-cat-002',
    name: 'Adventure Mock',
    slug: 'adventure',
    iconUrl: '/icons/adventure.svg',
    metadataTitle: 'Adventure Games - Epic Journeys Await',
    metadataDescription: 'Embark on exciting adventures in our game collection',
    content: '# Adventure Games\n\nExplore vast worlds and solve mysteries.',
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
  },
  {
    uuid: 'mock-cat-003',
    name: 'Puzzle Mock',
    slug: 'puzzle',
    iconUrl: '/icons/puzzle.svg',
    metadataTitle: 'Puzzle Games - Challenge Your Mind',
    metadataDescription: 'Brain-teasing puzzle games for all ages',
    content: '# Puzzle Games\n\nTest your problem-solving skills.',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
  },
  {
    uuid: 'mock-cat-004',
    name: 'Racing Mock',
    slug: 'racing',
    iconUrl: '/icons/racing.svg',
    metadataTitle: 'Racing Games - High-Speed Thrills',
    metadataDescription: 'Feel the adrenaline rush with racing games',
    content: '# Racing Games\n\nSpeed and competition at its finest.',
    createdAt: new Date('2024-01-04').toISOString(),
    updatedAt: new Date('2024-01-04').toISOString(),
  },
  {
    uuid: 'mock-cat-005',
    name: 'Strategy Mock',
    slug: 'strategy',
    iconUrl: '/icons/strategy.svg',
    metadataTitle: 'Strategy Games - Plan Your Victory',
    metadataDescription: 'Tactical and strategic gameplay experiences',
    content: '# Strategy Games\n\nOutsmart your opponents with careful planning.',
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-05').toISOString(),
  },
];

// Mock 标签数据
export const mockTags = [
  {
    uuid: 'mock-tag-001',
    name: 'Multiplayer Mock',
    slug: 'multiplayer',
    metadataTitle: 'Multiplayer Games',
    metadataDescription: 'Games you can play with friends',
    content: '# Multiplayer\n\nPlay with friends online.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    uuid: 'mock-tag-002',
    name: '3D Mock',
    slug: '3d',
    metadataTitle: '3D Games',
    metadataDescription: 'Immersive 3D gaming experiences',
    content: '# 3D Games\n\nExperience depth and immersion.',
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
  },
  {
    uuid: 'mock-tag-003',
    name: 'Retro Mock',
    slug: 'retro',
    metadataTitle: 'Retro Games',
    metadataDescription: 'Classic games with nostalgic vibes',
    content: '# Retro Games\n\nClassic gaming nostalgia.',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
  },
  {
    uuid: 'mock-tag-004',
    name: 'Casual Mock',
    slug: 'casual',
    metadataTitle: 'Casual Games',
    metadataDescription: 'Easy-to-play games for everyone',
    content: '# Casual Games\n\nRelaxing and easy to pick up.',
    createdAt: new Date('2024-01-04').toISOString(),
    updatedAt: new Date('2024-01-04').toISOString(),
  },
  {
    uuid: 'mock-tag-005',
    name: 'Hardcore Mock',
    slug: 'hardcore',
    metadataTitle: 'Hardcore Games',
    metadataDescription: 'Challenging games for experienced players',
    content: '# Hardcore Games\n\nFor the dedicated gamers.',
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-05').toISOString(),
  },
];

// Mock 特性合集数据
export const mockFeatured = [
  {
    uuid: 'mock-feat-001',
    name: 'Hot Games Mock',
    slug: 'hot',
    metadataTitle: 'Hot Games - Trending Now',
    metadataDescription: 'The most popular games right now',
    content: '# Hot Games\n\nTrending games everyone is playing.',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    uuid: 'mock-feat-002',
    name: 'New Releases Mock',
    slug: 'new',
    metadataTitle: 'New Games - Latest Additions',
    metadataDescription: 'Fresh new games added to our collection',
    content: '# New Games\n\nLatest additions to the platform.',
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
  },
  {
    uuid: 'mock-feat-003',
    name: 'Top Rated Mock',
    slug: 'top-rated',
    metadataTitle: 'Top Rated Games - Best of the Best',
    metadataDescription: 'Highest rated games by our community',
    content: '# Top Rated\n\nHighest rated by players.',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
  },
];

// Mock 游戏数据
export const mockGames = [
  {
    uuid: 'mock-game-001',
    name: 'Super Adventure Quest Mock',
    slug: 'super-adventure-quest',
    thumbnail: '/games/adventure-quest.jpg',
    source: 'https://example.com/game1',
    status: 'online' as const,
    nameI18n: {
      en: 'Super Adventure Quest',
      zh: '超级冒险任务',
      ja: 'スーパーアドベンチャークエスト',
    },
    interact: 1500,
    rating: 4.5,
    ratingCount: 230,
    upvoteCount: 180,
    downvoteCount: 20,
    saveCount: 95,
    shareCount: 45,
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
    categories: ['mock-cat-002'], // Adventure
    tags: ['mock-tag-001', 'mock-tag-002'], // Multiplayer, 3D
    featured: ['mock-feat-001', 'mock-feat-003'], // Hot, Top Rated
    introduction: {
      uuid: 'mock-intro-001',
      metadataTitle: 'Super Adventure Quest - Game Guide',
      metadataDescription: 'Complete guide to Super Adventure Quest',
      content:
        '# Super Adventure Quest\n\n## About\nAn epic adventure game with stunning graphics and engaging gameplay.\n\n## Features\n- Multiplayer co-op mode\n- Beautiful 3D graphics\n- Epic storyline',
    },
  },
  {
    uuid: 'mock-game-002',
    name: 'Speed Racer Pro Mock',
    slug: 'speed-racer-pro',
    thumbnail: '/games/speed-racer.jpg',
    source: 'https://example.com/game2',
    status: 'online' as const,
    nameI18n: {
      en: 'Speed Racer Pro',
      zh: '极速赛车专业版',
      ja: 'スピードレーサープロ',
    },
    interact: 2100,
    rating: 4.8,
    ratingCount: 340,
    upvoteCount: 310,
    downvoteCount: 15,
    saveCount: 150,
    shareCount: 80,
    createdAt: new Date('2024-01-11').toISOString(),
    updatedAt: new Date('2024-01-16').toISOString(),
    categories: ['mock-cat-004'], // Racing
    tags: ['mock-tag-001', 'mock-tag-002'], // Multiplayer, 3D
    featured: ['mock-feat-001'], // Hot
    introduction: {
      uuid: 'mock-intro-002',
      metadataTitle: 'Speed Racer Pro - Racing Guide',
      metadataDescription: 'Master the art of racing',
      content:
        '# Speed Racer Pro\n\n## About\nHigh-speed racing action with realistic physics.\n\n## Features\n- Online multiplayer races\n- Realistic 3D graphics\n- Multiple tracks',
    },
  },
  {
    uuid: 'mock-game-003',
    name: 'Puzzle Master Challenge Mock',
    slug: 'puzzle-master-challenge',
    thumbnail: '/games/puzzle-master.jpg',
    source: 'https://example.com/game3',
    status: 'online' as const,
    nameI18n: {
      en: 'Puzzle Master Challenge',
      zh: '益智大师挑战',
      ja: 'パズルマスターチャレンジ',
    },
    interact: 890,
    rating: 4.3,
    ratingCount: 156,
    upvoteCount: 125,
    downvoteCount: 18,
    saveCount: 67,
    shareCount: 23,
    createdAt: new Date('2024-01-12').toISOString(),
    updatedAt: new Date('2024-01-17').toISOString(),
    categories: ['mock-cat-003'], // Puzzle
    tags: ['mock-tag-004'], // Casual
    featured: ['mock-feat-002'], // New
    introduction: {
      uuid: 'mock-intro-003',
      metadataTitle: 'Puzzle Master Challenge - Strategy Guide',
      metadataDescription: 'Tips and tricks for solving puzzles',
      content:
        '# Puzzle Master Challenge\n\n## About\nBrain-teasing puzzles for all skill levels.\n\n## Features\n- Hundreds of levels\n- Relaxing gameplay\n- Daily challenges',
    },
  },
  {
    uuid: 'mock-game-004',
    name: 'Action Hero Combat Mock',
    slug: 'action-hero-combat',
    thumbnail: '/games/action-hero.jpg',
    source: 'https://example.com/game4',
    status: 'online' as const,
    nameI18n: {
      en: 'Action Hero Combat',
      zh: '动作英雄战斗',
      ja: 'アクションヒーローコンバット',
    },
    interact: 3200,
    rating: 4.7,
    ratingCount: 425,
    upvoteCount: 390,
    downvoteCount: 22,
    saveCount: 210,
    shareCount: 125,
    createdAt: new Date('2024-01-13').toISOString(),
    updatedAt: new Date('2024-01-18').toISOString(),
    categories: ['mock-cat-001'], // Action
    tags: ['mock-tag-001', 'mock-tag-002', 'mock-tag-005'], // Multiplayer, 3D, Hardcore
    featured: ['mock-feat-001', 'mock-feat-003'], // Hot, Top Rated
    introduction: {
      uuid: 'mock-intro-004',
      metadataTitle: 'Action Hero Combat - Combat Guide',
      metadataDescription: 'Master combat techniques and combos',
      content:
        '# Action Hero Combat\n\n## About\nIntense action-packed combat with stunning combos.\n\n## Features\n- Online PvP battles\n- Advanced combat system\n- Character customization',
    },
  },
  {
    uuid: 'mock-game-005',
    name: 'Strategy Empire Builder Mock',
    slug: 'strategy-empire-builder',
    thumbnail: '/games/empire-builder.jpg',
    source: 'https://example.com/game5',
    status: 'online' as const,
    nameI18n: {
      en: 'Strategy Empire Builder',
      zh: '策略帝国建造者',
      ja: 'ストラテジー帝国ビルダー',
    },
    interact: 1750,
    rating: 4.6,
    ratingCount: 287,
    upvoteCount: 245,
    downvoteCount: 28,
    saveCount: 132,
    shareCount: 58,
    createdAt: new Date('2024-01-14').toISOString(),
    updatedAt: new Date('2024-01-19').toISOString(),
    categories: ['mock-cat-005'], // Strategy
    tags: ['mock-tag-001', 'mock-tag-005'], // Multiplayer, Hardcore
    featured: ['mock-feat-003'], // Top Rated
    introduction: {
      uuid: 'mock-intro-005',
      metadataTitle: 'Strategy Empire Builder - Strategy Guide',
      metadataDescription: 'Build and expand your empire',
      content:
        '# Strategy Empire Builder\n\n## About\nBuild your empire from scratch and dominate the world.\n\n## Features\n- Deep strategic gameplay\n- Multiplayer alliances\n- Resource management',
    },
  },
];

/**
 * 获取 Mock 数据
 */
export function getMockData(entity: 'categories' | 'tags' | 'featured' | 'games') {
  switch (entity) {
    case 'categories':
      return mockCategories;
    case 'tags':
      return mockTags;
    case 'featured':
      return mockFeatured;
    case 'games':
      return mockGames;
    default:
      return [];
  }
}
