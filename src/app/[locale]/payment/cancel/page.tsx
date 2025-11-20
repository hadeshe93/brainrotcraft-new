import { wrapForI18n, getPageContent } from '@/i18n/utils';
import { LocalePageProps } from '@/types/page';
import { Link } from '@/i18n/navigation';
import Icon from '@/components/icon';
import { Metadata } from 'next';

// Force dynamic rendering for payment callback pages
export const dynamic = 'force-dynamic';

interface PaymentCancelPageProps extends LocalePageProps {
  searchParams: Promise<{ errorCode?: string }>;
}

export async function generateMetadata(props: PaymentCancelPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const content = await getPageContent<'paymentCancel'>({ key: 'paymentCancel', locale });
  
  return {
    title: content?.metadata?.title || 'Payment Cancelled',
    description: content?.metadata?.description || 'Your payment was cancelled.',
  };
}

async function PaymentCancel(props: PaymentCancelPageProps) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;
  const errorCode = searchParams?.errorCode;
  const content = await getPageContent<'paymentCancel'>({ key: 'paymentCancel', locale });
  
  if (!content) {
    return null;
  }

  // Error messages mapping
  const getErrorMessage = (code?: string) => {
    if (!code) return content.content.defaultMessage;
    
    const errorMessages = content.content.errorMessages as Record<string, string>;
    return errorMessages[code] || content.content.defaultMessage;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Cancel Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <Icon config={{ name: 'MdiCloseCircle' }} className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Cancel Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            {content.content.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {getErrorMessage(errorCode)}
          </p>
        </div>

        {/* Help Section */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h3 className="font-semibold text-foreground">{content.content.help.title}</h3>
          <div className="text-left space-y-3 text-sm text-muted-foreground">
            {content.content.help.items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Icon config={{ name: 'MdiRefresh' }} className="h-4 w-4" />
            {content.content.actions.tryAgain}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Icon config={{ name: 'MdiHome' }} className="h-4 w-4" />
            {content.content.actions.home}
          </Link>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-muted-foreground mt-8">
          {content.content.disclaimer}
        </p>
      </div>
    </div>
  );
}

export default wrapForI18n<PaymentCancelPageProps>(PaymentCancel);