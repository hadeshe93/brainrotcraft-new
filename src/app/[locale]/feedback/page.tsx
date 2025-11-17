import { LocalePageProps } from '@/types/page';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { Metadata } from 'next';
import Feedback from '@/components/blocks/feedback';
import Introduction from '@/components/blocks/introduction';
import { BreadcrumbComponent } from '@/components/blocks/breadcrumb';
import { checkShow } from '@/lib/block';

const PAGE_KEY = 'feedback';
type PageKey = typeof PAGE_KEY;
async function Page(props: LocalePageProps) {
  const { locale } = await props.params;
  const feedback = await getPageContent<PageKey>({ key: PAGE_KEY, locale });

  return (
    <div className="block-section max-w-xl">
      {checkShow(feedback!.breadcrumb) && <BreadcrumbComponent config={feedback!.breadcrumb!} />}
      <Introduction configs={feedback!.introduction} />
      <Feedback className='min-h-screen mt-8' config={feedback!.feedback} />
    </div>
  );

}

export default wrapForI18n<LocalePageProps>(Page);
export async function generateMetadata(props: LocalePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const content = await getPageContent<PageKey>({ key: PAGE_KEY, locale });
  return content!.metadata;
}
