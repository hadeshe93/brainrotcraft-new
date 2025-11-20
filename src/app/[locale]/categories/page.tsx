import { getTranslations } from 'next-intl/server';
import { wrapForI18n } from '@/i18n/utils';
import type { LocalePageProps } from '@/types/page';
import { getCloudflareEnv } from '@/services/base';
import { getAllCategories, getCategoriesSEOContent } from '@/services/content/list';
import { getSidebarData } from '@/services/content/home';
import SidebarContainer from '@/components/blocks/sidebar-container';
import LinkGrid from '@/components/ui/link-grid';
import MarkdownRenderer from '@/components/markdown-renderer';

async function CategoriesPage(props: LocalePageProps) {
  const { locale } = await props.params;
  const t = await getTranslations('biz.category');

  // Get Cloudflare D1 database
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;

  // Fetch all data in parallel
  const [categories, seoContent, sidebar] = await Promise.all([
    getAllCategories(db, locale),
    getCategoriesSEOContent(db, locale),
    getSidebarData(db, locale),
  ]);

  return (
    <div className="block-section">
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - Desktop: fixed left, Mobile: hidden or collapsible */}
        <SidebarContainer featuredItems={sidebar.featuredItems} categories={sidebar.categories} tags={sidebar.tags} />

        {/* Main Content Area */}
        <main className="flex-1 space-y-8">
          {/* Page Title */}
          <div>
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">{t('all_categories')}</h1>
            <p className="text-muted-foreground mt-2 text-sm">{t('browse_all', { count: categories.length })}</p>
          </div>

          {/* Categories Grid */}
          <LinkGrid items={categories} baseUrl="/category" />

          {/* SEO Content Section */}
          {seoContent && seoContent.content && (
            <section className="prose dark:prose-invert max-w-none">
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
  const env = await getCloudflareEnv();
  const db = (env as any).DB as D1Database;
  const seoContent = await getCategoriesSEOContent(db, locale);

  return {
    title: seoContent.metadataTitle || '',
    description: seoContent.metadataDescription || '',
  };
}

// Enable Static Site Generation with Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

// Skip build-time pre-rendering, generate on first request
export async function generateStaticParams() {
  return [];
}

// Removed edge runtime for OpenNext compatibility
export default wrapForI18n<LocalePageProps>(CategoriesPage);
