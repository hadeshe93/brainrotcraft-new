import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getGamesByTag } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import GameGrid from '@/components/game/grid';
import PaginationLinks from '@/components/ui/pagination-links';
import MarkdownRenderer from '@/components/markdown-renderer';
import { LanguageCode } from '@/types/lang';

interface TagPageProps extends LocalePageProps {
  params: Promise<{ locale: LanguageCode; slug: string[] }>;
  // searchParams removed - using path parameters for pagination
}

async function TagPage(props: TagPageProps) {
  try {
    const { locale, slug } = await props.params;

    // 1. Validate slug array length
    if (slug.length === 0 || slug.length > 2) {
      notFound();
    }

    // 2. Extract tag slug and page number
    const tagSlug = slug[0];
    const pageStr = slug[1];

    // 3. Validate page number format
    if (pageStr !== undefined) {
      const page = Number(pageStr);
      if (isNaN(page) || page < 1 || !Number.isInteger(page)) {
        notFound();
      }
    }

    // 4. Determine current page
    const currentPage = pageStr ? Number(pageStr) : 1;

  const t = await getTranslations('biz.game');
  const tCommon = await getTranslations('common');

  // Get Cloudflare D1 database
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  // Fetch all data in parallel
  const [tagData, sidebar] = await Promise.all([
    getGamesByTag(tagSlug, currentPage, 20, db, locale as any),
    getSidebarData(db, locale as any),
  ]);

  // Handle 404 if tag not found
  if (!tagData) {
    notFound();
  }

  // 5. Validate page range
  if (currentPage > tagData.pagination.totalPages) {
    notFound();
  }

  const { tag, games, pagination } = tagData;

  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden or collapsible */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {/* Page Title */}
          <div>
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">{tag.name}</h1>
            {tag.metadataDescription && (
              <p className="text-muted-foreground mt-2 text-sm md:text-base">{tag.metadataDescription}</p>
            )}
            {pagination.totalItems > 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                {tCommon('showing_items', {
                  current: games.length,
                  total: pagination.totalItems,
                  type: t('type_games'),
                })}
              </p>
            )}
          </div>

          {/* Games Grid */}
          <GameGrid games={games} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <PaginationLinks currentPage={pagination.currentPage} totalPages={pagination.totalPages} baseUrl={`/tag/${tagSlug}`} />
          )}

          {/* SEO Content Section */}
          {tag.content && (
            <section className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer locale={locale as any} content={tag.content} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
  } catch (error) {
    console.error('TagPage error');
    console.error(error);
    return notFound();
  }
}

// Generate metadata
export async function generateMetadata(props: TagPageProps) {
  try {
    const { locale, slug } = await props.params;

    // Extract tag slug and page number
    const tagSlug = slug[0];
    const page = slug[1] ? Number(slug[1]) : 1;

    const env = await getCloudflareEnv();
    const db = (env as any).DB as D1Database;

    const tagData = await getGamesByTag(tagSlug, page, 1, db, locale as any);

    if (!tagData) {
      return {
        title: '',
      };
    }

    const { tag } = tagData;

    return {
      title: page > 1 ? `${tag.metadataTitle || tag.name} - Page ${page}` : tag.metadataTitle || tag.name,
      description: tag.metadataDescription || '',
      alternates: {
        canonical: page === 1 ? `/tag/${tagSlug}` : `/tag/${tagSlug}/${page}`,
      },
      other: {
        ...(page > 1 && {
          'link:prev': `/tag/${tagSlug}${page === 2 ? '' : `/${page - 1}`}`,
        }),
        ...(page < tagData.pagination.totalPages && {
          'link:next': `/tag/${tagSlug}/${page + 1}`,
        }),
      },
    };
  } catch (error) {
    console.error('generateMetadata error');
    console.error(error);
    return {
      title: '',
    };
  }
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

export default wrapForI18n<TagPageProps>(TagPage);
