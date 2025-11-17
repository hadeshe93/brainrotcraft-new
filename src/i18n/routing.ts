import { defineRouting } from 'next-intl/routing';
import { LANGUAGES_CODES, DEFAULT_LOCALE } from './language';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: LANGUAGES_CODES,
  // Used when no locale matches
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
  // @ts-ignore
  // pathname: {
  //   '/': '/',
  // },
});
