import type { EUserWorkType, EUserWorkGenerationStatus, EUserWorkManagementStatus } from '@/types/user/work';
import type { CreditHistoryRecord } from '@/types/user/credit';
import { EOrderBy, EOrder } from '@/types/services/base';

export enum EGetUserWorksParamsOrderBy {
  CreatedAt = EOrderBy.CreatedAt,
  UpdatedAt = EOrderBy.UpdatedAt,
  LikesCount = 'likes_count',
  DownloadsCount = 'downloads_count',
}

// 查询参数接口
export interface GetUserWorksParams {
  userUuid?: string;
  workType?: EUserWorkType;
  generationStatus?: EUserWorkGenerationStatus;
  managementStatus?: EUserWorkManagementStatus;
  isPublic?: boolean;
  page?: number;
  pageSize?: number;
  orderBy?: EGetUserWorksParamsOrderBy;
  order?: EOrder;
}

/**
 * 积分历史响应
 */
export interface CreditHistoryResponse {
  success: boolean;
  data: {
    records: CreditHistoryRecord[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
}
