import type { I18nMessageContent } from './i18n';

declare global {
  // 扩展 next-intl 的 IntlMessages 接口
  interface IntlMessages extends I18nMessageContent {}
}

// export {};
