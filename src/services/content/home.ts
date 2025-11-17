/**
 * Home Page Data Service
 * Fetches data for the home page (Hot Games, New Games, SEO content, Sidebar data) with i18n support
 */

import { eq, and, isNull, sql } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { featured, categories, tags, games, gamesToCategories, gamesToTags } from '@/db/schema';
import { getHotGames, getNewGames } from './featured-games';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageCode } from '@/types/lang';
import { getTranslatedFeatured, batchGetTranslatedCategories, batchGetTranslatedTags } from './translation-fetcher';

/**
 * Get Home SEO Content
 * Fetches SEO content for the home page from featured table
 */
export async function getHomeSEOContent(db: D1Database) {
  const client = createDrizzleClient(db);

  const results = await client
    .select({
      uuid: featured.uuid,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
      content: featured.content,
    })
    .from(featured)
    .where(and(eq(featured.slug, 'home'), isNull(featured.deletedAt)))
    .limit(1);

  return results[0] || null;
}

/**
 * Get Sidebar Categories with i18n support
 * Fetches categories for sidebar navigation
 * Filters based on SHOW_COLLECTION_STRATEGY environment variable:
 * - ALL: Show all categories
 * - EFFECTIVE: Show only categories with at least one game
 */
export async function getSidebarCategories(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);
  const strategy = process.env.SHOW_COLLECTION_STRATEGY || 'ALL';

  if (strategy === 'EFFECTIVE') {
    console.log('SHOW_COLLECTION_STRATEGY', strategy);
    // Only show categories with at least one online game
    const results = await client
      .select({
        uuid: categories.uuid,
        name: categories.name,
        slug: categories.slug,
        iconUrl: categories.iconUrl,
        metadataTitle: categories.metadataTitle,
        metadataDescription: categories.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToCategories.gameUuid})`,
      })
      .from(categories)
      .innerJoin(gamesToCategories, eq(categories.uuid, gamesToCategories.categoryUuid))
      .innerJoin(
        games,
        and(eq(gamesToCategories.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)),
      )
      .where(isNull(categories.deletedAt))
      .groupBy(categories.uuid)
      .having(sql`COUNT(DISTINCT ${gamesToCategories.gameUuid}) > 0`)
      .orderBy(categories.name)
      .limit(50); // Limit to 50 categories for sidebar

    console.log(
      'Categories with online games:',
      results.map((c) => ({ slug: c.slug, gameCount: c.gameCount })),
    );

    // Batch translate
    const translated = await batchGetTranslatedCategories(
      results.map((c) => ({
        uuid: c.uuid,
        name: c.name,
        slug: c.slug,
        metadataTitle: c.metadataTitle,
        metadataDescription: c.metadataDescription,
        content: null,
      })),
      locale,
      db,
    );

    return translated.map((cat) => ({
      uuid: cat.uuid,
      name: cat.name,
      slug: cat.slug,
      iconUrl: results.find((f) => f.uuid === cat.uuid)?.iconUrl || null,
    }));
  }

  // Show all categories
  const results = await client
    .select({
      uuid: categories.uuid,
      name: categories.name,
      slug: categories.slug,
      iconUrl: categories.iconUrl,
      metadataTitle: categories.metadataTitle,
      metadataDescription: categories.metadataDescription,
    })
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(categories.name)
    .limit(50); // Limit to 50 categories for sidebar

  // Batch translate
  const translated = await batchGetTranslatedCategories(
    results.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      slug: c.slug,
      metadataTitle: c.metadataTitle,
      metadataDescription: c.metadataDescription,
      content: null,
    })),
    locale,
    db,
  );

  return translated.map((cat, index) => ({
    uuid: cat.uuid,
    name: cat.name,
    slug: cat.slug,
    iconUrl: results[index].iconUrl,
  }));
}

/**
 * Get Sidebar Tags with i18n support
 * Fetches tags for sidebar navigation
 * Filters based on SHOW_COLLECTION_STRATEGY environment variable:
 * - ALL: Show all tags
 * - EFFECTIVE: Show only tags with at least one game
 */
export async function getSidebarTags(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);
  const strategy = process.env.SHOW_COLLECTION_STRATEGY || 'ALL';

  if (strategy === 'EFFECTIVE') {
    // Only show tags with at least one online game
    const results = await client
      .select({
        uuid: tags.uuid,
        name: tags.name,
        slug: tags.slug,
        metadataTitle: tags.metadataTitle,
        metadataDescription: tags.metadataDescription,
        gameCount: sql<number>`COUNT(DISTINCT ${gamesToTags.gameUuid})`,
      })
      .from(tags)
      .innerJoin(gamesToTags, eq(tags.uuid, gamesToTags.tagUuid))
      .innerJoin(games, and(eq(gamesToTags.gameUuid, games.uuid), eq(games.status, 'online'), isNull(games.deletedAt)))
      .where(isNull(tags.deletedAt))
      .groupBy(tags.uuid)
      .having(sql`COUNT(DISTINCT ${gamesToTags.gameUuid}) > 0`)
      .orderBy(tags.name)
      .limit(50); // Limit to 50 tags for sidebar

    console.log(
      'Tags with online games:',
      results.map((t) => ({ slug: t.slug, gameCount: t.gameCount })),
    );

    // Batch translate
    const translated = await batchGetTranslatedTags(
      results.map((t) => ({
        uuid: t.uuid,
        name: t.name,
        slug: t.slug,
        metadataTitle: t.metadataTitle,
        metadataDescription: t.metadataDescription,
      })),
      locale,
      db,
    );

    return translated.map((tag) => ({
      uuid: tag.uuid,
      name: tag.name,
      slug: tag.slug,
    }));
  }

  // Show all tags
  const results = await client
    .select({
      uuid: tags.uuid,
      name: tags.name,
      slug: tags.slug,
      metadataTitle: tags.metadataTitle,
      metadataDescription: tags.metadataDescription,
    })
    .from(tags)
    .where(isNull(tags.deletedAt))
    .orderBy(tags.name)
    .limit(50); // Limit to 50 tags for sidebar

  // Batch translate
  const translated = await batchGetTranslatedTags(
    results.map((t) => ({
      uuid: t.uuid,
      name: t.name,
      slug: t.slug,
      metadataTitle: t.metadataTitle,
      metadataDescription: t.metadataDescription,
    })),
    locale,
    db,
  );

  return translated.map((tag) => ({
    uuid: tag.uuid,
    name: tag.name,
    slug: tag.slug,
  }));
}

/**
 * Get Sidebar Featured Items with i18n support
 * Fetches featured navigation items for sidebar (Home, All Games, Hot, New)
 */
export async function getSidebarFeatured(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const client = createDrizzleClient(db);

  // Fixed slugs for Quick Navigation items
  const quickNavSlugs = ['home', 'games', 'hot', 'new'];

  const results = await client
    .select({
      uuid: featured.uuid,
      name: featured.name,
      slug: featured.slug,
      metadataTitle: featured.metadataTitle,
      metadataDescription: featured.metadataDescription,
    })
    .from(featured)
    .where(
      and(
        sql`${featured.slug} IN (${sql.join(
          quickNavSlugs.map((s) => sql`${s}`),
          sql`, `,
        )})`,
        isNull(featured.deletedAt),
      ),
    )
    .orderBy(
      sql`CASE ${featured.slug}
        WHEN 'home' THEN 1
        WHEN 'games' THEN 2
        WHEN 'hot' THEN 3
        WHEN 'new' THEN 4
        ELSE 5
      END`,
    );

  // Translate each featured item
  const translatedResults = await Promise.all(
    results.map(async (item) => {
      const translated = await getTranslatedFeatured(
        item.uuid,
        locale,
        {
          uuid: item.uuid,
          name: item.name,
          slug: item.slug,
          metadataTitle: item.metadataTitle,
          metadataDescription: item.metadataDescription,
          content: null,
        },
        db,
      );
      return {
        uuid: translated.uuid,
        name: translated.name,
        slug: translated.slug,
      };
    }),
  );

  return translatedResults;
}

/**
 * Get Sidebar Data with i18n support
 * Fetches featured items, categories and tags for sidebar navigation
 */
export async function getSidebarData(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const [featuredItems, categories, tags] = await Promise.all([
    getSidebarFeatured(db, locale),
    getSidebarCategories(db, locale),
    getSidebarTags(db, locale),
  ]);

  return {
    featuredItems,
    categories,
    tags,
  };
}

/**
 * Get All Home Page Data with i18n support
 * Fetches all data needed for the home page in one call
 */
export async function getHomePageData(db: D1Database, locale: LanguageCode = DEFAULT_LOCALE) {
  const [hotGames, newGames, seoContent, sidebar] = await Promise.all([
    getHotGames(16, db, locale),
    getNewGames(16, db, locale),
    getHomeSEOContent(db),
    getSidebarData(db, locale),
  ]);

  return {
    hotGames,
    newGames,
    seoContent,
    sidebar,
  };
}
