/**
 * Durable Object 存储实现
 * 基于 BaseDO 实现的预测状态存储
 */

import { 
  IPredictionStorage, 
  PredictionStatus, 
  InitializePredictionOptions,
  ListPredictionOptions,
  ListPredictionResult
} from './interfaces';
import { APIResponse } from '@/types/services/response';
import { ECommonErrorCode } from '@/types/services/errors';
import { debug } from '@/lib/debug';
import { EPredictionStatus } from '@/types/services/prediction';
import { baseDoStorage } from '../do-storage/base';

/**
 * DO 中存储的数据结构
 */
interface DOPredictionData {
  status: PredictionStatus;
  // 用于支持列表查询的元数据
  metadata: {
    createdAt: number;
    updatedAt: number;
    status: string;
  };
}

export class DOPredictionStorage implements IPredictionStorage {
  /**
   * 获取 BaseDO RPC 服务实例
   */
  private async getBaseDORpcService() {
    return baseDoStorage;
  }

  /**
   * 生成 DO 名称
   */
  private getDOName(predictionId: string): string {
    return `prediction-${predictionId}`;
  }

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

    const doData: DOPredictionData = {
      status,
      metadata: {
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
        status: status.status,
      },
    };

    try {
      const rpcService = await this.getBaseDORpcService();
      const doName = this.getDOName(predictionId);
      
      console.log('DO 初始化准备预测状态：', JSON.stringify({
        doName,
        doData,
      }));
      // 设置 1 小时过期时间（3600000ms）
      await rpcService.set(doName, doData, 3600000);
      
      debug('DO 初始化预测状态成功:', predictionId);
      
      return {
        success: true,
        message: '',
        data: undefined,
      };
    } catch (error) {
      debug('DO 初始化预测状态失败:', error);
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
      const rpcService = await this.getBaseDORpcService();
      const doName = this.getDOName(predictionId);
      const doData = await rpcService.get(doName) as DOPredictionData | null;
      
      if (!doData || !doData.status) {
        return {
          success: false,
          message: '',
          errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
        };
      }

      return {
        success: true,
        message: '',
        data: doData.status,
      };
    } catch (error) {
      debug('DO 获取预测状态失败:', error);
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
    try {
      const rpcService = await this.getBaseDORpcService();
      const doName = this.getDOName(predictionId);
      const existingData = await rpcService.get(doName) as DOPredictionData | null;
      
      if (!existingData || !existingData.status) {
        return {
          success: false,
          message: '',
          errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
        };
      }

      // 合并更新
      const updatedStatus: PredictionStatus = {
        ...existingData.status,
        ...updates,
        updatedAt: Date.now(),
      };

      const updatedData: DOPredictionData = {
        status: updatedStatus,
        metadata: {
          createdAt: existingData.metadata.createdAt,
          updatedAt: updatedStatus.updatedAt,
          status: updatedStatus.status,
        },
      };

      // 保持 1 小时过期时间
      await rpcService.set(doName, updatedData, 3600000);
      
      debug('DO 更新预测状态成功:', predictionId);

      return {
        success: true,
        message: '',
        data: updatedStatus,
      };
    } catch (error) {
      debug('DO 更新预测状态失败:', error);
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 删除预测状态
   */
  async delete(predictionId: string): Promise<APIResponse<void>> {
    try {
      const rpcService = await this.getBaseDORpcService();
      const doName = this.getDOName(predictionId);
      
      // BaseDO 没有直接的删除方法，我们通过设置为 null 来删除
      await rpcService.set(doName, null);
      
      debug('DO 删除预测状态成功:', predictionId);
      
      return {
        success: true,
        message: '',
        data: undefined,
      };
    } catch (error) {
      debug('DO 删除预测状态失败:', error);
      return {
        success: false,
        message: '',
        errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR,
      };
    }
  }

  /**
   * 列出预测状态
   * 
   * 注意：DO 不支持原生的前缀查询，这是一个限制
   * 在实际实现中，可能需要额外的索引策略来支持列表查询
   */
  async list(_options: ListPredictionOptions = {}): Promise<APIResponse<ListPredictionResult>> {
    // DO 不支持原生的列表查询，这里返回一个提示性错误
    debug('DO 存储暂不支持列表查询功能');
    
    return {
      success: false,
      message: '',
      errorCode: ECommonErrorCode.SERVICE_UNAVAILABLE,
    };
  }
}