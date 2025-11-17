'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Turnstile } from '@marsidev/react-turnstile';

interface ReportDialogProps {
  gameUuid: string;
  gameName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const REPORT_TYPE_KEYS = ['copyright', 'inappropriate', 'broken', 'misleading', 'malware', 'other'] as const;

export default function ReportDialog({ gameUuid, gameName, trigger, open, onOpenChange }: ReportDialogProps) {
  const t = useTranslations('report.dialog');
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [content, setContent] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);

    if (!newOpen) {
      // Reset form when dialog closes
      setTimeout(() => {
        setReportType('');
        setUserName('');
        setUserEmail('');
        setContent('');
        setTurnstileToken('');
        setError('');
        setSuccess(false);
      }, 200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!reportType || !userName || !userEmail || !content) {
      setError(t('error_required'));
      return;
    }

    if (!turnstileToken) {
      setError(t('error_verification'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_uuid: gameUuid,
          report_type: reportType,
          user_name: userName,
          user_email: userEmail,
          content,
          turnstile_token: turnstileToken,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        setSuccess(true);
        // Close dialog after 2 seconds
        setTimeout(() => handleOpenChange(false), 2000);
      } else {
        setError(data?.message || t('error_submit_failed'));
      }
    } catch (err) {
      setError(t('error_generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open !== undefined ? open : isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')} <span className="font-semibold">{gameName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="report-type">{t('type_label')}</Label>
            <Select value={reportType} onValueChange={setReportType} required>
              <SelectTrigger id="report-type">
                <SelectValue placeholder={t('type_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`types.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Name */}
          <div className="space-y-2">
            <Label htmlFor="user-name">{t('name_label')}</Label>
            <Input
              id="user-name"
              type="text"
              placeholder={t('name_placeholder')}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              maxLength={50}
            />
          </div>

          {/* User Email */}
          <div className="space-y-2">
            <Label htmlFor="user-email">{t('email_label')}</Label>
            <Input
              id="user-email"
              type="email"
              placeholder={t('email_placeholder')}
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">{t('email_helper')}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description_label')}</Label>
            <Textarea
              id="description"
              placeholder={t('description_placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={20}
              maxLength={1000}
              rows={4}
            />
            <p className="text-muted-foreground text-xs">{t('character_count', { current: content.length })}</p>
          </div>

          {/* Turnstile Widget */}
          <div>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken('')}
              onExpire={() => setTurnstileToken('')}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-3 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="text-primary border-primary/50 bg-primary/10 rounded-md border p-3 text-sm">
              {t('success')}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t('button_cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !turnstileToken} className="flex-1">
              {isSubmitting ? t('button_submitting') : t('button_submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
