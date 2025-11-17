'use client';

import { LocalePageProps } from '@/types/page';
import { Link } from '@/i18n/navigation';
import Icon from '@/components/icon';
import { useAppContext } from '@/contexts/app';
import { PaymentSuccess as PaymentSuccessType } from '@/types/blocks/payment';

export interface PaymentSuccessPageProps extends LocalePageProps {
  searchParams: Promise<{ session_id?: string }>;
}

interface PaymentSuccessProps {
  config: PaymentSuccessType;
  sessionId?: string;
}

export function PaymentSuccess(props: PaymentSuccessProps) {
  const { sessionId, config: content } = props;
  const { user } = useAppContext();
  if (!content) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Icon config={{ name: 'MdiCheckCircle' }} className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            {content.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {content.description}
          </p>
        </div>

        {/* Order Details */}
        {false && sessionId && (
          <div className="bg-card rounded-lg border border-border p-6 space-y-2">
            <p className="text-sm text-muted-foreground">{content.transactionId}</p>
            <p className="text-xs font-mono text-foreground break-all">
              {sessionId}
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-accent/10 rounded-lg p-6 space-y-3">
          <h3 className="font-semibold text-foreground">{content.nextSteps.title}</h3>
          <ul className="text-left space-y-2 text-sm text-muted-foreground">
            {content.nextSteps.items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/user/${user?.uuid || ''}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {content.actions.dashboard}
            <Icon config={{ name: 'MdiArrowRight' }} className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Icon config={{ name: 'MdiHome' }} className="h-4 w-4" />
            {content.actions.home}
          </Link>
        </div>
      </div>
    </div>
  );
}