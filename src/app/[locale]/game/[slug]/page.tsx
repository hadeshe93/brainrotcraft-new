import { notFound } from 'next/navigation';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getGameBySlug, getSimilarGames, getGameComments } from '@/services/content/detail';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameEmbed from '@/components/game/embed';
import SimilarGames from '@/components/game/similar';
import CommentList from '@/components/comment/list';
import CommentForm from '@/components/comment/form';
import MarkdownRenderer from '@/components/markdown-renderer';
import { Link } from '@/i18n/navigation';

interface GamePageProps extends LocalePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function GamePage(props: GamePageProps) {
  const { locale, slug } = await props.params;

  // Get Cloudflare D1 database
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  // Fetch all data in parallel with locale support
  const [gameData, sidebar] = await Promise.all([
    getGameBySlug(slug, db, locale as any),
    getSidebarData(db, locale as any),
  ]);

  // Handle 404 if game not found
  if (!gameData) {
    notFound();
  }

  const { game, introduction, categories, tags } = gameData;

  // Fetch similar games and comments in parallel
  const [similarGames, commentsData] = await Promise.all([
    getSimilarGames(game.uuid, 4, db, locale as any),
    getGameComments(game.uuid, 1, 20, db),
  ]);

  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {/* Game Embed Section with Actions */}
          <GameEmbed
            gameUuid={game.uuid}
            gameName={game.name}
            gameUrl={game.source}
            thumbnail={game.thumbnail}
            initialUpvoteCount={game.upvoteCount}
            initialDownvoteCount={game.downvoteCount}
            initialSaveCount={game.saveCount}
            initialShareCount={game.shareCount}
          />

          {/* Similar Games Section */}
          {similarGames.length > 0 && <SimilarGames games={similarGames} />}

          <div className="flex flex-col gap-4 md:flex-row">
            {/* Game Title and Introduction */}
            <section className="basis-2/3 space-y-4">
              {/* Categories and Tags */}
              {(categories.length > 0 || tags.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Link
                      key={category.uuid}
                      href={`/category/${category.slug}`}
                      className="bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-3 py-1 text-sm font-medium transition-colors"
                    >
                      {category.name}
                    </Link>
                  ))}
                  {tags.map((tag) => (
                    <Link
                      key={tag.uuid}
                      href={`/tag/${tag.slug}`}
                      className="bg-accent/50 text-foreground hover:bg-accent rounded-md px-3 py-1 text-sm transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Game Introduction Content */}
              {introduction && introduction.content && (
                <div className="prose dark:prose-invert max-w-none">
                  <MarkdownRenderer locale={locale as any} content={introduction.content} />
                </div>
              )}
            </section>

            {/* Comments Section */}
            <section className="basis-1/3 space-y-6">
              {/* Comment Form */}
              <CommentForm gameUuid={game.uuid} />

              {/* Comments List */}
              <CommentList comments={commentsData.comments} totalCount={commentsData.pagination.totalItems} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata(props: GamePageProps) {
  const { locale, slug } = await props.params;
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  const gameData = await getGameBySlug(slug, db, locale as any);

  if (!gameData) {
    return {
      title: '',
    };
  }

  const { game, introduction } = gameData;

  return {
    title: introduction?.metadataTitle || game.name,
    description: introduction?.metadataDescription || '',
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

export default wrapForI18n<GamePageProps>(GamePage);
