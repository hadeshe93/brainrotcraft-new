import { EUserType, UserCreditsInfo } from '@/types/user';
import { APIErrorResponse } from '@/types/services/response';
import { ListData } from '@/types/services/base';

/**
 * 积分信息响应 (与前端 CreditsInfoResponse 保持一致)
 */
export interface CreditsInfoResponse {
  success: true;
  data: Omit<UserCreditsInfo, 'status'> | null;
  /** 用户类型 */
  userType: EUserType;
  /** 是否需要初始化 */
  requiresInitialization?: boolean;
}
export type APICreditsInfoResponse = APIErrorResponse | CreditsInfoResponse;

/**
 * 积分历史记录响应
 */
export interface CreditsHistoryResponse {
  success: true;
  data: ListData<{
    uuid: string;
    creditsAmount: number;
    expenseType: string;
    workRelationUuid?: string;
    remarks?: string;
    createdAt: number;
  }>;
}
export type APICreditsHistoryResponse = APIErrorResponse | CreditsHistoryResponse;