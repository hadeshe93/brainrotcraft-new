import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { I18nMessageContent } from '@/types/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const result = {
    locale,
    messages: (await import(`./messages/${locale}/index.ts`)).default as I18nMessageContent,
  };
  return result;
});
