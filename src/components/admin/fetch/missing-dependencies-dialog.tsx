'use client';

/**
 * 缺失依赖处理对话框
 * 当游戏导入时发现缺失依赖，展示表格并引导用户先导入依赖
 */

import { useState } from 'react';
import { CheckIcon, Loader2Icon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface MissingDependency {
  type: 'category' | 'tag' | 'featured';
  uuid: string;
  name: string;
  status: 'missing' | 'importing' | 'imported';
}

interface MissingDependenciesDialogProps {
  dependencies: MissingDependency[];
  onComplete: () => void;
  onCancel: () => void;
}

export default function MissingDependenciesDialog({
  dependencies,
  onComplete,
  onCancel,
}: MissingDependenciesDialogProps) {
  const [items, setItems] = useState<MissingDependency[]>(dependencies);
  const [importing, setImporting] = useState<string | null>(null);

  const handleImport = async (dep: MissingDependency) => {
    setImporting(dep.uuid);

    try {
      // 更新状态为导入中
      setItems((prev) =>
        prev.map((item) => (item.uuid === dep.uuid ? { ...item, status: 'importing' as const } : item)),
      );

      // 根据类型确定 API 端点
      const entityPath = dep.type === 'featured' ? 'featured' : dep.type === 'tag' ? 'tags' : 'categories';
      const previewEndpoint = `/api/admin/fetch/${entityPath}/preview`;

      // 1. 调用 preview API 获取改写数据
      const previewResponse = await fetch(previewEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuids: [dep.uuid],
          enableRewrite: true,
        }),
      });

      if (!previewResponse.ok) {
        throw new Error(`Preview failed: ${previewResponse.statusText}`);
      }

      const previewData = await previewResponse.json();

      if (!previewData.success || !previewData.items || previewData.items.length === 0) {
        throw new Error('Preview returned no data');
      }

      const item = previewData.items[0];

      // 2. 自动选择使用改写后的内容（如果有），否则使用原始内容
      const selectedContent = item.rewritten || item.original;

      // 3. 调用 confirm API 完成导入
      const confirmEndpoint = `/api/admin/fetch/${entityPath}/confirm`;
      const confirmResponse = await fetch(confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              uuid: dep.uuid,
              action: item.rewritten ? 'use_rewritten' : 'use_original',
              selectedContent,
            },
          ],
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error(`Import failed: ${confirmResponse.statusText}`);
      }

      const confirmData = await confirmResponse.json();

      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Import failed');
      }

      // 更新状态为已导入
      setItems((prev) =>
        prev.map((item) => (item.uuid === dep.uuid ? { ...item, status: 'imported' as const } : item)),
      );
    } catch (error) {
      console.error('Failed to import dependency:', error);
      // 恢复为缺失状态
      setItems((prev) => prev.map((item) => (item.uuid === dep.uuid ? { ...item, status: 'missing' as const } : item)));
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setImporting(null);
    }
  };

  const allImported = items.every((item) => item.status === 'imported');
  const importedCount = items.filter((item) => item.status === 'imported').length;

  const getTypeLabel = (type: MissingDependency['type']) => {
    return type === 'category' ? '分类' : type === 'tag' ? '标签' : '特性合集';
  };

  const getTypeVariant = (type: MissingDependency['type']) => {
    return type === 'category' ? 'default' : type === 'tag' ? 'secondary' : 'outline';
  };

  const getStatusBadge = (status: MissingDependency['status']) => {
    if (status === 'imported') {
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
          已导入
        </Badge>
      );
    }
    if (status === 'importing') {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          导入中...
        </Badge>
      );
    }
    return <Badge variant="destructive">缺失</Badge>;
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>发现缺失的依赖项</DialogTitle>
          <DialogDescription>请先导入以下依赖项，然后才能导入游戏</DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((dep) => (
                <TableRow key={dep.uuid}>
                  <TableCell>
                    <Badge variant={getTypeVariant(dep.type)}>{getTypeLabel(dep.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{dep.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{dep.uuid}</TableCell>
                  <TableCell>{getStatusBadge(dep.status)}</TableCell>
                  <TableCell>
                    {dep.status === 'missing' && (
                      <Button size="sm" onClick={() => handleImport(dep)} disabled={importing !== null}>
                        {importing === dep.uuid && <Loader2Icon className="animate-spin" />}
                        导入
                      </Button>
                    )}
                    {dep.status === 'imported' && <CheckIcon className="h-4 w-4 text-green-500" />}
                    {dep.status === 'importing' && <Loader2Icon className="h-4 w-4 animate-spin text-yellow-500" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onComplete} disabled={!allImported}>
            {allImported ? '继续导入游戏' : `请先导入所有依赖 (${importedCount}/${items.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
