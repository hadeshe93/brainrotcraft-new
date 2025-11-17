'use client';

/**
 * 内容改写系统测试页面
 * 演示如何使用 preview/confirm API 和审核对话框
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MissingDependenciesDialog,
  ContentReviewDialog,
  type MissingDependency,
  type ReviewItem,
  type ReviewDecision,
} from '@/components/admin/fetch';

type EntityType = 'categories' | 'tags' | 'featured' | 'games';

export default function FetchRewriteTestPage() {
  const [entityType, setEntityType] = useState<EntityType>('categories');
  const [gameUuid, setGameUuid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Dialog states
  const [showMissingDeps, setShowMissingDeps] = useState(false);
  const [missingDeps, setMissingDeps] = useState<MissingDependency[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const handleFetchAndPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = `/api/admin/fetch/${entityType}/preview`;
      const body = entityType === 'games' ? { uuid: gameUuid, enableRewrite: true } : { enableRewrite: true };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // 检查是否是缺失依赖错误
        if (data.error === 'Missing dependencies' && data.missingDependencies) {
          setMissingDeps(data.missingDependencies);
          setShowMissingDeps(true);
          return;
        }
        throw new Error(data.error || 'Preview failed');
      }

      // 显示审核对话框
      if (entityType === 'games') {
        setReviewItems([data.game]);
      } else {
        setReviewItems(data.items.filter((item: any) => item.status === 'new'));
      }
      setShowReview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewComplete = async (decisions: ReviewDecision[]) => {
    setShowReview(false);
    setLoading(true);

    try {
      const endpoint = `/api/admin/fetch/${entityType}/confirm`;
      const body =
        entityType === 'games'
          ? decisions[0] // 游戏是单个导入
          : { items: decisions }; // 其他实体是批量导入

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const handleMissingDepsComplete = () => {
    setShowMissingDeps(false);
    // 重新尝试导入游戏
    handleFetchAndPreview();
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold">内容改写系统测试</h1>
        <p className="text-muted-foreground">测试 LLM 内容改写与审核流程</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>选择实体类型</CardTitle>
          <CardDescription>选择要测试的实体类型并执行预览</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={entityType === 'categories' ? 'default' : 'outline'}
              onClick={() => setEntityType('categories')}
            >
              分类
            </Button>
            <Button variant={entityType === 'tags' ? 'default' : 'outline'} onClick={() => setEntityType('tags')}>
              标签
            </Button>
            <Button
              variant={entityType === 'featured' ? 'default' : 'outline'}
              onClick={() => setEntityType('featured')}
            >
              特性合集
            </Button>
            <Button variant={entityType === 'games' ? 'default' : 'outline'} onClick={() => setEntityType('games')}>
              游戏
            </Button>
          </div>

          {entityType === 'games' && (
            <div className="space-y-2">
              <Label htmlFor="gameUuid">游戏 UUID</Label>
              <Input
                id="gameUuid"
                placeholder="输入游戏 UUID"
                value={gameUuid}
                onChange={(e) => setGameUuid(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={handleFetchAndPreview}
            disabled={loading || (entityType === 'games' && !gameUuid)}
            className="w-full"
          >
            {loading ? '加载中...' : '预览并改写'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">错误</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">导入成功</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {/* 缺失依赖对话框 */}
      {showMissingDeps && (
        <MissingDependenciesDialog
          dependencies={missingDeps}
          onComplete={handleMissingDepsComplete}
          onCancel={() => setShowMissingDeps(false)}
        />
      )}

      {/* 内容审核对话框 */}
      {showReview && (
        <ContentReviewDialog
          items={reviewItems}
          onComplete={handleReviewComplete}
          onCancel={() => setShowReview(false)}
          entityType={entityType === 'games' ? 'game' : (entityType.slice(0, -1) as any)}
          rewriteEndpoint={`/api/admin/fetch/${entityType}/confirm`}
        />
      )}
    </div>
  );
}
