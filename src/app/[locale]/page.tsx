import { getTranslations } from 'next-intl/server';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getHomePageData, getSidebarData } from '@/services/content/home';
import { getGameBySlug, getSimilarGames, getGameComments } from '@/services/content/detail';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameSection from '@/components/game/section';
import GameDetailContent from '@/components/game/detail-content';
import MarkdownRenderer from '@/components/markdown-renderer';
import { GameItem } from '@/types/game';

async function Home(props: LocalePageProps) {
  const { locale } = await props.params;
  const t = await getTranslations('biz.game');

  // Get Cloudflare D1 database with error handling for local development
  let homepageGameData, hotGames: GameItem[], newGames: GameItem[], seoContent, sidebar;

  try {
    const env = await getCloudflareEnv();
    const db = (env as any)?.DB as D1Database;

    if (!db) {
      throw new Error('Database not available in local development');
    }

    // Check if there's a homepage game (empty slug game)
    homepageGameData = await getGameBySlug('', db, locale as any);

    // If homepage game exists, render game detail page
    if (homepageGameData) {
      const { game, introduction, categories, tags } = homepageGameData;

      // Fetch sidebar, similar games, and comments in parallel
      const [sidebarData, similarGames, commentsData] = await Promise.all([
        getSidebarData(db, locale as any),
        getSimilarGames(game.uuid, 4, db, locale as any),
        getGameComments(game.uuid, 1, 20, db),
      ]);

      // Reuse GameDetailContent component
      return (
        <GameDetailContent
          locale={locale}
          game={game}
          introduction={introduction}
          categories={categories}
          tags={tags}
          similarGames={similarGames}
          comments={commentsData.comments}
          totalComments={commentsData.pagination.totalItems}
          sidebar={sidebarData}
        />
      );
    }

    // No homepage game, render normal game list homepage
    const data = await getHomePageData(db);
    hotGames = data.hotGames;
    newGames = data.newGames;
    seoContent = data.seoContent;
    sidebar = data.sidebar;
  } catch (error) {
    console.warn('Database not available, using fallback data:', error);
    // Fallback data for local development
    hotGames = [];
    newGames = [];
    seoContent = {
      metadataTitle: '',
      content: '',
    };
    sidebar = { featuredItems: [], categories: [], tags: [] };
  }

  // Render normal game list homepage
  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden or collapsible */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-12">
          {/* Hot Games Section */}
          {hotGames && hotGames.length > 0 && (
            <GameSection
              title={t('hot_games')}
              games={hotGames}
              moreLink={{
                url: '/hot',
                text: t('more_hot_games'),
              }}
            />
          )}

          {/* New Games Section */}
          {newGames && newGames.length > 0 && (
            <GameSection
              title={t('new_games')}
              games={newGames}
              moreLink={{
                url: '/new',
                text: t('more_new_games'),
              }}
            />
          )}

          {/* SEO Content Section */}
          {seoContent && seoContent.content && (
            <section className="prose dark:prose-invert bg-muted max-w-none rounded-md border p-6">
              <MarkdownRenderer locale={locale} content={seoContent.content} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata(props: LocalePageProps) {
  const { locale } = await props.params;

  try {
    const env = await getCloudflareEnv();
    const db = (env as any)?.DB as D1Database;

    if (!db) {
      return {
        title: 'Homepage',
        description: '',
      };
    }

    // Check if there's a homepage game
    const homepageGameData = await getGameBySlug('', db, locale as any);

    if (homepageGameData) {
      // Use homepage game metadata
      const { game, introduction } = homepageGameData;
      return {
        title: introduction?.metadataTitle || game.name,
        description: introduction?.metadataDescription || '',
      };
    }

    // Use default homepage metadata
    const content = await getPageContent<'layout'>({ key: 'layout', locale });
    const { metadata } = content!;
    return metadata;
  } catch (error) {
    return {
      title: 'Homepage',
      description: '',
    };
  }
}

// 云原生做法：EDGE 模式 + ISR
// 如果用 SSG + ISR 的话，要兼容本地渲染，以 API 的方式全部达到正式环境去请求数据
// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour (same as game detail page)

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

export default wrapForI18n<LocalePageProps>(Home);
