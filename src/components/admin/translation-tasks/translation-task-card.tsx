'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import MdiChevronRight from '~icons/mdi/chevron-right';
import MdiCancel from '~icons/mdi/cancel';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiLoading from '~icons/mdi/loading';
import MdiClockOutline from '~icons/mdi/clock-outline';

export interface TranslationTaskProgress {
  games: { done: number; total: number };
  categories: { done: number; total: number };
  tags: { done: number; total: number };
  featured: { done: number; total: number };
}

export interface TranslationTask {
  id: number;
  uuid: string;
  languageCode: string;
  type: 'full' | 'supplement';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: TranslationTaskProgress;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

interface TranslationTaskCardProps {
  task: TranslationTask;
  languageName?: string;
  onCancel?: (taskUuid: string) => void;
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return 'N/A';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function formatDuration(startedAt?: number | null, completedAt?: number | null): string {
  if (!startedAt) return 'N/A';
  const endTime = completedAt || Math.floor(Date.now() / 1000);
  const duration = endTime - startedAt;

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

function getStatusBadge(status: TranslationTask['status']) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <MdiClockOutline className="h-3 w-3" />
          等待中
        </Badge>
      );
    case 'running':
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-blue-500">
          <MdiLoading className="h-3 w-3 animate-spin" />
          运行中
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <MdiCheckCircle className="h-3 w-3" />
          已完成
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <MdiAlertCircle className="h-3 w-3" />
          失败
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <MdiCancel className="h-3 w-3" />
          已取消
        </Badge>
      );
  }
}

function getTypeLabel(type: 'full' | 'supplement'): string {
  return type === 'full' ? '全部翻译' : '补充翻译';
}

export function TranslationTaskCard({ task, languageName, onCancel }: TranslationTaskCardProps) {
  const router = useRouter();

  // Calculate overall progress
  const totalItems =
    task.progress.games.total +
    task.progress.categories.total +
    task.progress.tags.total +
    task.progress.featured.total;

  const completedItems =
    task.progress.games.done + task.progress.categories.done + task.progress.tags.done + task.progress.featured.done;

  const overallPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const canCancel = task.status === 'pending' || task.status === 'running';

  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{languageName || task.languageCode}</h3>
              {getStatusBadge(task.status)}
            </div>
            <p className="text-muted-foreground text-sm">{getTypeLabel(task.type)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        {task.status !== 'pending' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">翻译进度</span>
              <span className="text-muted-foreground tabular-nums">
                {completedItems}/{totalItems} ({Math.round(overallPercentage)}%)
              </span>
            </div>
            <Progress value={overallPercentage} />

            {/* Module breakdown */}
            <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
              <div>
                🎮 游戏: {task.progress.games.done}/{task.progress.games.total}
              </div>
              <div>
                📁 分类: {task.progress.categories.done}/{task.progress.categories.total}
              </div>
              <div>
                🏷️ 标签: {task.progress.tags.done}/{task.progress.tags.total}
              </div>
              <div>
                ⭐ 特性: {task.progress.featured.done}/{task.progress.featured.total}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {task.error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            <p className="mb-1 font-medium">错误信息:</p>
            <p className="text-xs">{task.error}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-muted-foreground space-y-1 text-xs">
          <div className="flex justify-between">
            <span>创建时间:</span>
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
          {task.startedAt && (
            <div className="flex justify-between">
              <span>开始时间:</span>
              <span>{formatRelativeTime(task.startedAt)}</span>
            </div>
          )}
          {task.completedAt && (
            <div className="flex justify-between">
              <span>完成时间:</span>
              <span>{formatRelativeTime(task.completedAt)}</span>
            </div>
          )}
          {task.startedAt && (
            <div className="flex justify-between">
              <span>耗时:</span>
              <span>{formatDuration(task.startedAt, task.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/admin/translations/tasks/${task.uuid}`)}
          >
            查看详情
            <MdiChevronRight className="ml-2 h-4 w-4" />
          </Button>
          {canCancel && onCancel && (
            <Button variant="destructive" onClick={() => onCancel(task.uuid)}>
              <MdiCancel className="mr-2 h-4 w-4" />
              取消
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
