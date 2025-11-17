'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Turnstile } from '@marsidev/react-turnstile';
import { cn } from '@/lib/utils';
import { CF_TURNSTILE_SITEKEY } from '@/constants/config';

interface CommentFormProps {
  gameUuid: string;
  onSuccess?: () => void;
  className?: string;
}

export default function CommentForm({ gameUuid, onSuccess, className }: CommentFormProps) {
  const t = useTranslations('comment.form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name || !email || !content) {
      setError(t('error_required'));
      return;
    }

    if (!turnstileToken) {
      setError(t('error_verification'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_uuid: gameUuid,
          anonymous_name: name,
          anonymous_email: email,
          content,
          turnstile_token: turnstileToken,
        }),
      });

      const data = (await response.json()) as any;

      if (response.ok) {
        setSuccess(true);
        setName('');
        setEmail('');
        setContent('');
        setTurnstileToken('');
        onSuccess?.();
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
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <h3 className="text-foreground text-xl font-semibold">{t('heading')}</h3>

      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('name_label')}</Label>
        <Input
          id="name"
          type="text"
          placeholder={t('name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
        />
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">{t('email_label')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-muted-foreground text-xs">{t('email_helper')}</p>
      </div>

      {/* Content Textarea */}
      <div className="space-y-2">
        <Label htmlFor="content">{t('content_label')}</Label>
        <Textarea
          id="content"
          placeholder={t('content_placeholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={10}
          maxLength={500}
          rows={4}
        />
        <p className="text-muted-foreground text-xs">{t('character_count', { current: content.length })}</p>
      </div>

      {/* Turnstile Widget */}
      <div>
        <Turnstile
          siteKey={CF_TURNSTILE_SITEKEY || ''}
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
        <div className="text-primary border-primary/50 bg-primary/10 rounded-md border p-3 text-sm">{t('success')}</div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || !turnstileToken} className="w-full">
        {isSubmitting ? t('button_submitting') : t('button_submit')}
      </Button>
    </form>
  );
}
