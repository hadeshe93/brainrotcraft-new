'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import useSWR from 'swr';
import { toast } from 'sonner';

interface LanguageConfig {
  code: string;
  nativeName: string;
  chineseName: string;
}

interface TranslationEstimate {
  type: 'full' | 'supplement';
  totalItems: number;
  breakdown: {
    games: number;
    categories: number;
    tags: number;
    featured: number;
  };
  estimatedMinutes: number;
}

interface AutoTranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: LanguageConfig;
  onStart: (type: 'full' | 'supplement') => Promise<void>;
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url).then((res) => res.json());

export function AutoTranslateDialog({ open, onOpenChange, language, onStart }: AutoTranslateDialogProps) {
  const [type, setType] = useState<'full' | 'supplement'>('supplement');

  const { data, isLoading } = useSWR<{ success: boolean; data: TranslationEstimate }>(
    language && open ? `/api/admin/languages/${language.code}/translate/estimate?type=${type}` : null,
    fetcher,
  );

  const estimate = data?.data;

  const handleStart = async () => {
    try {
      await onStart(type);
      toast.success('翻译任务已启动');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '启动翻译任务失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>自动化翻译: {language?.nativeName}</DialogTitle>
          <DialogDescription>选择翻译模式并启动 AI 自动翻译任务</DialogDescription>
        </DialogHeader>

        <RadioGroup value={type} onValueChange={(v: 'full' | 'supplement') => setType(v)}>
          {/* Supplement Translation */}
          <div className="hover:border-primary rounded-lg border p-4 transition-colors">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="supplement" id="supplement" />
              <div className="flex-1">
                <Label htmlFor="supplement" className="cursor-pointer text-base font-medium">
                  补充翻译 (推荐)
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">仅针对空白字段进行补充翻译，保留已有的翻译内容</p>

                {!isLoading && estimate && type === 'supplement' && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">预计翻译:</span>
                      <Badge variant="secondary">{estimate.totalItems} 条</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">预计耗时:</span>
                      <span className="font-medium">~{estimate.estimatedMinutes} 分钟</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-muted-foreground">详细统计:</p>
                      <ul className="text-muted-foreground list-inside list-disc space-y-0.5">
                        <li>在线游戏: {estimate.breakdown.games} 条</li>
                        <li>分类: {estimate.breakdown.categories} 条</li>
                        <li>标签: {estimate.breakdown.tags} 条</li>
                        <li>特性: {estimate.breakdown.featured} 条</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full Translation */}
          <div className="hover:border-primary rounded-lg border p-4 transition-colors">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="full" id="full" />
              <div className="flex-1">
                <Label htmlFor="full" className="cursor-pointer text-base font-medium">
                  全部翻译
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  重新翻译所有内容（包括已有翻译），适用于语言切换或重大内容更新
                </p>

                {!isLoading && estimate && type === 'full' && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">预计翻译:</span>
                      <Badge variant="secondary">{estimate.totalItems} 条</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">预计耗时:</span>
                      <span className="font-medium">~{estimate.estimatedMinutes} 分钟</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </RadioGroup>

        {/* Notice */}
        <Alert>
          <MdiAlertCircle className="h-4 w-4" />
          <AlertTitle>注意事项</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>• 翻译任务将在后台执行，您可以关闭此页面</p>
            <p>• 任务执行期间可以继续其他操作</p>
            <p>• 可以在「翻译任务列表」查看详细进度</p>
            <p>• 任务完成后会收到通知提醒</p>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleStart} disabled={isLoading}>
            {isLoading ? '加载中...' : '开始翻译'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
