'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranslationEditorDialog from '@/components/admin/translation-editor-dialog';
import { DEFAULT_LOCALE } from '@/i18n/language';
import { Languages } from 'lucide-react';
import type {
  TranslationAuditResponse,
  ContentType,
  TranslationStatus,
  ContentTranslationStatus,
} from '@/types/services/translation-audit';
import type { LanguageRecord } from '@/types/services/language';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TranslationDashboard() {
  const [selectedType, setSelectedType] = useState<ContentType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TranslationStatus | 'all'>('all');

  // Fetch languages from API
  const { data: languagesData } = useSWR<{ data: LanguageRecord[] }>('/api/admin/languages', fetcher);
  const languages = languagesData?.data || [];

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedType !== 'all') {
      params.set('contentTypes', selectedType);
    }

    if (selectedStatus !== 'all') {
      params.set('status', selectedStatus);
    }

    params.set('pageSize', '200');

    return `/api/admin/translations/audit?${params.toString()}`;
  }, [selectedType, selectedStatus]);

  const { data, error, isLoading, mutate } = useSWR<{ data: TranslationAuditResponse }>(apiUrl, fetcher);

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4">
        Failed to load translation audit data
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading translation audit...</div>;
  }

  if (!data) {
    return null;
  }

  const auditData = data.data;
  const { stats, items } = auditData;
  const { overall, byType } = stats;

  // Non-default locales
  const nonDefaultLocales = languages.filter((lang) => lang.code !== DEFAULT_LOCALE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Translation Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage translation completeness across all content types
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(() => {
          // Prioritize online games + other content (primary focus)
          const displayStats = overall.online || overall;
          const showSecondary = !!overall.online && overall.totalItems !== overall.online.totalItems;

          return (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Total Items
                    {showSecondary && <span className="text-muted-foreground ml-1 text-xs">(Online focus)</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.totalItems}</div>
                  <p className="text-muted-foreground text-xs">
                    {showSecondary ? 'Online games + all other content' : 'Across all content types'}
                  </p>
                  {showSecondary && (
                    <p className="text-muted-foreground mt-1 text-xs">All content: {overall.totalItems} items</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Fully Translated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{displayStats.completeItems}</div>
                  <Progress value={(displayStats.completeItems / displayStats.totalItems) * 100} className="mt-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {Math.round((displayStats.completeItems / displayStats.totalItems) * 100)}% complete
                  </p>
                  {showSecondary && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      All content: {Math.round((overall.completeItems / overall.totalItems) * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Partially Translated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{displayStats.partialItems}</div>
                  <Progress value={(displayStats.partialItems / displayStats.totalItems) * 100} className="mt-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {Math.round((displayStats.partialItems / displayStats.totalItems) * 100)}% partial
                  </p>
                  {showSecondary && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      All content: {Math.round((overall.partialItems / overall.totalItems) * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Not Translated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{displayStats.missingItems}</div>
                  <Progress value={(displayStats.missingItems / displayStats.totalItems) * 100} className="mt-2" />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {Math.round((displayStats.missingItems / displayStats.totalItems) * 100)}% missing
                  </p>
                  {showSecondary && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      All content: {Math.round((overall.missingItems / overall.totalItems) * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      {/* Statistics by Content Type */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics by Content Type</CardTitle>
          <CardDescription>Translation completeness for each content type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(['category', 'tag', 'featured', 'game'] as ContentType[]).map((type) => {
              const typeStats = byType[type];
              if (typeStats.totalItems === 0) return null;

              // For games: prioritize online games if available
              const isGame = type === 'game';
              const onlineStats = isGame && typeStats.online ? typeStats.online : null;
              const displayStats = onlineStats || typeStats;
              const showSecondary = isGame && onlineStats && typeStats.totalItems !== onlineStats.totalItems;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {isGame && onlineStats ? 'Online Games' : `${type}s`}
                    </span>
                    <span className="text-muted-foreground text-xs">{displayStats.totalItems} items</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span>{displayStats.completeItems}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span>{displayStats.partialItems}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span>{displayStats.missingItems}</span>
                    </div>
                  </div>
                  <Progress value={(displayStats.completeItems / displayStats.totalItems) * 100} className="h-2" />
                  {/* Show all games as secondary info */}
                  {showSecondary && (
                    <p className="text-muted-foreground text-xs">
                      All games: {typeStats.totalItems} items ({typeStats.completeItems} complete)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistics by Locale */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics by Language</CardTitle>
          <CardDescription>Translation completeness for each language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nonDefaultLocales.map((lang) => {
              // Prioritize online games + other content (primary focus)
              const displayStats = overall.online || overall;
              const localeStats = displayStats.byLocale[lang.code];
              if (!localeStats) return null;

              const showSecondary = !!overall.online && overall.totalItems !== overall.online.totalItems;
              const allLocaleStats = overall.byLocale[lang.code];

              return (
                <div key={lang.code} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{lang.nativeName}</span>
                    <span className="text-muted-foreground text-xs">
                      {displayStats.totalItems} items
                      {showSecondary && <span className="ml-1">(Online focus)</span>}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span>{localeStats.complete}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span>{localeStats.partial}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span>{localeStats.missing}</span>
                    </div>
                  </div>
                  <Progress value={(localeStats.complete / displayStats.totalItems) * 100} className="h-2" />
                  {showSecondary && allLocaleStats && (
                    <p className="text-muted-foreground text-xs">
                      All content: {Math.round((allLocaleStats.complete / overall.totalItems) * 100)}% complete
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items</CardTitle>
          <CardDescription>Browse and manage translations for individual items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Content Type</label>
              <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="category">Categories</SelectItem>
                  <SelectItem value="tag">Tags</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="game">Games</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">Translation Status</label>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">No items found</div>
            ) : (
              items.map((item) => (
                <ContentItem key={item.uuid} item={item} onTranslationUpdate={() => mutate()} languages={languages} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContentItem({
  item,
  onTranslationUpdate,
  languages,
}: {
  item: ContentTranslationStatus;
  onTranslationUpdate: () => void;
  languages: LanguageRecord[];
}) {
  const nonDefaultLocales = languages.filter((lang) => lang.code !== DEFAULT_LOCALE);
  const [selectedLocale, setSelectedLocale] = useState<{ locale: string; language: string } | null>(null);

  const getStatusBadge = (status: TranslationStatus) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'missing':
        return <Badge className="bg-red-500">Missing</Badge>;
    }
  };

  const handleSaveTranslation = async (translations: Record<string, string>) => {
    if (!selectedLocale) return;

    // Determine API endpoint based on content type
    let apiUrl = '';
    let updateData: any = {};

    switch (item.type) {
      case 'category':
        apiUrl = `/api/admin/categories/${item.uuid}/translations/${selectedLocale.locale}`;
        updateData = {
          name: translations.name,
          metadataTitle: translations.metadataTitle,
          metadataDescription: translations.metadataDescription,
        };
        break;

      case 'tag':
        apiUrl = `/api/admin/tags/${item.uuid}/translations/${selectedLocale.locale}`;
        updateData = {
          name: translations.name,
          metadataTitle: translations.metadataTitle,
          metadataDescription: translations.metadataDescription,
        };
        break;

      case 'featured':
        apiUrl = `/api/admin/featured/${item.uuid}/translations/${selectedLocale.locale}`;
        updateData = {
          name: translations.name,
          metadataTitle: translations.metadataTitle,
          metadataDescription: translations.metadataDescription,
        };
        break;

      case 'game':
        // Games need special handling - update both name and introduction
        // First update name via game API
        if (translations.name) {
          await fetch(`/api/admin/games/${item.uuid}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nameI18n: {
                [selectedLocale.locale]: translations.name,
              },
            }),
          });
        }

        // Then update introduction translations
        apiUrl = `/api/admin/games/${item.uuid}/introductions/${selectedLocale.locale}`;
        updateData = {
          metadataTitle: translations.metadataTitle,
          metadataDescription: translations.metadataDescription,
        };
        break;

      default:
        throw new Error(`Unsupported content type: ${item.type}`);
    }

    // Save translation
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to save translation');
    }

    // Refresh audit data
    onTranslationUpdate();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Item Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-muted-foreground text-sm">
                  <span className="capitalize">{item.type}</span> • {item.slug}
                </p>
              </div>
            </div>

            {/* Translation Status by Locale */}
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {nonDefaultLocales.map((lang) => {
                const localeStatus = item.translations[lang.code];

                return (
                  <div key={lang.code} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">{lang.nativeName}</div>
                      <Button
                        size="sm"
                        variant={localeStatus.status === 'complete' ? 'outline' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => setSelectedLocale({ locale: lang.code, language: lang.nativeName })}
                      >
                        <Languages className="mr-1 h-3 w-3" />
                        {localeStatus.status === 'complete' ? 'Update' : 'Translate'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(localeStatus.status)}
                      <span className="text-muted-foreground text-xs">
                        {Math.round(localeStatus.completeness * 100)}%
                      </span>
                    </div>
                    {localeStatus.missingFields && localeStatus.missingFields.length > 0 && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Missing: {localeStatus.missingFields.join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Translation Editor Dialog */}
      {selectedLocale && (
        <TranslationEditorDialog
          open={!!selectedLocale}
          onOpenChange={(open) => !open && setSelectedLocale(null)}
          contentType={item.type}
          contentUuid={item.uuid}
          contentName={item.name}
          targetLocale={selectedLocale.locale}
          targetLanguage={selectedLocale.language}
          onSave={handleSaveTranslation}
        />
      )}
    </>
  );
}
