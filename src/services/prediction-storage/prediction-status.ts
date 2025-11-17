/**
 * 预测状态管理服务
 * 基于存储接口实现的预测任务状态管理
 */

import { APIResponse } from '@/types/services/response';
import { IPredictionStorage, PredictionStatus } from './interfaces';
import { PredictionStorageFactory } from './storage-factory';
import { EPredictionStatus } from '@/types/services/prediction';

// 导出类型供外部使用
export type { PredictionStatus };

/**
 * 预测状态管理类
 *
 * 使用工厂模式选择存储实现（KV 或 DO）
 */
export class PredictionStatusManager {
  private static storage: IPredictionStorage = PredictionStorageFactory.create();

  /**
   * 初始化预测状态
   */
  static async initializePredictionStatus(options: {
    predictionId: string;
    payload: any;
    prompt: string;
    model: string;
    estimatedTime?: number;
  }): Promise<APIResponse<void>> {
    return this.storage.initialize(options);
  }

  /**
   * 更新预测状态
   */
  static async updatePredictionStatus(
    predictionId: string,
    updates: Partial<Omit<PredictionStatus, 'predictionId' | 'createdAt'>>,
  ): Promise<APIResponse<PredictionStatus>> {
    return this.storage.update(predictionId, updates);
  }

  /**
   * 获取预测状态
   */
  static async getPredictionStatus(predictionId: string): Promise<APIResponse<PredictionStatus>> {
    return this.storage.get(predictionId);
  }

  /**
   * 删除预测状态
   */
  static async deletePredictionStatus(predictionId: string): Promise<APIResponse<void>> {
    return this.storage.delete(predictionId);
  }

  /**
   * 标记预测为处理中
   */
  static async markAsProcessing(predictionId: string): Promise<APIResponse<PredictionStatus>> {
    return this.updatePredictionStatus(predictionId, { status: EPredictionStatus.Processing });
  }

  /**
   * 标记预测为成功
   */
  static async markAsSucceeded(
    predictionId: string,
    imageUrl: string,
    imagePath: string,
    generationTime?: number,
  ): Promise<APIResponse<PredictionStatus>> {
    return this.updatePredictionStatus(predictionId, {
      status: EPredictionStatus.Succeeded,
      imageUrl,
      imagePath,
      generationTime,
    });
  }

  /**
   * 标记预测为失败
   */
  static async markAsFailed(predictionId: string, error: string): Promise<APIResponse<PredictionStatus>> {
    return this.updatePredictionStatus(predictionId, {
      status: EPredictionStatus.Failed,
      error,
    });
  }

  /**
   * 列出所有预测状态（可选的，用于调试和管理）
   */
  static async listPredictionStatuses(
    options: {
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<
    APIResponse<{
      statuses: PredictionStatus[];
      cursor?: string;
      hasMore: boolean;
    }>
  > {
    return this.storage.list(options);
  }

  /**
   * 获取当前使用的存储提供商（调试用）
   */
  static getCurrentStorageProvider(): string {
    return PredictionStorageFactory.getCurrentProvider();
  }

  /**
   * 重置存储实例（测试用）
   */
  static resetStorage(): void {
    PredictionStorageFactory.reset();
    this.storage = PredictionStorageFactory.create();
  }
}
