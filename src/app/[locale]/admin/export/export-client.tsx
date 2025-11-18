'use client';

/**
 * Export Client Component
 * Handles export operations with download functionality
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import JSZip from 'jszip';
import MdiDownload from '~icons/mdi/download';
import MdiLoading from '~icons/mdi/loading';
import MdiCheckCircle from '~icons/mdi/check-circle';
import MdiAlertCircle from '~icons/mdi/alert-circle';
import { toKebabCase } from '@/lib/string';

type ExportType = 'categories' | 'tags' | 'featured' | 'games';

interface ExportStatus {
  type: ExportType;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  size?: number;
  count?: number;
}

const exportItems: Array<{
  type: ExportType;
  title: string;
  description: string;
  filename: string;
  endpoint: string;
}> = [
  {
    type: 'categories',
    title: 'Categories',
    description: 'Export all game categories',
    filename: 'game-categories.json',
    endpoint: '/api/admin/export/categories',
  },
  {
    type: 'tags',
    title: 'Tags',
    description: 'Export all game tags',
    filename: 'game-tags.json',
    endpoint: '/api/admin/export/tags',
  },
  {
    type: 'featured',
    title: 'Featured Collections',
    description: 'Export all featured collections',
    filename: 'game-featured.json',
    endpoint: '/api/admin/export/featured',
  },
  {
    type: 'games',
    title: 'Games',
    description: 'Export all games with markdown content files',
    filename: 'games-export.zip',
    endpoint: '/api/admin/export/games',
  },
];

export default function ExportClient() {
  const [exportStatuses, setExportStatuses] = useState<Record<ExportType, ExportStatus>>({
    categories: { type: 'categories', status: 'idle' },
    tags: { type: 'tags', status: 'idle' },
    featured: { type: 'featured', status: 'idle' },
    games: { type: 'games', status: 'idle' },
  });

  const [isExportingAll, setIsExportingAll] = useState(false);

  /**
   * Download JSON data as file
   */
  const downloadJson = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Download blob as file
   */
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Generate ZIP file with games.json and markdown content files
   */
  const generateGamesZip = async (gamesData: any[]): Promise<Blob> => {
    const zip = new JSZip();

    // Create games.json without content field
    const gamesJson = gamesData.map((game) => {
      const { content, ...gameWithoutContent } = game;
      return gameWithoutContent;
    });

    // Add games.json to zip
    zip.file('games.json', JSON.stringify(gamesJson, null, 2));

    // Create content folder and add markdown files
    const contentFolder = zip.folder('content');
    if (contentFolder) {
      gamesData.forEach((game) => {
        if (game.content && game.title) {
          // Use game title in kebab-case for file name (consistent with backend)
          const fileName = toKebabCase(game.title);
          contentFolder.file(`${fileName}.md`, game.content);
        }
      });
    }

    // Generate zip blob
    return await zip.generateAsync({ type: 'blob' });
  };

  /**
   * Calculate JSON size in KB
   */
  const calculateSize = (data: any): number => {
    const json = JSON.stringify(data, null, 2);
    return Math.round((new TextEncoder().encode(json).length / 1024) * 100) / 100;
  };

  /**
   * Get item count from export data
   */
  const getItemCount = (data: any, type: ExportType): number => {
    if (type === 'games') {
      return Array.isArray(data) ? data.length : 0;
    }
    return data.metadata?.totalCount || 0;
  };

  /**
   * Export single data type
   */
  const exportData = async (type: ExportType) => {
    const item = exportItems.find((i) => i.type === type);
    if (!item) return;

    // Update status to loading
    setExportStatuses((prev) => ({
      ...prev,
      [type]: { type, status: 'loading' },
    }));

    try {
      const response = await fetch(item.endpoint, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Special handling for games: generate ZIP with content files
      if (type === 'games' && Array.isArray(data)) {
        const zipBlob = await generateGamesZip(data);
        downloadBlob(zipBlob, 'games-export.zip');

        const zipSize = Math.round((zipBlob.size / 1024) * 100) / 100;
        const count = data.length;
        const contentCount = data.filter((g) => g.content).length;

        // Update status to success
        setExportStatuses((prev) => ({
          ...prev,
          [type]: {
            type,
            status: 'success',
            message: `Exported ${count} games with ${contentCount} markdown files (${zipSize} KB)`,
            size: zipSize,
            count,
          },
        }));
      } else {
        // Regular JSON export for other types
        downloadJson(data, item.filename);

        // Calculate stats
        const size = calculateSize(data);
        const count = getItemCount(data, type);

        // Update status to success
        setExportStatuses((prev) => ({
          ...prev,
          [type]: {
            type,
            status: 'success',
            message: `Exported ${count} items (${size} KB)`,
            size,
            count,
          },
        }));
      }
    } catch (error) {
      console.error(`Export ${type} failed:`, error);

      // Update status to error
      setExportStatuses((prev) => ({
        ...prev,
        [type]: {
          type,
          status: 'error',
          message: error instanceof Error ? error.message : 'Export failed',
        },
      }));
    }
  };

  /**
   * Export all data types
   */
  const exportAll = async () => {
    setIsExportingAll(true);

    // Reset all statuses
    setExportStatuses({
      categories: { type: 'categories', status: 'idle' },
      tags: { type: 'tags', status: 'idle' },
      featured: { type: 'featured', status: 'idle' },
      games: { type: 'games', status: 'idle' },
    });

    // Export all types sequentially
    for (const item of exportItems) {
      await exportData(item.type);
      // Small delay between exports to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsExportingAll(false);
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status: ExportStatus['status']) => {
    switch (status) {
      case 'loading':
        return <MdiLoading className="size-5 animate-spin" />;
      case 'success':
        return <MdiCheckCircle className="text-green-600 size-5" />;
      case 'error':
        return <MdiAlertCircle className="text-red-600 size-5" />;
      default:
        return <MdiDownload className="size-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Export All Button */}
      <div className="border-border flex items-center justify-between rounded-lg border p-4">
        <div>
          <h3 className="text-foreground font-semibold">Export All Data</h3>
          <p className="text-muted-foreground text-sm">Export all data types at once</p>
        </div>
        <Button onClick={exportAll} disabled={isExportingAll} size="lg">
          {isExportingAll ? (
            <>
              <MdiLoading className="mr-2 size-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <MdiDownload className="mr-2 size-5" />
              Export All
            </>
          )}
        </Button>
      </div>

      {/* Individual Export Buttons */}
      <div className="grid gap-4 md:grid-cols-2">
        {exportItems.map((item) => {
          const status = exportStatuses[item.type];
          const isLoading = status.status === 'loading';
          const isDisabled = isLoading || isExportingAll;

          return (
            <div key={item.type} className="border-border space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-foreground font-semibold">{item.title}</h4>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                  <p className="text-muted-foreground mt-1 text-xs">File: {item.filename}</p>
                </div>
                <div className="ml-4">{getStatusIcon(status.status)}</div>
              </div>

              {status.message && (
                <Alert variant={status.status === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription className="text-xs">{status.message}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => exportData(item.type)}
                disabled={isDisabled}
                variant={status.status === 'success' ? 'outline' : 'default'}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <MdiLoading className="mr-2 size-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <MdiDownload className="mr-2 size-4" />
                    {status.status === 'success' ? 'Export Again' : 'Export'}
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
