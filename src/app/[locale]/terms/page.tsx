import { LocalePageProps } from '@/types/page';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { Metadata } from 'next';
import MarkdownRenderer from '@/components/markdown-renderer';
import { BreadcrumbComponent } from '@/components/blocks/breadcrumb';
import { checkShow } from '@/lib/block';

const PAGE_KEY = 'terms';
type PageKey = typeof PAGE_KEY;
async function Terms(props: LocalePageProps) {
  const { locale } = await props.params;
  const terms = await getPageContent<PageKey>({ key: PAGE_KEY, locale });

  return (
    <article className="block-section max-w-4xl">
      {checkShow(terms!.breadcrumb) && <BreadcrumbComponent config={terms!.breadcrumb!} />}
      <MarkdownRenderer
        className="prose dark:prose-invert !w-full !max-w-full"
        locale={locale}
        content={terms!.content}
      />
    </article>
  );
}

export default wrapForI18n<LocalePageProps>(Terms);
export async function generateMetadata(props: LocalePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const privacy = await getPageContent<PageKey>({ key: PAGE_KEY, locale });
  const { metadata } = privacy!;
  return metadata;
}
