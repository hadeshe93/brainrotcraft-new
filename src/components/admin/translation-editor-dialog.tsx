'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import type { ContentType } from '@/types/services/translation-audit';

interface TranslationEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentUuid: string;
  contentName: string;
  targetLocale: string;
  targetLanguage: string;
  onSave: (translations: Record<string, string>) => Promise<void>;
}

interface GeneratedTranslation {
  translations: Record<string, string>;
  cost: number;
  tokensUsed: number;
}

export default function TranslationEditorDialog({
  open,
  onOpenChange,
  contentType,
  contentUuid,
  contentName,
  targetLocale,
  targetLanguage,
  onSave,
}: TranslationEditorDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTranslation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});

  // Generate translation using AI
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/translations/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType,
          contentUuid,
          targetLocale,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate translation');
      }

      setGenerated({
        translations: data.data.translations,
        cost: data.data.cost,
        tokensUsed: data.data.tokensUsed,
      });
      setEditedTranslations(data.data.translations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save translations
  const handleSave = async () => {
    if (!generated) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editedTranslations);
      onOpenChange(false);
      setGenerated(null);
      setEditedTranslations({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save translation');
    } finally {
      setIsSaving(false);
    }
  };

  // Update translation field
  const updateField = (field: string, value: string) => {
    setEditedTranslations((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setGenerated(null);
      setEditedTranslations({});
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Translate to {targetLanguage}</DialogTitle>
          <DialogDescription>
            <span className="capitalize">{contentType}</span>: <strong>{contentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generated ? (
            // Generate translation
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Click the button below to generate translations using AI. You will be able to review and edit the
                translations before saving.
              </p>

              {error && (
                <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
                  {error}
                </div>
              )}

              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isGenerating ? 'Generating Translation...' : 'Generate Translation with AI'}
              </Button>
            </div>
          ) : (
            // Edit translation
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Translation Generated</span>
                  <div className="text-muted-foreground flex gap-4 text-xs">
                    <span>Tokens: {generated.tokensUsed}</span>
                    <span>Cost: ${generated.cost.toFixed(4)}</span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Review and edit the translations below, then click Save to apply changes.
                </p>
              </div>

              {error && (
                <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
                  {error}
                </div>
              )}

              {Object.entries(editedTranslations).map(([field, value]) => {
                const isLongText = field.includes('Description') || field.includes('content');

                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field} className="text-sm font-medium capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    {isLongText ? (
                      <Textarea
                        id={field}
                        value={value}
                        onChange={(e) => updateField(field, e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    ) : (
                      <Input id={field} value={value} onChange={(e) => updateField(field, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isGenerating || isSaving}>
            Cancel
          </Button>
          {generated && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Translation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
