// https://github.com/DeepL-ai/deepl-node/blob/main/src/types/LanguageCode.ts

/**
 * Language codes that may be used as a source or target language.
 * Note: although the language code type definitions are case-sensitive, this package and the DeepL
 * API accept case-insensitive language codes.
 */
type CommonLanguageCode = 'ar' | 'bg' | 'cs' | 'da' | 'de' | 'el' | 'es' | 'et' | 'fi' | 'fr' | 'hu' | 'id' | 'it' | 'ja' | 'ko' | 'lt' | 'lv' | 'nb' | 'nl' | 'pl' | 'ro' | 'ru' | 'sk' | 'sl' | 'sv' | 'tr' | 'uk' | 'zh';
/**
 * Language codes that may be used as a source language.
 * Note: although the language code type definitions are case-sensitive, this package and the DeepL
 * API accept case-insensitive language codes.
 */
export type SourceLanguageCode = CommonLanguageCode | 'en' | 'pt';
/**
 * Language codes that may be used as a target language.
 * Note: although the language code type definitions are case-sensitive, this package and the DeepL
 * API accept case-insensitive language codes.
 */
export type TargetLanguageCode = CommonLanguageCode | 'en-GB' | 'en-US' | 'pt-BR' | 'pt-PT';
/**
 * All language codes, including source-only and target-only language codes.
 * Note: although the language code type definitions are case-sensitive, this package and the DeepL
 * API accept case-insensitive language codes.
 */
// export type LanguageCode = SourceLanguageCode | TargetLanguageCode;
export type LanguageCode = SourceLanguageCode | TargetLanguageCode | 'tw' | 'vi' | 'ms';
