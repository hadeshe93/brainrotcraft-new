'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import MdiArrowLeft from '~icons/mdi/arrow-left';
import MdiCancel from '~icons/mdi/cancel';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import MdiLoading from '~icons/mdi/loading';
import MdiClockOutline from '~icons/mdi/clock-outline';
import MdiRefresh from '~icons/mdi/refresh';

interface TranslationTaskProgress {
  games: { done: number; total: number };
  categories: { done: number; total: number };
  tags: { done: number; total: number };
  featured: { done: number; total: number };
}

interface TranslationTask {
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

interface LanguageConfig {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatTimestamp(timestamp?: number | null): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startedAt?: number | null, completedAt?: number | null): string {
  if (!startedAt) return 'N/A';
  const endTime = completedAt || Math.floor(Date.now() / 1000);
  const duration = endTime - startedAt;

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} 小时`);
  if (minutes > 0) parts.push(`${minutes} 分钟`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} 秒`);

  return parts.join(' ');
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

function ModuleProgressCard({
  icon,
  label,
  done,
  total,
}: {
  icon: string;
  label: string;
  done: number;
  total: number;
}) {
  const percentage = total > 0 ? (done / total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="text-lg">{icon}</span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">进度</span>
          <span className="font-medium tabular-nums">
            {done}/{total}
          </span>
        </div>
        <Progress value={percentage} />
        <div className="text-muted-foreground text-right text-xs">{Math.round(percentage)}%</div>
      </CardContent>
    </Card>
  );
}

export default function TranslationTaskDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const router = useRouter();

  // Fetch task details with auto-refresh
  const {
    data: taskResponse,
    error: taskError,
    isLoading: taskLoading,
  } = useSWR<{
    success: boolean;
    data: TranslationTask;
  }>(`/api/admin/translations/tasks/${uuid}`, fetcher, {
    refreshInterval: 3000, // Auto-refresh every 3 seconds if task is running
  });

  // Fetch language info
  const { data: languageResponse } = useSWR<{ success: boolean; data: LanguageConfig }>(
    taskResponse?.data ? `/api/admin/languages/${taskResponse.data.languageCode}` : null,
    fetcher,
  );

  const task = taskResponse?.data;
  const language = languageResponse?.data;

  const handleCancelTask = async () => {
    if (!confirm('确定要取消这个翻译任务吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/translations/tasks/${uuid}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '取消任务失败');
      }

      toast.success('任务已取消');
      mutate(`/api/admin/translations/tasks/${uuid}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消任务失败');
    }
  };

  const handleRefresh = async () => {
    try {
      await mutate(`/api/admin/translations/tasks/${uuid}`);
      toast.success('任务信息已刷新');
    } catch (error) {
      toast.error('刷新失败');
    }
  };

  if (taskError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <MdiArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </div>
        <Alert variant="destructive">
          <MdiAlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>无法加载任务详情，请检查任务 UUID 是否正确</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (taskLoading || !task) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <MdiArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <MdiLoading className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
            <p className="text-muted-foreground mt-4">加载任务详情中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canCancel = task.status === 'pending' || task.status === 'running';

  const totalItems =
    task.progress.games.total +
    task.progress.categories.total +
    task.progress.tags.total +
    task.progress.featured.total;

  const completedItems =
    task.progress.games.done + task.progress.categories.done + task.progress.tags.done + task.progress.featured.done;

  const overallPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <MdiArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">翻译任务详情</h1>
            <p className="text-muted-foreground mt-1">Task ID: {task.uuid}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline">
            <MdiRefresh className="mr-2 h-4 w-4" />
            刷新
          </Button>
          {canCancel && (
            <Button variant="destructive" onClick={handleCancelTask}>
              <MdiCancel className="mr-2 h-4 w-4" />
              取消任务
            </Button>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">目标语言</p>
              <p className="font-medium">{language?.nativeName || task.languageCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">翻译类型</p>
              <p className="font-medium">{task.type === 'full' ? '全部翻译' : '补充翻译'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">任务状态</p>
              <div className="mt-1">{getStatusBadge(task.status)}</div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">整体进度</p>
              <p className="font-medium tabular-nums">
                {completedItems}/{totalItems} ({Math.round(overallPercentage)}%)
              </p>
            </div>
          </div>

          {task.status !== 'pending' && (
            <div>
              <p className="text-muted-foreground mb-2 text-sm">整体进度条</p>
              <Progress value={overallPercentage} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Progress */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">模块翻译进度</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ModuleProgressCard
            icon="🎮"
            label="游戏翻译"
            done={task.progress.games.done}
            total={task.progress.games.total}
          />
          <ModuleProgressCard
            icon="📁"
            label="分类翻译"
            done={task.progress.categories.done}
            total={task.progress.categories.total}
          />
          <ModuleProgressCard
            icon="🏷️"
            label="标签翻译"
            done={task.progress.tags.done}
            total={task.progress.tags.total}
          />
          <ModuleProgressCard
            icon="⭐"
            label="特性翻译"
            done={task.progress.featured.done}
            total={task.progress.featured.total}
          />
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>任务时间线</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm">创建时间</p>
              <p className="font-medium">{formatTimestamp(task.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">开始时间</p>
              <p className="font-medium">{formatTimestamp(task.startedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">完成时间</p>
              <p className="font-medium">{formatTimestamp(task.completedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">总耗时</p>
              <p className="font-medium">{formatDuration(task.startedAt, task.completedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Info */}
      {task.error && (
        <Alert variant="destructive">
          <MdiAlertCircle className="h-4 w-4" />
          <AlertTitle>任务执行错误</AlertTitle>
          <AlertDescription className="mt-2">
            <pre className="text-xs whitespace-pre-wrap">{task.error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Notice */}
      {task.status === 'pending' && (
        <Alert>
          <MdiClockOutline className="h-4 w-4" />
          <AlertTitle>任务等待中</AlertTitle>
          <AlertDescription>此任务正在等待后台处理器执行。实际的翻译工作将在后台自动进行。</AlertDescription>
        </Alert>
      )}

      {task.status === 'running' && (
        <Alert>
          <MdiLoading className="h-4 w-4 animate-spin" />
          <AlertTitle>任务执行中</AlertTitle>
          <AlertDescription>翻译任务正在后台执行，页面会自动刷新显示最新进度。请勿关闭浏览器。</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
