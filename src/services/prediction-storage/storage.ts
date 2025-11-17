/**
 * 存储模块统一导出
 * 提供存储相关的所有接口和实现
 */

// 导出接口和类型
export type {
  IPredictionStorage,
  PredictionStatus,
  InitializePredictionOptions,
  ListPredictionOptions,
  ListPredictionResult
} from './interfaces';

export { StorageProvider } from './interfaces';

// 导出存储实现
export { KVPredictionStorage } from './kv-storage';
export { DOPredictionStorage } from './do-storage';

// 导出工厂
export { PredictionStorageFactory } from './storage-factory';

// 导出管理器（主要API）
export { PredictionStatusManager } from './prediction-status';
export type { PredictionStatus as PredictionStatusType } from './prediction-status';