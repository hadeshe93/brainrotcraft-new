import { LocalePageProps } from '@/types/page';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { Metadata } from 'next';
import Chenglog from '@/components/blocks/changelog';
import Introduction from '@/components/blocks/introduction';
import { BreadcrumbComponent } from '@/components/blocks/breadcrumb';
import { checkShow } from '@/lib/block';

const PAGE_CONTENT_KEY = 'changelog';
type PageContentKey = typeof PAGE_CONTENT_KEY;

async function Page(props: LocalePageProps) {
  const { locale } = await props.params;
  const changelog = await getPageContent<PageContentKey>({ key: PAGE_CONTENT_KEY, locale });

  return (
    <div className="block-section max-w-2xl">
      {checkShow(changelog!.breadcrumb) && <BreadcrumbComponent config={changelog!.breadcrumb!} />}
      <Introduction configs={changelog!.introduction} />
      <Chenglog className='min-h-screen' configs={changelog!.changelog} locale={locale} />
    </div>
  );

}

export default wrapForI18n<LocalePageProps>(Page);
export async function generateMetadata(props: LocalePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const content = await getPageContent<PageContentKey>({ key: PAGE_CONTENT_KEY, locale });
  return content!.metadata;
}
