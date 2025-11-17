'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useFormatter } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Icon from '@/components/icon';
import { EUserType, CreditHistoryRecord } from '@/types/user';
import { CreditHistoryResponse } from '@/types/services/user';

interface CreditsGridProps {
  userId: string;
}


const fetcher = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

export default function CreditsGrid({ userId }: CreditsGridProps) {
  const t = useTranslations('credits');
  const tCommon = useTranslations('common');
  const formatter = useFormatter();
  
  const [page, setPage] = useState(1);
  const [allRecords, setAllRecords] = useState<CreditHistoryRecord[]>([]);
  
  // 获取用户积分信息
  const { credits, userType, isLoading: isLoadingCredits, isError: isCreditsError } = useUserCredits();

  // 获取积分历史记录
  const { 
    data: historyResponse, 
    isLoading: isLoadingHistory,
    error: historyError
  } = useSWR<CreditHistoryResponse>(
    userType === EUserType.PAID ? `/api/user/credits/history?page=${page}&limit=20` : null,
    fetcher
  );

  // 更新记录列表
  useEffect(() => {
    if (historyResponse?.success) {
      if (page === 1) {
        setAllRecords(historyResponse.data.records);
      } else {
        setAllRecords(prev => [...prev, ...historyResponse.data.records]);
      }
    }
  }, [historyResponse, page]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  // 如果不是订阅用户，显示升级提示
  if (userType === EUserType.FREE) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md text-center">
          <Icon config={{ name: "EpCoin" }} className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('not_subscribed_title')}</h3>
          <p className="text-muted-foreground mb-6">
            {t('not_subscribed_description')}
          </p>
          <Button asChild>
            <Link href="/pricing">{t('upgrade_to_pro')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoadingCredits) {
    return (
      <div className="space-y-6">
        {/* 积分概览骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24 bg-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2 bg-muted-foreground" />
                <Skeleton className="h-3 w-32 bg-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* 历史记录骨架屏 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 bg-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 bg-muted-foreground" />
                  <Skeleton className="h-3 w-32 bg-muted-foreground" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-16 bg-muted-foreground" />
                  <Skeleton className="h-3 w-20 bg-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 错误状态
  if (isCreditsError || historyError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md text-center">
          <Icon config={{ name: "MdiTrendingDown" }} className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('load_error_title')}</h3>
          <p className="text-muted-foreground">
            {t('load_error_description')}
          </p>
        </div>
      </div>
    );
  }

  // 没有积分信息
  if (!credits) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md text-center">
          <Icon config={{ name: "EpCoin" }} className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('no_data_title')}</h3>
          <p className="text-muted-foreground">
            {t('no_data_description')}
          </p>
        </div>
      </div>
    );
  }

  const getExpenseTypeLabel = (type: string) => {
    switch (type) {
      case 'generate_work':
        return t('expense_type.generate_work');
      case 'premium_feature':
        return t('expense_type.premium_feature');
      case 'admin_deduct':
        return t('expense_type.admin_deduct');
      default:
        return type;
    }
  };

  const getExpenseTypeBadgeVariant = (type: string) => {
    return 'default' as const;
    // switch (type) {
    //   case 'generate_work':
    //     return 'secondary';
    //   case 'premium_feature':
    //     return 'outline';
    //   case 'admin_deduct':
    //     return 'destructive';
    //   default:
    //     return 'outline';
    // }
  };

  return (
    <div className="space-y-6">
      {/* 积分概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {/* 总可用积分 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Icon config={{ name: "EpCoin" }} className="h-4 w-4 text-emerald-600" />
              {t('total_available_credits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {credits.availableCredits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('total_credits_summary', {
                subscription: credits.totalCreditsInCurrentCycle - credits.usedCreditsInCurrentCycle,
                permanent: credits.availablePermanentCredits
              })}
            </p>
          </CardContent>
        </Card>

        {/* 订阅积分 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Icon config={{ name: "MdiCalendarClock" }} className="h-4 w-4 text-blue-600" />
              {t('subscription_credits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {credits.totalCreditsInCurrentCycle - credits.usedCreditsInCurrentCycle}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('out_of_total', { total: credits.totalCreditsInCurrentCycle })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('subscription_credits_description')}
            </p>
          </CardContent>
        </Card>

        {/* 永久积分 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Icon config={{ name: "MdiInfinity" }} className="h-4 w-4 text-purple-600" />
              {t('permanent_credits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {credits.availablePermanentCredits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('out_of_total', { total: credits.totalPermanentCredits })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('permanent_credits_description')}
            </p>
          </CardContent>
        </Card>

        {/* 预扣积分 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Icon config={{ name: "MdiClockOutline" }} className="h-4 w-4 text-orange-600" />
              {t('pending_credits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {credits.pendingCredits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {credits.pendingReservations.length} {t('pending_tasks')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 订阅周期信息（仅订阅用户显示） */}
      {(() => {
        // 检测是否为零长度订阅周期（一次性购买用户）
        const isZeroLengthCycle = credits.subscriptionCycle.startTime === credits.subscriptionCycle.endTime;
        const hasSubscriptionCredits = credits.totalCreditsInCurrentCycle > 0;

        // 仅在有订阅积分且非零长度周期时显示
        return hasSubscriptionCredits && !isZeroLengthCycle ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="">{t('subscription_cycle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-sm text-muted-foreground">{t('cycle_start')}</span>
                  <div className="text-sm font-medium">
                    {new Date(credits.subscriptionCycle.startTime * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('cycle_end')}</span>
                  <div className="text-sm font-medium">
                    {new Date(credits.subscriptionCycle.endTime * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('days_remaining')}</span>
                  <div className="text-sm font-medium">
                    {Math.max(0, Math.ceil((credits.subscriptionCycle.endTime * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))} {t('days')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* 积分历史记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon config={{ name: "MdiNoteText" }} className="h-5 w-5" />
            {t('usage_history')}
          </CardTitle>
          <CardDescription>
            {t('history_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory && page === 1 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48 bg-muted-foreground" />
                    <Skeleton className="h-3 w-32 bg-muted-foreground" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-16 bg-muted-foreground" />
                    <Skeleton className="h-3 w-20 bg-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : allRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon config={{ name: "MdiNoteText" }} className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t('no_usage_history')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allRecords.map((record) => {
                // 解析 remarks 获取消耗来源
                let deductionSource: { fromCycleCredits?: number; fromPermanentCredits?: number } | null = null;
                try {
                  if (record.remarks) {
                    const remarksData = JSON.parse(record.remarks);
                    deductionSource = remarksData.deductionSource;
                  }
                } catch (e) {
                  // 旧数据可能没有结构化的 remarks
                }

                return (
                  <div key={record.uuid} className="flex flex-col justify-start items-start gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getExpenseTypeBadgeVariant(record.expenseType)}>
                          {getExpenseTypeLabel(record.expenseType)}
                        </Badge>
                        {/* 消耗来源标注 */}
                        {deductionSource && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {deductionSource.fromCycleCredits !== undefined && deductionSource.fromCycleCredits > 0 && (
                              <span className="flex items-center gap-1">
                                <Icon config={{ name: "MdiCalendarClock" }} className="h-3 w-3" />
                                {t('from_subscription', { amount: deductionSource.fromCycleCredits })}
                              </span>
                            )}
                            {deductionSource.fromPermanentCredits !== undefined && deductionSource.fromPermanentCredits > 0 && (
                              <span className="flex items-center gap-1">
                                <Icon config={{ name: "MdiInfinity" }} className="h-3 w-3" />
                                {t('from_permanent', { amount: deductionSource.fromPermanentCredits })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {record.workRelationUuid && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="shrink-0">{t('outputId')}:</span>
                          <span className="whitespace-normal break-all">{record.workRelationUuid}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatter.relativeTime(new Date(record.createdAt * 1000), new Date())}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        -{record.creditsAmount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('credits')}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* 加载更多按钮 */}
              {historyResponse?.data.pagination.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    disabled={isLoadingHistory}
                  >
                    {isLoadingHistory ? tCommon('loading') : t('load_more')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}