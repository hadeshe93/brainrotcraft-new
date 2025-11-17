import { ServiceErrorCode } from '@/types/services/errors';

export interface APISuccessResponse<TData = any, TPayload = any> {
  success: true;
  message: string;
  data: TData;
  payload?: TPayload;
}

export interface APIErrorResponse {
  success: false;
  message: string;
  errorCode: ServiceErrorCode;
  category?: string;
  status?: number;
}

export type APIResponse<TData = any, TPayload = any> = APISuccessResponse<TData, TPayload> | APIErrorResponse;