import { notFound } from 'next/navigation';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getGameBySlug, getSimilarGames, getGameComments } from '@/services/content/detail';
import { getSidebarData } from '@/services/content/home';
import GameDetailContent, { type GameIntroduction } from '@/components/game/detail-content';
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

  // Use the reusable GameDetailContent component
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
      sidebar={sidebar}
    />
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

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

export default wrapForI18n<GamePageProps>(GamePage);
