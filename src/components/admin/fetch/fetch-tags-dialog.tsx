'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import MdiLoading from '~icons/mdi/loading';
import MdiDownload from '~icons/mdi/download';
import MdiCheck from '~icons/mdi/check';
import { buildParentApiUrl, getParentApiHeaders } from '@/lib/fetch-config';
import { ContentReviewDialog, type ReviewItem, type ReviewDecision } from '@/components/admin/fetch';

interface Tag {
  uuid: string;
  name: string;
  slug: string;
}

interface FetchTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FetchTagsDialog({ open, onOpenChange }: FetchTagsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());

  // 新增：审核相关状态
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildParentApiUrl('tags'), {
        headers: getParentApiHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags from parent site');
      }

      const result: { success: boolean; data: Tag[]; error?: string } = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tags');
      }

      // 获取本地已存在的标签
      const localResponse = await fetch('/api/admin/tags?pageSize=100');
      const localData: { data: Tag[] } = await localResponse.json();
      const localUuids = new Set(localData.data.map((tag) => tag.uuid));

      // 过滤掉已存在的
      const newTags = result.data.filter((tag: Tag) => !localUuids.has(tag.uuid));

      setTags(newTags);

      if (newTags.length === 0) {
        toast.info('所有标签已存在', {
          description: '没有新的标签需要导入',
        });
      }
    } catch (error: any) {
      console.error('Load tags error:', error);
      toast.error('加载失败', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 预览并审核（批量）
  const handlePreviewAndReview = async () => {
    if (tags.length === 0) return;

    const uuids = tags.map((tag) => tag.uuid);
    setLoading(true);

    try {
      // 1. 调用 preview API
      const response = await fetch('/api/admin/fetch/tags/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuids, enableRewrite: true }),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const { items, summary } = await response.json();

      // 2. 过滤出新记录
      const newItems = items.filter((item: any) => item.status === 'new');

      if (newItems.length === 0) {
        toast.info('没有需要导入的新标签');
        return;
      }

      // 3. 打开审核对话框
      setReviewItems(newItems);
      setShowReviewDialog(true);

      toast.success(`已加载 ${newItems.length} 条新标签，改写完成 ${summary.rewritten} 条`);
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('预览失败', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 预览单个
  const handlePreviewSingle = async (tag: Tag) => {
    setLoading(true);

    try {
      const response = await fetch('/api/admin/fetch/tags/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuids: [tag.uuid],
          enableRewrite: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Preview failed');
      }

      const { items } = await response.json();

      setReviewItems(items);
      setShowReviewDialog(true);
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('预览失败', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 审核完成，确认导入
  const handleReviewComplete = async (decisions: ReviewDecision[]) => {
    setShowReviewDialog(false);
    setLoading(true);

    try {
      // 调用 confirm API
      const response = await fetch('/api/admin/fetch/tags/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: decisions }),
      });

      if (!response.ok) {
        throw new Error('Confirm failed');
      }

      const result = await response.json();

      // 显示结果
      toast.success(`导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条`);

      // 刷新列表
      await loadTags();
    } catch (error: any) {
      console.error('Confirm error:', error);
      toast.error('导入失败', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>拉取标签数据</DialogTitle>
            <DialogDescription>从母站点拉取标签数据，仅显示本地不存在的标签</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="text-muted-foreground text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <MdiLoading className="animate-spin" />
                  正在加载...
                </span>
              ) : (
                <span>显示 {tags.length} 条未导入数据</span>
              )}
            </div>

            <Button onClick={handlePreviewAndReview} disabled={loading || tags.length === 0} size="sm">
              {loading ? (
                <MdiLoading className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MdiDownload className="mr-2 h-4 w-4" />
              )}
              预览并审核
            </Button>
          </div>

          <div className="flex-1 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                      没有需要导入的标签
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.uuid}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                      <TableCell className="text-right">
                        {imported.has(tag.uuid) ? (
                          <Button variant="outline" size="sm" disabled>
                            <MdiCheck className="mr-1 h-4 w-4" />
                            已导入
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePreviewSingle(tag)}
                            disabled={loading}
                          >
                            {loading ? (
                              <MdiLoading className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <MdiDownload className="mr-1 h-4 w-4" />
                            )}
                            预览
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* 审核对话框 */}
      {showReviewDialog && (
        <ContentReviewDialog
          items={reviewItems}
          onComplete={handleReviewComplete}
          onCancel={() => setShowReviewDialog(false)}
          entityType="tag"
          rewriteEndpoint="/api/admin/fetch/tags/confirm"
        />
      )}
    </>
  );
}
