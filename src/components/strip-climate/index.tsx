import { useTranslations } from 'next-intl';
import Image from '@/components/image';

interface StripeClimateProps {
  percentage: number;
  url: string;
}

export default function StripeClimate({ percentage, url }: StripeClimateProps) {
  const t = useTranslations('stripe.climate');
  const badgeDescription = t('badge_description', { percentage });
  return (
    <a
      href={url}
      target="_blank"
      className="bg-foreground text-background flex items-center gap-2 rounded px-2 py-1 text-xs"
    >
      <span className="text-sm">{badgeDescription}</span>
      <Image width="16" src="/icons/stripe-climate.svg" alt="Stripe Climate" className="size-4" />
    </a>
  );
}
