import { LocalePageProps } from '@/types/page';
import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { Metadata } from 'next';
import Pricing from '@/components/blocks/pricing';
import { BreadcrumbComponent } from '@/components/blocks/breadcrumb';
import { checkShow } from '@/lib/block';
import MarkdownRenderer from '@/components/blocks/markdown-renderer';

const PAGE_KEY = 'pricing';
type PageKey = typeof PAGE_KEY;
async function Privacy(props: LocalePageProps) {
  const { locale } = await props.params;
  const content = await getPageContent<PageKey>({ key: PAGE_KEY, locale });

  return (
    <article className="block-section max-w-5xl">
      {/* 加一个英语横幅提醒：我们正在上线支付功能，请稍后再来 */}
      {/* <div className="bg-yellow-500 text-white p-4 rounded-lg mb-4">
        <p className="text-center">We are launching payment features soon. Please check back later.</p>
      </div> */}
      {checkShow(content!.breadcrumb) && <BreadcrumbComponent config={content!.breadcrumb!} />}
      <Pricing className='pt-2' config={content!.pricing!} />
      <MarkdownRenderer className='max-w-4xl pt-0' config={content!.markdownRenderer!} />
    </article>
  );
}

export default wrapForI18n<LocalePageProps>(Privacy);
export async function generateMetadata(props: LocalePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const privacy = await getPageContent<PageKey>({ key: PAGE_KEY, locale });
  const { metadata } = privacy!;
  return metadata;
}
