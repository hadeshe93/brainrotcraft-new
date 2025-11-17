import { getRequestConfig, getTranslations, setRequestLocale, getLocale } from 'next-intl/server';
import type { FunctionComponent } from 'react';
import type { I18nPageContent, I18nPageContentKey } from '@/types/i18n';
import rawResource from '@/i18n/messages/en';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LocaleProps } from '@/types/page';
import { headers } from 'next/headers';
import { LanguageCode } from '@/types/lang';

interface GetPageContentProps {
  key: I18nPageContentKey;
  locale: string;
}

export async function getPageContent<T extends I18nPageContentKey>(props: GetPageContentProps): Promise<I18nPageContent[T]> {
  const { key, locale } = props;
  const content = (await import(`./pages/${locale}/index.ts`)).default;
  return content[key];
}

// Client-side utilities have been moved to utils-client.tsx

// 包装组件
export function wrapForI18n<T extends LocaleProps = any>(Comp: FunctionComponent<T>) {
  return async function WrappedI18n(props: T) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    return <Comp {...props} />;
  };
}


// Re-export client utilities for backward compatibility
export { createCanonicalLink, checkIsDefaultLocale, getPathnameWithoutLocale } from './utils-client';

/**
 * 获取服务端当前的 locale 参数
 * 优先级：getLocale() > x-next-intl-locale 头 > DEFAULT_LOCALE
 * @returns 当前的 locale 字符串
 */
export async function getServerLocale(): Promise<LanguageCode> {
  try {
    // 方法1：优先使用 next-intl 的 getLocale()
    const locale = await getLocale();
    if (locale && locale.trim() !== '') {
      return locale as LanguageCode;
    }
  } catch (error) {
    console.warn('getLocale() failed, falling back to headers:', error);
  }

  try {
    // 方法2：从请求头获取 next-intl 中间件设置的 locale
    const headersList = await headers();
    const localeFromHeader = headersList.get('x-next-intl-locale');
    if (localeFromHeader && localeFromHeader.trim() !== '') {
      return localeFromHeader as LanguageCode;
    }
  } catch (error) {
    console.warn('Failed to get locale from headers:', error);
  }

  // 方法3：默认回退到项目配置的默认语言
  return DEFAULT_LOCALE;
}