'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWRInfinite from 'swr/infinite';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import type { UserOrder } from '@/types/user';
import { formatAmount } from '@/lib/utils';

interface OrdersGridProps {
  orders: UserOrder[];
  isLoading: boolean;
  hasMore: boolean;
  onOrderClick: (order: UserOrder) => void;
  userId: string;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
}

interface OrdersResponse {
  orders: UserOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
  filters: {
    status: string;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json() as any;
};

const OrderCardSkeleton = () => (
  <div className="bg-card rounded-lg border p-4 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="h-4 bg-muted rounded w-32" />
      <div className="h-6 bg-muted rounded-full w-16" />
    </div>
    <div className="h-3 bg-muted rounded w-24 mb-2" />
    <div className="h-3 bg-muted rounded w-20 mb-3" />
    <div className="flex justify-between items-center">
      <div className="h-3 bg-muted rounded w-16" />
      <div className="h-3 bg-muted rounded w-20" />
    </div>
  </div>
);

const OrderCard = ({ order, onClick }: { order: UserOrder; onClick: () => void }) => {
  const t = useTranslations('user_profile');
  
  // 格式化日期显示
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // 获取订单状态的图标和颜色
  const getOrderStatusConfig = (status: UserOrder['orderStatus']) => {
    switch (status) {
      case 'paid':
        return {
          icon: 'MdiCheckCircle',
          className: 'text-green-500 bg-green-50',
          text: t('order_status_paid')
        };
      case 'pending':
        return {
          icon: 'MdiClockOutline',
          className: 'text-yellow-500 bg-yellow-50',
          text: t('order_status_pending')
        };
      case 'failed':
        return {
          icon: 'MdiCloseCircle',
          className: 'text-red-500 bg-red-50',
          text: t('order_status_failed')
        };
      case 'refunded':
        return {
          icon: 'MdiUndo',
          className: 'text-blue-500 bg-blue-50',
          text: t('order_status_refunded')
        };
      case 'cancelled':
        return {
          icon: 'MdiCancel',
          className: 'text-gray-500 bg-gray-50',
          text: t('order_status_cancelled')
        };
      default:
        return {
          icon: 'MdiHelpCircle',
          className: 'text-gray-500 bg-gray-50',
          text: status
        };
    }
  };
  
  const statusConfig = getOrderStatusConfig(order.orderStatus);
  
  return (
    <div 
      className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3 gap-1">
        <div>
          <p className="font-medium text-sm text-muted-foreground whitespace-normal break-all">#{order.orderNumber}</p>
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {order.productName}
          </h3>
        </div>
        <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
          <Icon config={{ name: statusConfig.icon }} className="w-3 h-3" />
          {statusConfig.text}
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>{t('order_amount')}:</span>
          <span className="font-medium text-foreground">{formatAmount(order.orderAmount, order.orderCurrency)}</span>
        </div>
        
        {order.creditsAmountSnapshot > 0 && (
          <div className="flex justify-between">
            <span>{t('credits')}:</span>
            <span className="font-medium text-foreground">{order.creditsAmountSnapshot}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>{t('order_date')}:</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
        
        {order.paymentTime && (
          <div className="flex justify-between">
            <span>{t('payment_time')}:</span>
            <span>{formatDate(order.paymentTime)}</span>
          </div>
        )}
      </div>
      
      {order.paymentMethod && (
        <div className="mt-3 pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('payment_method')}:</span>
            <span className="capitalize font-medium">{order.paymentMethod}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function OrdersGrid({ 
  orders: initialOrders, 
  isLoading, 
  hasMore: initialHasMore, 
  onOrderClick,
  userId 
}: OrdersGridProps) {
  const t = useTranslations('user_profile');
  const [statusFilter] = useState<string>('all'); // 暂时固定为 all，后续可扩展为可选择的过滤器
  
  // 使用 SWR Infinite 进行分页加载
  const getKey = (pageIndex: number, previousPageData: APIResponse<OrdersResponse> | null) => {
    if (pageIndex === 0) return null; // 第一页已经从 props 获取
    if (previousPageData && !previousPageData.data.pagination.hasMore) return null;
    return `/api/user/orders?page=${pageIndex + 1}&limit=20&status=${statusFilter}`;
  };

  const {
    data,
    error,
    mutate,
    size,
    setSize,
    isValidating
  } = useSWRInfinite<APIResponse<OrdersResponse>, Error>(getKey, fetcher);

  // 合并所有页面的订单数据
  const allOrders = [
    ...initialOrders,
    ...(data?.flatMap(response => response.data.orders) || [])
  ];

  const hasMore = data 
    ? data[data.length - 1]?.data.pagination.hasMore
    : initialHasMore;

  const isLoadingMore = isValidating && data && typeof data[size - 1] !== 'undefined';
  const isEmpty = allOrders.length === 0;
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
          {t('loading_orders')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty && !isLoading) {
    return (
      <div className="text-center py-12">
        <Icon 
          config={{ name: 'MdiPackageVariantClosed' }} 
          className="w-16 h-16 text-muted-foreground mx-auto mb-4" 
        />
        <h3 className="text-lg font-semibold mb-2">{t('no_orders')}</h3>
        <p className="text-muted-foreground">{t('no_orders_description')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        {t('orders_count', { count: allOrders.length.toString() })}
      </h2>
      
      {/* 订单网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allOrders.map((order) => (
          <OrderCard
            key={order.uuid}
            order={order}
            onClick={() => onOrderClick(order)}
          />
        ))}
        
        {/* 加载更多时的占位卡片 */}
        {isLoadingMore && (
          Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={`loading-${i}`} />
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
          <p className="text-red-500 mb-4">{t('failed_to_load_more_orders')}</p>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            {t('retry')}
          </Button>
        </div>
      )}
    </div>
  );
}