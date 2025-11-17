'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserProfileHeader from './header';
import WorksGrid from './works-grid';
import OrdersGrid from './orders-grid';
import CreditsGrid from './credits-grid';
import WorkDetailModal from './work-detail-modal';
import OrderDetailModal from './order-detail-modal';
import { useUserCredits } from '@/hooks/use-user-credits';
import { UserProfile, UserWork } from '@/services/user/profile';
import { type UserOrder, EUserType } from '@/types/user';
import { NEED_USER_WORKS_SYSTEM } from '@/constants/config';

interface UserProfileClientProps {
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

const fetcher = async <T = any,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

export default function UserProfileClient({ userId }: UserProfileClientProps) {
  const t = useTranslations('user_profile');
  const tUser = useTranslations('user');
  const { data: session, status } = useSession();
  const [selectedWork, setSelectedWork] = useState<UserWork | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // 获取用户积分信息，用于判断是否显示积分Tab
  const { userType } = useUserCredits();

  // 获取用户作品（第一页）
  const { data: worksResponse, isLoading: isLoadingWorks } = useSWR<APIResponse<WorksResponse>>(
    `/api/user/works?page=1&limit=20`,
    fetcher,
  );

  // 获取用户订单（第一页）
  const { data: ordersResponse, isLoading: isLoadingOrders } = useSWR<APIResponse<OrdersResponse>>(
    `/api/user/orders?page=1&limit=20&status=all`,
    fetcher,
  );

  const handleWorkClick = (work: UserWork) => {
    setSelectedWork(work);
    setIsWorkModalOpen(true);
  };

  const handleOrderClick = (order: UserOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleCloseWorkModal = () => {
    setIsWorkModalOpen(false);
    setSelectedWork(null);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  // 会话加载状态
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">{t('loading_user')}</p>
        </div>
      </div>
    );
  }

  // 检查用户权限
  if (!session?.user || session.user.uuid !== userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">{t('user_not_found')}</h1>
          <p className="text-muted-foreground">{t('user_not_found_description')}</p>
        </div>
      </div>
    );
  }

  // 从 session 构造用户信息，添加作品和订单统计
  const works = worksResponse?.data?.works || [];
  const worksPagination = worksResponse?.data?.pagination;

  const orders = ordersResponse?.data?.orders || [];
  const ordersPagination = ordersResponse?.data?.pagination;

  const user: UserProfile = {
    id: 0, // 暂时不需要数字ID
    uuid: session.user.uuid || '',
    email: session.user.email || '',
    nickname: session.user.nickname || '',
    avatar: session.user.avatar || '',
    created_at: session.user.created_at || new Date().toISOString(),
    worksCount: worksPagination?.total || 0,
    followersCount: 0, // 暂时硬编码为0
  };

  // 判断是否显示积分Tab
  const showCreditsTab = userType === EUserType.PAID;
  const tabValues = [NEED_USER_WORKS_SYSTEM ? 'works' : '', 'orders', showCreditsTab ? 'credits' : ''].filter(Boolean);
  const tabDefaultValue = tabValues[0];
  const tabsCount = tabValues.length;
  const gridClassNameMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };
  // @ts-ignore
  const gridClassName = gridClassNameMap[`${tabsCount}`];
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* 用户信息头部 */}
      <UserProfileHeader user={user} />

      {/* Tab 导航和内容 */}
      <div className="mt-8">
        <Tabs defaultValue={tabDefaultValue} className="w-full">
          <TabsList className={`grid w-full ${gridClassName}`}>
            {NEED_USER_WORKS_SYSTEM && <TabsTrigger value="works">{tUser('my_works')}</TabsTrigger>}
            <TabsTrigger value="orders">{tUser('my_orders')}</TabsTrigger>
            {showCreditsTab && <TabsTrigger value="credits">{tUser('my_credits')}</TabsTrigger>}
          </TabsList>

          {NEED_USER_WORKS_SYSTEM && (
            <TabsContent value="works" className="mt-6">
              <WorksGrid
                works={works}
                isLoading={isLoadingWorks}
                hasMore={worksPagination?.hasMore || false}
                onWorkClick={handleWorkClick}
                userId={userId}
              />
            </TabsContent>
          )}

          <TabsContent value="orders" className="mt-6">
            <OrdersGrid
              orders={orders}
              isLoading={isLoadingOrders}
              hasMore={ordersPagination?.hasMore || false}
              onOrderClick={handleOrderClick}
              userId={userId}
            />
          </TabsContent>

          {showCreditsTab && (
            <TabsContent value="credits" className="mt-6">
              <CreditsGrid userId={userId} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* 作品详情模态框 */}
      {selectedWork && <WorkDetailModal work={selectedWork} isOpen={isWorkModalOpen} onClose={handleCloseWorkModal} />}

      {/* 订单详情模态框 */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} isOpen={isOrderModalOpen} onClose={handleCloseOrderModal} />
      )}
    </div>
  );
}
