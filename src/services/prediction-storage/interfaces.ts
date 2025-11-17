/**
 * 预测状态存储接口定义
 */

import { BasePredictionStatus } from '@/types/services/prediction';
import { APIResponse } from '@/types/services/response';

/**
 * 预测状态定义 (与 Replicate API 状态保持一致)
 */
export type PredictionStatus<TServicePayload extends Record<string, any> = any> = BasePredictionStatus<TServicePayload>;

/**
 * 初始化预测状态的选项
 */
export interface InitializePredictionOptions<TServicePayload extends Record<string, any> = any> {
  predictionId: string;
  payload: TServicePayload;
  prompt: string;
  model: string;
  estimatedTime?: number;
}

/**
 * 列表查询选项
 */
export interface ListPredictionOptions {
  limit?: number;
  cursor?: string;
}

/**
 * 列表查询结果
 */
export interface ListPredictionResult {
  statuses: PredictionStatus[];
  cursor?: string;
  hasMore: boolean;
}

/**
 * 预测状态存储接口
 */
export interface IPredictionStorage {
  /**
   * 初始化预测状态
   */
  initialize(options: InitializePredictionOptions): Promise<APIResponse<void>>;

  /**
   * 获取预测状态
   */
  get(predictionId: string): Promise<APIResponse<PredictionStatus>>;

  /**
   * 更新预测状态
   */
  update(
    predictionId: string, 
    updates: Partial<Omit<PredictionStatus, 'predictionId' | 'createdAt'>>
  ): Promise<APIResponse<PredictionStatus>>;

  /**
   * 删除预测状态
   */
  delete(predictionId: string): Promise<APIResponse<void>>;

  /**
   * 列出预测状态
   */
  list(options?: ListPredictionOptions): Promise<APIResponse<ListPredictionResult>>;
}

/**
 * 存储提供商枚举
 */
export enum StorageProvider {
  KV = 'kv',      // Cloudflare KV
  DO = 'do'       // Durable Object via RPC
}