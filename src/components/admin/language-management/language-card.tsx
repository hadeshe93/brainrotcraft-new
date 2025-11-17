'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MdiDotsVertical from '~icons/mdi/dots-vertical';
import MdiPencil from '~icons/mdi/pencil';
import MdiDelete from '~icons/mdi/delete';
import MdiRefresh from '~icons/mdi/refresh';
import MdiSparkles from '~icons/mdi/sparkles';
import MdiLoading from '~icons/mdi/loading';

interface LanguageStats {
  overall?: {
    completeness: number;
    online?: {
      // Online games + all other content (primary focus)
      completeness: number;
    };
  };
  byModule?: {
    games?: {
      total: number;
      done: number;
      online?: { total: number; done: number }; // Online games (primary focus)
    };
    categories?: { total: number; done: number };
    tags?: { total: number; done: number };
    featured?: { total: number; done: number };
  };
  lastUpdated?: number;
}

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

interface LanguageCardProps {
  language: LanguageConfig;
  stats?: LanguageStats;
  isLoadingStats?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onAutoTranslate: () => void;
  isDeleting?: boolean;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return 'Never';

  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function StatRow({ icon, label, done, total }: { icon: string; label: string; done: number; total: number }) {
  const percentage = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex-shrink-0 text-lg">{icon}</span>
        <span className="truncate text-sm">{label}</span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {done}/{total}
        </span>
        <Progress value={percentage} className="h-2 w-16" />
      </div>
    </div>
  );
}

/**
 * Game stat row with primary (online games) and secondary (all games) display
 */
function GameStatRow({
  icon,
  label,
  onlineDone,
  onlineTotal,
  allDone,
  allTotal,
}: {
  icon: string;
  label: string;
  onlineDone: number;
  onlineTotal: number;
  allDone?: number;
  allTotal?: number;
}) {
  const percentage = onlineTotal > 0 ? (onlineDone / onlineTotal) * 100 : 0;

  return (
    <div className="space-y-1.5">
      {/* Primary: Online games */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex-shrink-0 text-lg">{icon}</span>
          <span className="truncate text-sm">{label}</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            {onlineDone}/{onlineTotal}
          </span>
          <Progress value={percentage} className="h-2 w-16" />
        </div>
      </div>
      {/* Secondary: All games (if different from online) */}
      {allTotal !== undefined && allTotal !== onlineTotal && (
        <div className="pl-7">
          <span className="text-muted-foreground text-xs">
            全部游戏: {allDone}/{allTotal}
          </span>
        </div>
      )}
    </div>
  );
}

export function LanguageCard({
  language,
  stats,
  isLoadingStats = false,
  onEdit,
  onDelete,
  onRefresh,
  onAutoTranslate,
  isDeleting = false,
}: LanguageCardProps) {
  const overallCompleteness = stats?.overall?.completeness || 0;
  const gamesStats = stats?.byModule?.games || { total: 0, done: 0 };
  const gamesOnlineStats = gamesStats.online || null;
  const categoriesStats = stats?.byModule?.categories || { total: 0, done: 0 };
  const tagsStats = stats?.byModule?.tags || { total: 0, done: 0 };
  const featuredStats = stats?.byModule?.featured || { total: 0, done: 0 };

  return (
    <Card
      className={`hover:border-primary relative transition-colors ${isDeleting ? 'pointer-events-none opacity-60' : ''}`}
    >
      {/* Deleting Overlay */}
      {isDeleting && (
        <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-[2px]">
          <div className="text-muted-foreground flex items-center gap-2">
            <MdiLoading className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">正在删除...</span>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 truncate text-lg font-semibold">
              {language.nativeName}
              {language.isDefault && (
                <Badge variant="secondary" className="">
                  默认语言
                </Badge>
              )}
            </h3>
            <p className="text-muted-foreground truncate text-sm">{language.chineseName}</p>
          </div>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MdiDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <MdiPencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              {!language.isDefault && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <MdiDelete className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onRefresh}>
                <MdiRefresh className="mr-2 h-4 w-4" />
                刷新审计
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAutoTranslate}>
                <MdiSparkles className="mr-2 h-4 w-4" />
                自动化翻译
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoadingStats ? (
          // Loading state
          <>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
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
          </>
        ) : (
          // Loaded state
          <>
            {/* Business Module Stats */}
            <div className="space-y-3">
              {/* Games: Show online games as primary, all games as secondary */}
              {gamesOnlineStats ? (
                <GameStatRow
                  icon="🎮"
                  label="在线游戏翻译"
                  onlineDone={gamesOnlineStats.done}
                  onlineTotal={gamesOnlineStats.total}
                  allDone={gamesStats.done}
                  allTotal={gamesStats.total}
                />
              ) : (
                <StatRow icon="🎮" label="游戏翻译" done={gamesStats.done} total={gamesStats.total} />
              )}
              <StatRow icon="📁" label="分类翻译" done={categoriesStats.done} total={categoriesStats.total} />
              <StatRow icon="🏷️" label="标签翻译" done={tagsStats.done} total={tagsStats.total} />
              <StatRow icon="⭐" label="特性翻译" done={featuredStats.done} total={featuredStats.total} />
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              {(() => {
                // Prioritize online games + other content (primary focus)
                const onlineCompleteness = stats?.overall?.online?.completeness;
                const displayCompleteness = onlineCompleteness !== undefined ? onlineCompleteness : overallCompleteness;
                const showSecondary = onlineCompleteness !== undefined && onlineCompleteness !== overallCompleteness;

                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        整体完成度
                        {showSecondary && <span className="text-muted-foreground ml-1 text-xs">(在线重点)</span>}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round(displayCompleteness * 100)}%
                      </span>
                    </div>
                    <Progress value={displayCompleteness * 100} />
                    {showSecondary && (
                      <p className="text-muted-foreground text-xs">
                        全部内容: {Math.round(overallCompleteness * 100)}%
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Last Updated */}
            <p className="text-muted-foreground text-xs">更新: {formatRelativeTime(stats?.lastUpdated)}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
