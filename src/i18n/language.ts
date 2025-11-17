import { type LanguageCode } from '@/types/lang';
export type Lang = LanguageCode | 'tw' | 'vi' | 'ms';

export interface Language {
  // language abbreviation code with region
  code: string;
  // language abbreviation code without region
  lang: Lang;
  // language name in native language
  language: string;
  // language name in Chinese
  zhLanguage: string;
}

export const LANGUAGES: Language[] = [
  {
    code: 'en',
    lang: 'en',
    language: 'English',
    zhLanguage: '英语',
  },
  {
    code: "es",
    lang: "es",
    language: "Español",
    zhLanguage: "西班牙语",
  },
  {
    code: "pt",
    lang: "pt",
    language: "Português",
    zhLanguage: "葡萄牙语",
  },
  {
    code: "ms",
    lang: "ms",
    language: "Bahasa Malaysia",
    zhLanguage: "马来西亚语",
  },
  // {
  //   code: 'zh',
  //   lang: 'zh',
  //   language: '简体中文',
  //   zhLanguage: '简体中文',
  // },
  // {
  //   code: "ja",
  //   lang: "ja",
  //   language: "日本語",
  //   zhLanguage: "日语",
  // },
  // More languages can be enabled later:
  // {
  //   code: "zh-Hant",
  //   lang: "tw",
  //   language: "繁體中文",
  //   zhLanguage: "繁体中文",
  // },
  // {
  //   code: "es-ES",
  //   lang: "es",
  //   language: "Español",
  //   zhLanguage: "西班牙语",
  // },
  // {
  //   code: "pl-PL",
  //   lang: "pl",
  //   language: "Polski",
  //   zhLanguage: "波兰语",
  // },
  // {
  //   code: "ko-KR",
  //   lang: "ko",
  //   language: "한국어",
  //   zhLanguage: "韩语",
  // },
];

export const LANGUAGES_CODES = LANGUAGES.map((lang) => lang.lang);

export const DEFAULT_LOCALE = LANGUAGES_CODES[0];
