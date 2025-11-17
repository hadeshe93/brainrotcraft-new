'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import MdiLoading from '~icons/mdi/loading';
import MdiDownload from '~icons/mdi/download';
import MdiCheck from '~icons/mdi/check';
import MdiChevronLeft from '~icons/mdi/chevron-left';
import MdiChevronRight from '~icons/mdi/chevron-right';
import { buildParentApiUrl, getParentApiHeaders } from '@/lib/fetch-config';
import {
  ContentReviewDialog,
  MissingDependenciesDialog,
  type ReviewItem,
  type ReviewDecision,
  type MissingDependency,
} from '@/components/admin/fetch';

interface Game {
  uuid: string;
  name: string;
  slug: string;
  categories: string[];
  tags: string[];
  featured: string[];
}

interface FetchGamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 20; // 每页显示20个游戏

export default function FetchGamesDialog({ open, onOpenChange }: FetchGamesDialogProps) {
  const [loadingUuids, setLoadingUuids] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [missingUuids, setMissingUuids] = useState<string[]>([]); // 需要导入的游戏 UUID 列表
  const [currentPage, setCurrentPage] = useState(0); // 当前页码
  const [games, setGames] = useState<Game[]>([]); // 当前页的游戏数据
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());

  // 新增：审核相关状态
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // 新增：依赖处理相关状态
  const [missingDeps, setMissingDeps] = useState<MissingDependency[]>([]);
  const [showMissingDepsDialog, setShowMissingDepsDialog] = useState(false);
  const [currentGameUuid, setCurrentGameUuid] = useState<string>('');

  // 计算分页信息
  const totalGames = missingUuids.length;
  const totalPages = Math.ceil(totalGames / PAGE_SIZE);
  const currentPageUuids = missingUuids.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => {
    if (open) {
      loadMissingUuids();
    }
  }, [open]);

  // 当页码变化时，加载当前页的游戏数据
  useEffect(() => {
    if (currentPageUuids.length > 0) {
      loadCurrentPageGames();
    }
  }, [currentPage, missingUuids]);

  /**
   * 步骤1&2：并发拉取母站和子站的所有游戏 UUID
   */
  const loadMissingUuids = async () => {
    setLoadingUuids(true);
    try {
      // 并发执行：拉取母站所有游戏 UUID 和 子站所有游戏 UUID
      const [parentResponse, localResponse] = await Promise.all([
        fetch(buildParentApiUrl('games/uuids'), {
          headers: getParentApiHeaders(),
        }),
        fetch('/api/admin/games/uuids'),
      ]);

      if (!parentResponse.ok) {
        throw new Error('Failed to fetch parent game UUIDs');
      }

      if (!localResponse.ok) {
        throw new Error('Failed to fetch local game UUIDs');
      }

      const parentResult: { success: boolean; data: string[]; error?: string } = await parentResponse.json();

      if (!parentResult.success) {
        throw new Error(parentResult.error || 'Failed to fetch parent UUIDs');
      }

      const localData: { data: string[] } = await localResponse.json();

      // 步骤3：找出不在子站的 UUID
      const localUuidSet = new Set(localData.data);
      const missing = parentResult.data.filter((uuid) => !localUuidSet.has(uuid));

      setMissingUuids(missing);
      setCurrentPage(0); // 重置到第一页

      if (missing.length === 0) {
        toast.info('所有游戏已存在', {
          description: '没有新的游戏需要导入',
        });
      }
    } catch (error: any) {
      console.error('Load missing UUIDs error:', error);
      toast.error('加载失败', {
        description: error.message,
      });
    } finally {
      setLoadingUuids(false);
    }
  };

  /**
   * 加载当前页的游戏详细数据
   */
  const loadCurrentPageGames = async () => {
    if (currentPageUuids.length === 0) {
      setGames([]);
      return;
    }

    setLoadingGames(true);
    try {
      const response = await fetch(buildParentApiUrl('games/by-uuids'), {
        method: 'POST',
        headers: getParentApiHeaders(),
        body: JSON.stringify({ uuids: currentPageUuids }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }

      const result: { success: boolean; data: Game[]; error?: string } = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch games');
      }

      setGames(result.data);
    } catch (error: any) {
      console.error('Load current page games error:', error);
      toast.error('加载游戏数据失败', {
        description: error.message,
      });
    } finally {
      setLoadingGames(false);
    }
  };

  // 预览单个游戏
  const handlePreviewSingle = async (game: Game) => {
    setImporting(new Set([game.uuid]));
    setCurrentGameUuid(game.uuid);

    try {
      const response = await fetch('/api/admin/fetch/games/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuid: game.uuid, enableRewrite: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 检查是否是缺失依赖错误
        if (data.error === 'Missing dependencies' && data.missingDependencies) {
          setMissingDeps(data.missingDependencies);
          setShowMissingDepsDialog(true);
          return;
        }
        throw new Error(data.error || 'Preview failed');
      }

      // 无依赖问题，进入审核
      setReviewItems([data.game]);
      setShowReviewDialog(true);
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('预览失败', {
        description: error.message,
      });
    } finally {
      setImporting(new Set());
    }
  };

  // 审核完成，确认导入
  const handleReviewComplete = async (decisions: ReviewDecision[]) => {
    setShowReviewDialog(false);
    setImporting(new Set([currentGameUuid]));

    try {
      // 调用 confirm API（游戏是单个导入）
      const response = await fetch('/api/admin/fetch/games/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decisions[0]),
      });

      if (!response.ok) {
        throw new Error('Confirm failed');
      }

      const result = await response.json();

      // 显示结果
      toast.success(`成功导入游戏：${games.find((g) => g.uuid === currentGameUuid)?.name}`);

      setImported((prev) => new Set([...prev, currentGameUuid]));

      // 从 missingUuids 中移除已导入的
      setMissingUuids((prev) => prev.filter((uuid) => uuid !== currentGameUuid));

      // 从当前页游戏中移除
      setGames((prev) => prev.filter((g) => g.uuid !== currentGameUuid));
    } catch (error: any) {
      console.error('Confirm error:', error);
      toast.error('导入失败', {
        description: error.message,
      });
    } finally {
      setImporting(new Set());
    }
  };

  // 依赖导入完成，重新预览游戏
  const handleMissingDepsComplete = () => {
    setShowMissingDepsDialog(false);

    // 重新预览游戏
    const game = games.find((g) => g.uuid === currentGameUuid);
    if (game) {
      handlePreviewSingle(game);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80vh] max-w-5xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>拉取游戏数据</DialogTitle>
            <DialogDescription>
              从母站点拉取游戏数据，仅显示本地不存在的游戏。系统会自动检查并导入缺失的分类/标签/特性合集。
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="text-muted-foreground text-sm">
              {loadingUuids ? (
                <span className="flex items-center gap-2">
                  <MdiLoading className="animate-spin" />
                  正在加载游戏列表...
                </span>
              ) : (
                <span>
                  共 {totalGames} 条未导入游戏
                  {totalGames > 0 && ` · 第 ${currentPage + 1}/${totalPages} 页`}
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0 || loadingGames}
                >
                  <MdiChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1 || loadingGames}
                >
                  <MdiChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>游戏名称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>特性合集</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUuids || loadingGames ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : games.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      {totalGames === 0 ? '没有需要导入的游戏' : '当前页没有游戏'}
                    </TableCell>
                  </TableRow>
                ) : (
                  games.map((game) => (
                    <TableRow key={game.uuid}>
                      <TableCell className="font-medium">{game.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{game.categories.length}个</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{game.tags.length}个</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{game.featured.length}个</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {imported.has(game.uuid) ? (
                          <Button variant="outline" size="sm" disabled>
                            <MdiCheck className="mr-1 h-4 w-4" />
                            已导入
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePreviewSingle(game)}
                            disabled={importing.has(game.uuid)}
                          >
                            {importing.has(game.uuid) ? (
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

      {/* 缺失依赖对话框 */}
      {showMissingDepsDialog && (
        <MissingDependenciesDialog
          dependencies={missingDeps}
          onComplete={handleMissingDepsComplete}
          onCancel={() => {
            setShowMissingDepsDialog(false);
            setImporting(new Set());
          }}
        />
      )}

      {/* 审核对话框 */}
      {showReviewDialog && (
        <ContentReviewDialog
          items={reviewItems}
          onComplete={handleReviewComplete}
          onCancel={() => {
            setShowReviewDialog(false);
            setImporting(new Set());
          }}
          entityType="game"
          rewriteEndpoint="/api/admin/fetch/games/confirm"
        />
      )}
    </>
  );
}
