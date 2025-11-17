'use client';

import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { Comment } from '@/types/game';

interface CommentListProps {
  comments: Comment[];
  totalCount: number;
  className?: string;
}

export default function CommentList({ comments, totalCount, className }: CommentListProps) {
  const t = useTranslations('comment.list');

  if (!comments || comments.length === 0) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <p className="text-muted-foreground">{t('empty_state')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Comments Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-foreground text-xl font-semibold">
          {t('heading')} ({totalCount})
        </h3>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.uuid} className="bg-card border-border rounded-lg border p-4 shadow-sm">
            {/* Comment Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Author Avatar (optional) */}
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                  {comment.authorName.charAt(0).toUpperCase()}
                </div>
                <span className="text-foreground text-sm font-medium">{comment.authorName}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(comment.createdAt * 1000), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {/* Comment Content */}
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
