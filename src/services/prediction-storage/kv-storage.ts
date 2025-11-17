/**
 * Cloudflare KV 存储实现
 * 封装现有的 KV 存储逻辑
 */

import { putKV, getKV, deleteKV, listKV } from '../kv-storage';
import { 
  IPredictionStorage, 
  PredictionStatus, 
  InitializePredictionOptions,
  ListPredictionOptions,
  ListPredictionResult
} from './interfaces';
import { ECommonErrorCode } from '@/types/services/errors';
import { APIResponse } from '@/types/services/response';
import { EPredictionStatus } from '@/types/services/prediction';

export class KVPredictionStorage implements IPredictionStorage {
  private static readonly KEY_PREFIX = 'prediction:';
  private static readonly DEFAULT_TTL = 3600; // 1小时

  /**
   * 初始化预测状态
   */
  async initialize(options: InitializePredictionOptions): Promise<APIResponse<void>> {
    const { predictionId, payload, prompt, model, estimatedTime } = options;

    const status: PredictionStatus = {
      status: EPredictionStatus.Starting,
      predictionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      payload,
      prompt,
      model,
      estimatedTime,
    };

    try {
      // 直接以 predictionId 为 key 存储主数据
      const result = await putKV(
        `${KVPredictionStorage.KEY_PREFIX}${predictionId}`,
        status,
        { expirationTtl: KVPredictionStorage.DEFAULT_TTL }
      );
      
      const rs = await getKV(`${KVPredictionStorage.KEY_PREFIX}${predictionId}`);
      console.log('KV 重新取得初始化状态结果:', JSON.stringify(rs, null, 2));

      return result;
    } catch (error) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 获取预测状态
   */
  async get(predictionId: string): Promise<APIResponse<PredictionStatus>> {
    try {
      const result = await getKV(`${KVPredictionStorage.KEY_PREFIX}${predictionId}`);
      
      if (result.success && result.data) {
        return {
          success: true,
          message: '',
          data: result.data as PredictionStatus,
        };
      }

      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 更新预测状态
   */
  async update(
    predictionId: string,
    updates: Partial<Omit<PredictionStatus, 'predictionId' | 'createdAt'>>
  ): Promise<APIResponse<PredictionStatus>> {
    const existingResult = await this.get(predictionId);
    if (!existingResult.success || !existingResult.data) {
      return existingResult;
    }

    // 合并更新
    const updatedStatus: PredictionStatus = {
      ...existingResult.data,
      ...updates,
      updatedAt: Date.now(),
    };

    // 保存更新后的状态
    const saveResult = await putKV(
      `${KVPredictionStorage.KEY_PREFIX}${predictionId}`,
      updatedStatus,
      { expirationTtl: KVPredictionStorage.DEFAULT_TTL }
    );

    if (saveResult.success) {
      return {
        success: true,
        message: '',
        data: updatedStatus,
      };
    }

    return {
      success: false,
      message: '',
      errorCode: saveResult.errorCode,
    };
  }

  /**
   * 删除预测状态
   */
  async delete(predictionId: string): Promise<APIResponse<void>> {
    try {
      return await deleteKV(`${KVPredictionStorage.KEY_PREFIX}${predictionId}`);
    } catch (error) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 列出预测状态
   */
  async list(options: ListPredictionOptions = {}): Promise<APIResponse<ListPredictionResult>> {
    try {
      const result = await listKV({
        prefix: KVPredictionStorage.KEY_PREFIX,
        limit: options.limit || 10,
        cursor: options.cursor,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          message: '',
          // @ts-ignore
          errorCode: result.errorCode,
        };
      }

      // 获取每个 key 的详细数据
      const statuses: PredictionStatus[] = [];
      for (const key of result.data.keys) {
        const statusResult = await getKV(key.name);
        if (statusResult.success && statusResult.data) {
          statuses.push(statusResult.data as PredictionStatus);
        }
      }

      return {
        success: true,
        message: '',
        data: {
          statuses,
          cursor: result.data.cursor,
          hasMore: !result.data.list_complete,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }
}