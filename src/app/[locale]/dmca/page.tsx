import { LocalePageProps } from '@/types/page';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { Metadata } from 'next';
import MarkdownRenderer from '@/components/markdown-renderer';
import { BreadcrumbComponent } from '@/components/blocks/breadcrumb';
import { checkShow } from '@/lib/block';

const PAGE_KEY = 'dmca';
type PageKey = typeof PAGE_KEY;
async function Page(props: LocalePageProps) {
  const { locale } = await props.params;
  const content = await getPageContent<PageKey>({ key: PAGE_KEY, locale });

  return (
    <article className="block-section max-w-4xl">
      {checkShow(content!.breadcrumb) && <BreadcrumbComponent config={content!.breadcrumb!} />}
      <MarkdownRenderer
        locale={locale}
        content={content!.content}
        className="prose dark:prose-invert !w-full !max-w-full"
      />
    </article>
  );
}

export default wrapForI18n<LocalePageProps>(Page);
export async function generateMetadata(props: LocalePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const content = await getPageContent<PageKey>({ key: PAGE_KEY, locale });
  const { metadata } = content!;
  return metadata;
}
