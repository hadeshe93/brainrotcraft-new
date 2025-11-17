'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranslationTabs, { type TranslationData } from '@/components/admin/translation-tabs';
import { DEFAULT_LOCALE } from '@/i18n/language';
import type { LanguageItem } from '@/types/services/language';

interface Game {
  uuid: string;
  name: string;
  slug: string;
  thumbnail: string;
  source: string;
  status: 'draft' | 'online' | 'offline';
  nameI18n?: Record<string, string>; // Multi-language game names
  introduction?: {
    metadataTitle?: string;
    metadataDescription?: string;
    content?: string;
    translations?: TranslationData; // Multi-language introduction
  };
}

interface GameFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: Game | null;
  onSuccess?: () => void;
  languages: LanguageItem[];
}

export default function GameForm({ open, onOpenChange, game, onSuccess, languages }: GameFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<'draft' | 'online' | 'offline'>('draft');
  const [nameI18n, setNameI18n] = useState<Record<string, string>>({});
  const [introTranslations, setIntroTranslations] = useState<TranslationData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when game changes
  useEffect(() => {
    if (game) {
      setName(game.name);
      setSlug(game.slug);
      setThumbnail(game.thumbnail);
      setSource(game.source);
      setStatus(game.status);

      // Load nameI18n - always include the default locale (en) from game.name
      setNameI18n({
        [DEFAULT_LOCALE]: game.name, // Always use game.name as the English name
        ...(game.nameI18n || {}), // Then merge other language translations
      });

      // Load introduction translations
      // API returns translations WITHOUT default locale (to reduce response size)
      // Default locale data is in the base fields, so we merge it in
      setIntroTranslations({
        [DEFAULT_LOCALE]: {
          metadataTitle: game.introduction?.metadataTitle || '',
          metadataDescription: game.introduction?.metadataDescription || '',
          content: game.introduction?.content || '',
        },
        ...(game.introduction?.translations || {}),
      });
    } else {
      setName('');
      setSlug('');
      setThumbnail('');
      setSource('');
      setStatus('draft');
      setNameI18n({ [DEFAULT_LOCALE]: '' });
      setIntroTranslations({
        [DEFAULT_LOCALE]: {
          metadataTitle: '',
          metadataDescription: '',
          content: '',
        },
      });
    }
    setError('');
  }, [game, open]);

  // Auto-generate slug from name
  const handleNameChange = (locale: string, value: string) => {
    const updatedNameI18n = { ...nameI18n, [locale]: value };
    setNameI18n(updatedNameI18n);

    // Update default name
    if (locale === DEFAULT_LOCALE) {
      setName(value);

      if (!game) {
        // Only auto-generate slug for new games
        const autoSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        setSlug(autoSlug);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const defaultIntro = introTranslations[DEFAULT_LOCALE] || {};

      const body = {
        name,
        slug,
        thumbnail,
        source,
        status,
        nameI18n,
        introduction: {
          metadataTitle: defaultIntro.metadataTitle || '',
          metadataDescription: defaultIntro.metadataDescription || '',
          content: defaultIntro.content || '',
          translations: introTranslations,
        },
      };

      const url = game ? `/api/admin/games/${game.uuid}` : '/api/admin/games';
      const method = game ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(data?.message || 'Failed to save game');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] !max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{game ? 'Edit Game' : 'Create New Game'}</DialogTitle>
          <DialogDescription>{game ? 'Update game information' : 'Add a new game to the platform'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Multi-language Game Names */}
          <div className="space-y-4">
            <div>
              <h3 className="text-foreground mb-2 text-lg font-semibold">Game Name (Multi-language)</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Provide game names in different languages. English is required.
              </p>
            </div>

            <Tabs defaultValue={DEFAULT_LOCALE} className="w-full">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${languages.length}, 1fr)` }}>
                {languages.map((lang) => (
                  <TabsTrigger key={lang.code} value={lang.code}>
                    {lang.nativeName}
                    {lang.code === DEFAULT_LOCALE && (
                      <span className="text-muted-foreground ml-1 text-xs">(Default)</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {languages.map((lang) => {
                const defaultLang = languages.find((l) => l.isDefault) || languages[0];
                return (
                  <TabsContent key={lang.code} value={lang.code} className="space-y-2 pt-4">
                    <Label htmlFor={`name-${lang.code}`}>
                      Game Name in {lang.nativeName}
                      {lang.code === DEFAULT_LOCALE && <span className="text-destructive ml-1">*</span>}
                      {lang.code !== DEFAULT_LOCALE && (
                        <span className="text-muted-foreground ml-1 text-xs">(Optional)</span>
                      )}
                    </Label>
                    <Input
                      id={`name-${lang.code}`}
                      type="text"
                      placeholder={`Enter game name in ${lang.nativeName}`}
                      value={nameI18n[lang.code] || ''}
                      onChange={(e) => handleNameChange(lang.code, e.target.value)}
                      required={lang.code === DEFAULT_LOCALE}
                      maxLength={200}
                    />
                    {lang.code !== DEFAULT_LOCALE && (
                      <p className="text-muted-foreground text-xs">
                        Leave empty to use default language ({defaultLang.nativeName}) name
                      </p>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              type="text"
              placeholder="game-slug-url"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              maxLength={100}
              pattern="[a-z0-9-]+"
            />
            <p className="text-muted-foreground text-xs">
              URL-friendly identifier (lowercase letters, numbers, and hyphens only)
            </p>
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">
              Thumbnail URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="thumbnail"
              type="url"
              placeholder="https://example.com/thumbnail.jpg"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              required
            />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="source">
              Game Source URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="source"
              type="url"
              placeholder="https://example.com/game/"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">URL of the embeddable game</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="border-border border-t pt-4">
            <h3 className="text-foreground mb-4 text-lg font-semibold">SEO & Game Introduction (Multi-language)</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Edit SEO and introduction content for different languages. English is required.
            </p>
          </div>

          <TranslationTabs
            languages={languages}
            translations={introTranslations}
            onChange={setIntroTranslations}
            titleLabel="SEO Title"
            descriptionLabel="SEO Description"
            contentLabel="Game Introduction (Markdown)"
            contentRequired={true}
            contentRows={10}
            showContent={true}
          />

          {/* Error Message */}
          {error && (
            <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving...' : game ? 'Update Game' : 'Create Game'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
