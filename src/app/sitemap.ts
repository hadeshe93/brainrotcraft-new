import { MetadataRoute } from 'next';
import { getCloudflareEnv } from '@/services/base';
import { createDrizzleClient } from '@/db/client';
import { games, categories, tags, gamesToCategories, gamesToTags } from '@/db/schema';
import { isNull, eq, and, sql } from 'drizzle-orm';
import { DEFAULT_LOCALE, LANGUAGES_CODES } from '@/i18n/language';
import { getGamePath } from '@/lib/game-links';
import { ORIGIN } from '@/constants/config';

const SITE_URL = ORIGIN;
const LOCALES = LANGUAGES_CODES;

// Force dynamic rendering - always use production database, never pre-render at build time
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const env = await getCloudflareEnv();
    const db = (env as any)?.DB as D1Database;

    if (!db) {
      // Fallback for local development
      return generateStaticSitemap();
    }

    const client = createDrizzleClient(db);

    // Fetch only online games (status = 'online' and not deleted)
    const allGames = await client
      .select({ slug: games.slug, updatedAt: games.updatedAt })
      .from(games)
      .where(and(eq(games.status, 'online'), isNull(games.deletedAt)));

    // Fetch categories with at least one online game
    const allCategories = await client
      .select({
        slug: categories.slug,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToCategories.gameUuid})`,
      })
      .from(categories)
      .leftJoin(gamesToCategories, eq(categories.uuid, gamesToCategories.categoryUuid))
      .leftJoin(
        games,
        and(eq(gamesToCategories.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)),
      )
      .where(isNull(categories.deletedAt))
      .groupBy(categories.uuid);

    // Filter categories with at least 1 game
    const categoriesWithGames = allCategories.filter((cat) => Number(cat.gameCount) > 0);

    // Fetch tags with at least one online game
    const allTags = await client
      .select({
        slug: tags.slug,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToTags.gameUuid})`,
      })
      .from(tags)
      .leftJoin(gamesToTags, eq(tags.uuid, gamesToTags.tagUuid))
      .leftJoin(games, and(eq(gamesToTags.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
      .where(isNull(tags.deletedAt))
      .groupBy(tags.uuid);

    // Filter tags with at least 1 game
    const tagsWithGames = allTags.filter((tag) => Number(tag.gameCount) > 0);

    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Add static pages
    const staticPages = [
      { url: '', changeFrequency: 'daily' as const, priority: 1.0 },
      { url: '/games', changeFrequency: 'daily' as const, priority: 0.9 },
      { url: '/categories', changeFrequency: 'weekly' as const, priority: 0.8 },
      { url: '/tags', changeFrequency: 'weekly' as const, priority: 0.8 },
      { url: '/about', changeFrequency: 'monthly' as const, priority: 0.5 },
      { url: '/privacy', changeFrequency: 'monthly' as const, priority: 0.3 },
      { url: '/terms', changeFrequency: 'monthly' as const, priority: 0.3 },
      { url: '/dmca', changeFrequency: 'monthly' as const, priority: 0.3 },
    ];

    for (const page of staticPages) {
      for (const locale of LOCALES) {
        const localeUrl = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        sitemapEntries.push({
          url: `${SITE_URL}${localeUrl}${page.url}`,
          lastModified: new Date(),
          changeFrequency: page.changeFrequency,
          priority: page.priority,
        });
      }
    }

    // Add game detail pages
    for (const game of allGames) {
      for (const locale of LOCALES) {
        const localeUrl = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        const gamePath = getGamePath(game.slug);
        if (gamePath === '/') {
          continue;
        }
        sitemapEntries.push({
          url: `${SITE_URL}${localeUrl}${gamePath}`,
          lastModified: game.updatedAt ? new Date(game.updatedAt * 1000) : new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.9,
        });
      }
    }

    // Add category pages (only categories with at least 1 online game)
    for (const category of categoriesWithGames) {
      for (const locale of LOCALES) {
        const localeUrl = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        sitemapEntries.push({
          url: `${SITE_URL}${localeUrl}/category/${category.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        });
      }
    }

    // Add tag pages (only tags with at least 1 online game)
    for (const tag of tagsWithGames) {
      for (const locale of LOCALES) {
        const localeUrl = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
        sitemapEntries.push({
          url: `${SITE_URL}${localeUrl}/tag/${tag.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.7,
        });
      }
    }

    return sitemapEntries;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return generateStaticSitemap();
  }
}

function generateStaticSitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: '', changeFrequency: 'daily' as const, priority: 1.0 },
    { url: '/games', changeFrequency: 'daily' as const, priority: 0.9 },
    { url: '/categories', changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: '/tags', changeFrequency: 'weekly' as const, priority: 0.8 },
  ];

  return staticPages.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  );
}
