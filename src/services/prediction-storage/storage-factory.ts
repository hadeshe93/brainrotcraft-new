/**
 * 预测状态存储工厂
 * 根据环境变量选择存储实现
 */

import { IPredictionStorage, StorageProvider } from './interfaces';
import { KVPredictionStorage } from './kv-storage';
import { DOPredictionStorage } from './do-storage';
import { debug } from '@/lib/debug';
import { PREDICTION_STORAGE_PROVIDER } from '@/constants/config';

export class PredictionStorageFactory {
  private static instance: IPredictionStorage | null = null;

  /**
   * 创建存储实例
   */
  static create(): IPredictionStorage {
    // 单例模式，避免重复创建
    if (this.instance) {
      return this.instance;
    }

    const provider = PredictionStorageFactory.getCurrentProvider();
    
    debug(`使用预测状态存储提供商: ${provider}`);

    switch (provider) {
      case StorageProvider.DO:
        this.instance = new DOPredictionStorage();
        debug('已创建 DOPredictionStorage 实例');
        break;
        
      case StorageProvider.KV:
      default:
        this.instance = new KVPredictionStorage();
        debug('已创建 KVPredictionStorage 实例');
        break;
    }

    return this.instance;
  }

  /**
   * 重置工厂实例（测试用）
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * 获取当前使用的存储提供商
   */
  static getCurrentProvider(): StorageProvider {
    return (PREDICTION_STORAGE_PROVIDER || 'kv') as StorageProvider;
  }
}