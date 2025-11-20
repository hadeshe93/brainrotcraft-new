/**
 * Game Detail Content Component
 * Reusable component for game detail page structure
 * Used in both game detail page (/game/[slug]) and homepage (/) for homepage game
 */

import { Link } from '@/i18n/navigation';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameEmbed from '@/components/game/embed';
import SimilarGames from '@/components/game/similar';
import CommentList from '@/components/comment/list';
import CommentForm from '@/components/comment/form';
import MarkdownRenderer from '@/components/markdown-renderer';
import Image from '@/components/image';
import type { SimilarGame, Comment } from '@/types/game';

// Game basic information type
export interface GameInfo {
  uuid: string;
  name: string;
  slug: string;
  source: string;
  thumbnail: string;
  upvoteCount: number;
  downvoteCount: number;
  saveCount: number;
  shareCount: number;
}

// Game introduction type
export interface GameIntroduction {
  content: string | null;
  metadataTitle: string | null;
  metadataDescription: string | null;
}

// Category/Tag type
export interface Category {
  uuid: string;
  name: string;
  slug: string;
}

export interface Tag {
  uuid: string;
  name: string;
  slug: string;
}

// Sidebar data type
export interface SidebarData {
  featuredItems: any[];
  categories: any[];
  tags: any[];
}

// Component Props
export interface GameDetailContentProps {
  locale: string;
  game: GameInfo;
  introduction: GameIntroduction | null;
  categories: Category[];
  tags: Tag[];
  similarGames: SimilarGame[];
  comments: Comment[];
  totalComments: number;
  sidebar: SidebarData;
}

export default function GameDetailContent({
  locale,
  game,
  introduction,
  categories,
  tags,
  similarGames,
  comments,
  totalComments,
  sidebar,
}: GameDetailContentProps) {
  // 检查介绍文案中
  const hasH1InContent =
    // 1. 匹配 Markdown: 开头可能是空白，然后是 #，然后必须有一个空格，后面跟任意非换行字符
    /^\s*#\s/.test(introduction?.content || '') ||
    // 2. 匹配 HTML: 开头可能是空白，然后是 <h1，后面跟着空格 或者 直接是 >
    /^\s*<h1(\s|>)/i.test(introduction?.content || '');

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
            gameSlug={game.slug}
            gameUrl={game.source}
            thumbnail={game.thumbnail}
            initialUpvoteCount={game.upvoteCount}
            initialDownvoteCount={game.downvoteCount}
            initialSaveCount={game.saveCount}
            initialShareCount={game.shareCount}
          />

          {/* Categories and Tags */}
          <div className="flex flex-wrap gap-2">
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
          </div>

          {/* Similar Games Section */}
          {similarGames.length > 0 && <SimilarGames games={similarGames} />}

          {/* Title */}
          {!hasH1InContent && <h1 className="text-foreground text-3xl font-bold md:text-4xl">{game.name}</h1>}

          <div className="flex flex-col gap-4 md:flex-row">
            {/* Game Title and Introduction */}
            <section className="basis-2/3 space-y-4">
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
              <CommentList comments={comments} totalCount={totalComments} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
