
export enum EPredictionStatus {
  Starting = 'starting',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Canceled = 'canceled',
}

/**
 * 预测状态定义 (与 Replicate API 状态保持一致)
 */
export interface BasePredictionStatus<TPayload extends Record<string, any>> {
  status: EPredictionStatus;
  predictionId: string;
  createdAt: number;
  updatedAt: number;
  payload?: TPayload;
  prompt?: string;
  model?: string;
  imageUrl?: string;
  imagePath?: string;
  error?: string;
  estimatedTime?: number;
  generationTime?: number;
}