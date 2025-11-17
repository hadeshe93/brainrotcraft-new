'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageItem } from '@/types/services/language';

export interface TranslationFields {
  name?: string;
  metadataTitle: string;
  metadataDescription: string;
  content?: string;
}

export interface TranslationData {
  [locale: string]: Partial<TranslationFields>;
}

export interface TranslationTabsProps {
  /**
   * Available languages from database
   */
  languages: LanguageItem[];
  /**
   * Current translation data from API
   * Format: { en: { metadataTitle: '...', ... }, zh: { ... }, ... }
   */
  translations: TranslationData;
  /**
   * Callback when translations are updated
   */
  onChange: (translations: TranslationData) => void;
  /**
   * Label for name field
   */
  nameLabel?: string;
  /**
   * Whether to show name field
   */
  showName?: boolean;
  /**
   * Label for metadata title field
   */
  titleLabel?: string;
  /**
   * Label for metadata description field
   */
  descriptionLabel?: string;
  /**
   * Label for content field
   */
  contentLabel?: string;
  /**
   * Whether content field is required
   */
  contentRequired?: boolean;
  /**
   * Number of rows for content textarea
   */
  contentRows?: number;
  /**
   * Whether to show content field
   */
  showContent?: boolean;
}

export default function TranslationTabs({
  languages,
  translations,
  onChange,
  nameLabel = 'Name',
  showName = false,
  titleLabel = 'SEO Title',
  descriptionLabel = 'SEO Description',
  contentLabel = 'Content (Markdown)',
  contentRequired = false,
  contentRows = 6,
  showContent = true,
}: TranslationTabsProps) {
  const [currentLocale, setCurrentLocale] = useState<string>(DEFAULT_LOCALE);

  const handleFieldChange = (locale: string, field: keyof TranslationFields, value: string) => {
    const updatedTranslations = {
      ...translations,
      [locale]: {
        ...translations[locale],
        [field]: value,
      },
    };
    onChange(updatedTranslations);
  };

  const getCurrentTranslation = (locale: string): Partial<TranslationFields> => {
    return translations[locale] || {};
  };

  return (
    <div className="space-y-4">
      <Tabs value={currentLocale} onValueChange={setCurrentLocale}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${languages.length}, 1fr)` }}>
          {languages.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code} className="relative">
              {lang.nativeName}
              {lang.code === DEFAULT_LOCALE && <span className="text-muted-foreground ml-1 text-xs">(Default)</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {languages.map((lang) => {
          const currentTranslation = getCurrentTranslation(lang.code);
          const isDefault = lang.code === DEFAULT_LOCALE;
          const defaultLang = languages.find((l) => l.isDefault) || languages[0];

          return (
            <TabsContent key={lang.code} value={lang.code} className="space-y-4 pt-4">
              {/* Name */}
              {showName && (
                <div className="space-y-2">
                  <Label htmlFor={`${lang.code}-name`}>
                    {nameLabel} {isDefault && <span className="text-destructive">*</span>}
                    {!isDefault && <span className="text-muted-foreground text-xs">(Optional)</span>}
                  </Label>
                  <Input
                    id={`${lang.code}-name`}
                    type="text"
                    placeholder={`Enter ${nameLabel.toLowerCase()} in ${lang.nativeName}`}
                    value={currentTranslation.name || ''}
                    onChange={(e) => handleFieldChange(lang.code, 'name', e.target.value)}
                    required={isDefault}
                    maxLength={200}
                  />
                  {isDefault ? (
                    <p className="text-muted-foreground text-xs">This is the primary display name. Required field.</p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Leave empty to use default language ({defaultLang.nativeName}) name
                    </p>
                  )}
                </div>
              )}

              {/* Metadata Title */}
              <div className="space-y-2">
                <Label htmlFor={`${lang.code}-metadataTitle`}>
                  {titleLabel} {!isDefault && <span className="text-muted-foreground text-xs">(Optional)</span>}
                  {isDefault && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={`${lang.code}-metadataTitle`}
                  type="text"
                  placeholder={`Enter ${titleLabel.toLowerCase()} in ${lang.nativeName}`}
                  value={currentTranslation.metadataTitle || ''}
                  onChange={(e) => handleFieldChange(lang.code, 'metadataTitle', e.target.value)}
                  required={isDefault}
                  maxLength={200}
                />
                {isDefault ? (
                  <p className="text-muted-foreground text-xs">
                    This is the default language. All fields are required.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Leave empty to use default language ({defaultLang.nativeName}) content
                  </p>
                )}
              </div>

              {/* Metadata Description */}
              <div className="space-y-2">
                <Label htmlFor={`${lang.code}-metadataDescription`}>
                  {descriptionLabel} {!isDefault && <span className="text-muted-foreground text-xs">(Optional)</span>}
                  {isDefault && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id={`${lang.code}-metadataDescription`}
                  placeholder={`Enter ${descriptionLabel.toLowerCase()} in ${lang.nativeName}`}
                  value={currentTranslation.metadataDescription || ''}
                  onChange={(e) => handleFieldChange(lang.code, 'metadataDescription', e.target.value)}
                  required={isDefault}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-muted-foreground text-xs">
                  {isDefault ? 'Description for search engines (max 500 chars)' : 'Translation for search results'}
                </p>
              </div>

              {/* Content (Markdown) */}
              {showContent && (
                <div className="space-y-2">
                  <Label htmlFor={`${lang.code}-content`}>
                    {contentLabel}{' '}
                    {!isDefault && !contentRequired && (
                      <span className="text-muted-foreground text-xs">(Optional)</span>
                    )}
                    {isDefault && contentRequired && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id={`${lang.code}-content`}
                    placeholder={`Enter ${contentLabel.toLowerCase()} in ${lang.nativeName}`}
                    value={currentTranslation.content || ''}
                    onChange={(e) => handleFieldChange(lang.code, 'content', e.target.value)}
                    required={isDefault && contentRequired}
                    rows={contentRows}
                  />
                  <p className="text-muted-foreground text-xs">
                    {isDefault
                      ? `Rich content in Markdown format${contentRequired ? '' : ' (optional)'}`
                      : 'Translated content in Markdown format'}
                  </p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
