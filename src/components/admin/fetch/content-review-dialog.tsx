'use client';

/**
 * 内容审核对话框
 * 展示原始内容 vs 改写内容的对比，并支持管理员审核决策
 */

import { useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ContentPanel from './content-panel';
import type { SEOContent } from '@/services/content/rewrite-prompts';

export type ItemAction = 'use_original' | 'use_rewritten' | 'skip' | 'rewrite';

export interface ReviewItem {
  uuid: string;
  name: string;
  slug: string;
  status: 'new' | 'existing';
  original: SEOContent;
  rewritten: SEOContent | null;
}

export interface ReviewDecision {
  uuid: string;
  action: ItemAction;
  selectedContent?: SEOContent;
}

interface ContentReviewDialogProps {
  items: ReviewItem[];
  onComplete: (decisions: ReviewDecision[]) => void;
  onCancel: () => void;
  entityType: 'category' | 'tag' | 'featured' | 'game';
  rewriteEndpoint?: string; // 可选：重新改写的 API 端点
}

export default function ContentReviewDialog({
  items,
  onComplete,
  onCancel,
  entityType,
  rewriteEndpoint,
}: ContentReviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<string, ReviewDecision>>(new Map());
  const [isRewriting, setIsRewriting] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(items);

  const currentItem = reviewItems[currentIndex];

  const handleDecision = async (action: ItemAction) => {
    if (action === 'rewrite') {
      // 重新改写
      setIsRewriting(true);
      try {
        if (!rewriteEndpoint) {
          throw new Error('Rewrite endpoint not provided');
        }

        const response = await fetch(rewriteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                uuid: currentItem.uuid,
                action: 'rewrite',
                rewriteOptions: {
                  temperature: 0.7, // 提高温度以获得更多变化
                },
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Rewrite failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.rewrittenItems || data.rewrittenItems.length === 0) {
          throw new Error('Rewrite returned no data');
        }

        const rewrittenItem = data.rewrittenItems[0];

        // 更新当前项的改写内容
        setReviewItems((prev) =>
          prev.map((item, idx) => (idx === currentIndex ? { ...item, rewritten: rewrittenItem.rewritten } : item)),
        );
      } catch (error) {
        console.error('Failed to rewrite:', error);
        alert(`重新改写失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setIsRewriting(false);
      }
      return;
    }

    // 记录决策
    const decision: ReviewDecision = {
      uuid: currentItem.uuid,
      action,
      selectedContent:
        action === 'use_rewritten' ? currentItem.rewritten || currentItem.original : currentItem.original,
    };

    const newDecisions = new Map(decisions);
    newDecisions.set(currentItem.uuid, decision);
    setDecisions(newDecisions);

    // 移动到下一项或完成
    if (currentIndex < reviewItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 所有项都已审核，调用完成回调
      onComplete(Array.from(newDecisions.values()));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getEntityLabel = (type: string) => {
    const labels = {
      category: '分类',
      tag: '标签',
      featured: '特性合集',
      game: '游戏',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Dialog open={true}>
      <DialogContent className="!max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            内容改写审核 ({currentIndex + 1}/{reviewItems.length}) - {getEntityLabel(entityType)}: {currentItem.name}
          </DialogTitle>
          <div className="text-muted-foreground text-sm">{currentItem.status === 'new' ? '新记录' : '已存在记录'}</div>
        </DialogHeader>

        <div className="grid max-h-[calc(90vh-200px)] grid-cols-2 gap-4 overflow-auto">
          {/* 原始内容 */}
          <ContentPanel title="原始内容" content={currentItem.original} highlight={false} />

          {/* 改写后内容 */}
          <ContentPanel title="改写后内容" content={currentItem.rewritten} highlight={!!currentItem.rewritten} />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentIndex === 0}>
              上一项
            </Button>
            <span className="text-muted-foreground flex items-center text-sm">
              {currentIndex + 1} / {reviewItems.length}
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>

            <Button variant="outline" onClick={() => handleDecision('skip')}>
              跳过此项
            </Button>

            <Button variant="outline" onClick={() => handleDecision('use_original')}>
              使用原始内容
            </Button>

            {rewriteEndpoint && (
              <Button variant="secondary" onClick={() => handleDecision('rewrite')} disabled={isRewriting}>
                {isRewriting && <Loader2Icon className="animate-spin" />}
                重新改写
              </Button>
            )}

            <Button onClick={() => handleDecision('use_rewritten')} disabled={!currentItem.rewritten}>
              使用改写内容
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
