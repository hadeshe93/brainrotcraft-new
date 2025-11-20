import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { LocalePageProps } from '@/types/page';
import { Metadata } from 'next';
import { PaymentSuccess } from '@/components/blocks/payment-success';

// Force dynamic rendering for payment callback pages
export const dynamic = 'force-dynamic';

interface PaymentSuccessPageProps extends LocalePageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export async function generateMetadata(props: PaymentSuccessPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const content = await getPageContent<'paymentSuccess'>({ key: 'paymentSuccess', locale });
  
  return {
    title: content?.metadata?.title || 'Payment Successful',
    description: content?.metadata?.description || 'Your payment has been processed successfully.',
  };
}

async function PaymentSuccessPage(props: PaymentSuccessPageProps) {
  const { locale } = await props.params;
  const { session_id:sessionId } = await props.searchParams;
  const content = await getPageContent<'paymentSuccess'>({ key: 'paymentSuccess', locale });
  if (!content) {
    return null;
  }
  return <PaymentSuccess config={content.content} sessionId={sessionId} />;
}

export default wrapForI18n<PaymentSuccessPageProps>(PaymentSuccessPage);