'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import MdiPlus from '~icons/mdi/plus';
import MdiChartBar from '~icons/mdi/chart-bar';
import MdiClockOutline from '~icons/mdi/clock-outline';
import MdiLoading from '~icons/mdi/loading';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { LanguageCard } from '@/components/admin/language-management/language-card';
import { LanguageFormDialog } from '@/components/admin/language-management/language-form-dialog';
import { AutoTranslateDialog } from '@/components/admin/language-management/auto-translate-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface LanguageConfig {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface LanguageStats {
  overall?: {
    completeness: number;
  };
  byModule?: {
    games?: { total: number; done: number };
    categories?: { total: number; done: number };
    tags?: { total: number; done: number };
    featured?: { total: number; done: number };
  };
  lastUpdated?: number;
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url).then((res) => res.json());

/**
 * Wrapper component that fetches stats for a single language
 * This avoids calling hooks in a loop
 */
function LanguageCardWithStats({
  language,
  onEdit,
  onDelete,
  onRefresh,
  onAutoTranslate,
  isDeleting,
}: {
  language: LanguageConfig;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onAutoTranslate: () => void;
  isDeleting: boolean;
}) {
  // Fetch audit stats for this specific language
  const { data: statsResponse, isLoading } = useSWR<{ success: boolean; data: LanguageStats }>(
    `/api/admin/languages/${language.code}/audit`,
    fetcher,
  );

  return (
    <LanguageCard
      language={language}
      stats={statsResponse?.data}
      isLoadingStats={isLoading}
      onEdit={onEdit}
      onDelete={onDelete}
      onRefresh={onRefresh}
      onAutoTranslate={onAutoTranslate}
      isDeleting={isDeleting}
    />
  );
}

export default function LanguageManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<LanguageConfig | null>(null);
  const [autoTranslateLanguage, setAutoTranslateLanguage] = useState<LanguageConfig | null>(null);
  const [isAutoTranslateOpen, setIsAutoTranslateOpen] = useState(false);
  const [deletingLanguageCode, setDeletingLanguageCode] = useState<string | null>(null);

  // Fetch languages
  const {
    data: languagesResponse,
    error: languagesError,
    isLoading: languagesLoading,
  } = useSWR<{ success: boolean; data: LanguageConfig[] }>('/api/admin/languages', fetcher);

  const languages = languagesResponse?.data || [];

  const handleAddLanguage = () => {
    setEditingLanguage(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (language: LanguageConfig) => {
    setEditingLanguage(language);
    setIsDialogOpen(true);
  };

  const handleDelete = async (language: LanguageConfig) => {
    if (!confirm(`确定要删除语言「${language.nativeName}」吗？`)) {
      return;
    }

    try {
      setDeletingLanguageCode(language.code);

      const response = await fetch(`/api/admin/languages/${language.code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || '删除失败');
      }

      toast.success('语言删除成功');
      mutate('/api/admin/languages');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除语言失败');
    } finally {
      setDeletingLanguageCode(null);
    }
  };

  const handleRefresh = async (language: LanguageConfig) => {
    try {
      // Refresh the audit data for this language
      await mutate(`/api/admin/languages/${language.code}/audit`);
      toast.success('审计数据已刷新');
    } catch (error) {
      toast.error('刷新失败');
    }
  };

  const handleAutoTranslate = (language: LanguageConfig) => {
    setAutoTranslateLanguage(language);
    setIsAutoTranslateOpen(true);
  };

  const handleSaveLanguage = async (formData: {
    code: string;
    nativeName: string;
    chineseName: string;
    englishName: string;
  }) => {
    try {
      if (editingLanguage) {
        // Update existing language
        const response = await fetch(`/api/admin/languages/${editingLanguage.code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nativeName: formData.nativeName,
            chineseName: formData.chineseName,
            englishName: formData.englishName,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { message?: string };
          throw new Error(errorData.message || '更新失败');
        }
      } else {
        // Create new language
        const response = await fetch('/api/admin/languages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { message?: string };
          throw new Error(errorData.message || '创建失败');
        }
      }

      mutate('/api/admin/languages');
    } catch (error) {
      throw error;
    }
  };

  const handleStartTranslation = async (type: 'full' | 'supplement') => {
    if (!autoTranslateLanguage) return;

    try {
      const response = await fetch('/api/admin/translations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageCode: autoTranslateLanguage.code,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { message?: string };
        throw new Error(errorData.message || '启动翻译任务失败');
      }

      // Refresh audit data after starting translation
      mutate(`/api/admin/languages/${autoTranslateLanguage.code}/audit`);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">多语言管理</h1>
          <p className="text-muted-foreground mt-2">已启用语言 ({languages.length})</p>
        </div>
        <Button onClick={handleAddLanguage}>
          <MdiPlus className="mr-2 h-4 w-4" />
          新增语言
        </Button>
      </div>

      {/* Language Cards */}
      {languagesError ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">加载语言配置失败</CardContent>
        </Card>
      ) : languagesLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Loading skeletons */}
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-2 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : languages.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">暂无语言配置</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {languages.map((lang) => (
            <LanguageCardWithStats
              key={lang.code}
              language={lang}
              onEdit={() => handleEdit(lang)}
              onDelete={() => handleDelete(lang)}
              onRefresh={() => handleRefresh(lang)}
              onAutoTranslate={() => handleAutoTranslate(lang)}
              isDeleting={deletingLanguageCode === lang.code}
            />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Link href="/admin/translations/audit">
              <Button variant="outline">
                <MdiChartBar className="mr-2 h-4 w-4" />
                翻译审计工具
              </Button>
            </Link>
            <Link href="/admin/translations/tasks">
              <Button variant="outline">
                <MdiClockOutline className="mr-2 h-4 w-4" />
                翻译任务列表
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Language Dialog */}
      <LanguageFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        language={editingLanguage}
        onSave={handleSaveLanguage}
      />

      {/* Auto Translate Dialog */}
      {autoTranslateLanguage && (
        <AutoTranslateDialog
          open={isAutoTranslateOpen}
          onOpenChange={setIsAutoTranslateOpen}
          language={autoTranslateLanguage}
          onStart={handleStartTranslation}
        />
      )}
    </div>
  );
}
