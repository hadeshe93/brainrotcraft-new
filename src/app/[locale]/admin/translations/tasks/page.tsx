'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranslationTaskCard, type TranslationTask } from '@/components/admin/translation-tasks/translation-task-card';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import MdiRefresh from '~icons/mdi/refresh';
import MdiLoading from '~icons/mdi/loading';

interface LanguageConfig {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
}

interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url).then((res) => res.json());

export default function TranslationTasksPage() {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch tasks with stats
  const {
    data: tasksResponse,
    error: tasksError,
    isLoading: tasksLoading,
  } = useSWR<{
    success: boolean;
    data: { tasks: TranslationTask[]; stats: TaskStats };
  }>('/api/admin/translations/tasks?includeStats=true', fetcher, {
    refreshInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch languages for display names
  const { data: languagesResponse } = useSWR<{ success: boolean; data: LanguageConfig[] }>(
    '/api/admin/languages',
    fetcher,
  );

  const tasks = tasksResponse?.data?.tasks || [];
  const stats = tasksResponse?.data?.stats || {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  const languages = languagesResponse?.data || [];

  // Create language code to name map
  const languageMap = new Map(languages.map((lang) => [lang.code, lang.nativeName]));

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const handleRefresh = async () => {
    try {
      await mutate('/api/admin/translations/tasks?includeStats=true');
      toast.success('任务列表已刷新');
    } catch (error) {
      toast.error('刷新失败');
    }
  };

  const handleCancelTask = async (taskUuid: string) => {
    if (!confirm('确定要取消这个翻译任务吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/translations/tasks/${taskUuid}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || '取消任务失败');
      }

      toast.success('任务已取消');
      mutate('/api/admin/translations/tasks?includeStats=true');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消任务失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">翻译任务列表</h1>
          <p className="text-muted-foreground mt-2">查看和管理所有翻译任务的执行状态</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={tasksLoading}>
          {tasksLoading ? (
            <MdiLoading className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MdiRefresh className="mr-2 h-4 w-4" />
          )}
          刷新
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">总任务数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">等待中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">运行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.running}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">已取消</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">
            全部{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            等待中{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="running">
            运行中{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.running}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            已完成{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="failed">
            失败{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.failed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            已取消{' '}
            <Badge variant="secondary" className="ml-2">
              {stats.cancelled}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {tasksError ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center">加载任务列表失败</CardContent>
            </Card>
          ) : tasksLoading && tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MdiLoading className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
                <p className="text-muted-foreground mt-2">加载中...</p>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center">
                {activeTab === 'all' ? '暂无翻译任务' : `暂无${activeTab}状态的任务`}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <TranslationTaskCard
                  key={task.uuid}
                  task={task}
                  languageName={languageMap.get(task.languageCode)}
                  onCancel={handleCancelTask}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
