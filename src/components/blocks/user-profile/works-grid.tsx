'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWRInfinite from 'swr/infinite';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { UserWork } from '@/services/user/profile';
import MdiFileDocumentBoxCheckOutline from '~icons/mdi/file-document-box-check-outline';

interface WorksGridProps {
  works: UserWork[];
  isLoading: boolean;
  hasMore: boolean;
  onWorkClick: (work: UserWork) => void;
  userId: string;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
}

interface WorksResponse {
  works: UserWork[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json() as any;
};

const WorkCardSkeleton = () => (
  <div className="bg-card rounded-lg border overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-muted" />
    <div className="p-3">
      <div className="h-4 bg-muted rounded mb-2" />
      <div className="flex justify-between items-center">
        <div className="h-3 bg-muted rounded w-16" />
        <div className="h-3 bg-muted rounded w-12" />
      </div>
    </div>
  </div>
);

const WorkCard = ({ work, onClick }: { work: UserWork; onClick: () => void }) => {
  const t = useTranslations('user_profile');
  const [imageError, setImageError] = useState(false);
  
  // 检查是否为有效的图片URL
  const isValidImageUrl = work.generationStatus === 'completed' && 
    work.workResult && 
    (work.workResult.startsWith('http') || work.workResult.startsWith('/'));
  
  return (
    <div 
      className="bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-muted">
        {isValidImageUrl && !imageError ? (
          <img
            src={work.workResult}
            loading="lazy"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {work.generationStatus === 'generating' ? (
              <div className="flex flex-col items-center gap-2">
                <Icon 
                  config={{ name: 'MdiLoading' }} 
                  className="w-8 h-8 text-muted-foreground animate-spin" 
                />
                <span className="text-xs text-muted-foreground">{t('generating')}</span>
              </div>
            ) : work.generationStatus === 'failed' ? (
              <div className="flex flex-col items-center gap-2">
                <Icon 
                  config={{ name: 'MdiAlert' }} 
                  className="w-8 h-8 text-red-500" 
                />
                <span className="text-xs text-red-500">{t('generation_failed')}</span>
              </div>
            ) : (
              <MdiFileDocumentBoxCheckOutline 
                className="w-12 h-12 text-muted-foreground" 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function WorksGrid({ 
  works: initialWorks, 
  isLoading, 
  hasMore: initialHasMore, 
  onWorkClick,
  userId 
}: WorksGridProps) {
  const t = useTranslations('user_profile');
  
  // 使用 SWR Infinite 进行分页加载
  const getKey = (pageIndex: number, previousPageData: APIResponse<WorksResponse> | null) => {
    if (pageIndex === 0) return null; // 第一页已经从 props 获取
    if (previousPageData && !previousPageData.data.pagination.hasMore) return null;
    return `/api/user/works?page=${pageIndex + 1}&limit=20`;
  };

  const {
    data,
    error,
    mutate,
    size,
    setSize,
    isValidating
  } = useSWRInfinite<APIResponse<WorksResponse>, Error>(getKey, fetcher);

  // 合并所有页面的作品数据
  const allWorks = [
    ...initialWorks,
    ...(data?.flatMap(response => response.data.works) || [])
  ];

  const hasMore = data 
    ? data[data.length - 1]?.data.pagination.hasMore
    : initialHasMore;

  const isLoadingMore = isValidating && data && typeof data[size - 1] !== 'undefined';
  const isEmpty = allWorks.length === 0;
  const isReachingEnd = !hasMore;

  const loadMore = () => {
    if (!isLoadingMore && !isReachingEnd) {
      setSize(size + 1);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">
          {t('loading_works')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <WorkCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <div className="text-center py-12">
        <MdiFileDocumentBoxCheckOutline 
          className="w-16 h-16 text-muted-foreground mx-auto mb-4" 
        />
        <h3 className="text-lg font-semibold mb-2">{t('no_works')}</h3>
        <p className="text-muted-foreground">{t('no_works_description')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {t('works_count', { count: allWorks.length.toString() })}
      </h2>
      
      {/* 作品网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {allWorks.map((work) => (
          <WorkCard
            key={work.uuid}
            work={work}
            onClick={() => onWorkClick(work)}
          />
        ))}
        
        {/* 加载更多时的占位卡片 */}
        {isLoadingMore && (
          Array.from({ length: 4 }).map((_, i) => (
            <WorkCardSkeleton key={`loading-${i}`} />
          ))
        )}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && !isLoadingMore && (
        <div className="text-center">
          <Button 
            onClick={loadMore}
            variant="outline"
            className="px-8"
          >
            {t('load_more')}
          </Button>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-4">
          <p className="text-red-500 mb-4">Failed to load more works</p>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}