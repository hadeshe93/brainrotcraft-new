import { LanguageCode } from '@/types/lang';
import { DEFAULT_LOCALE } from '@/i18n/language';
import { DOMAIN } from '@/constants/config';

export function createCanonicalLink(rawPathName: string, locale: string) {
  const SITE_URL = `https://${DOMAIN}`;
  const isDefaultLocale = checkIsDefaultLocale(locale as LanguageCode);
  const isDefaultPath = ['', '/'].includes(rawPathName);
  const pathName = isDefaultPath && !isDefaultLocale ? '' : rawPathName;
  const link = isDefaultLocale ? `${SITE_URL}${pathName}` : `${SITE_URL}/${locale}${pathName}`;
  return link;
}

export function checkIsDefaultLocale(locale: LanguageCode) {
  return [DEFAULT_LOCALE, '', 'defualt'].includes(locale as any);
}

export function getPathnameWithoutLocale(fullPathname: string, locale: string) {
  return fullPathname.replace(new RegExp(`^/${locale}($|/)`), '/');
}