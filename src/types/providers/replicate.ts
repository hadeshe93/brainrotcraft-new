export enum EReplicateWebhookStatus {
  Starting = 'starting',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Canceled = 'canceled',
}

export enum EReplicateWebhookEvents {
  Start = 'start',
  Output = 'output',
  Logs = 'logs',
  Completed = 'completed',
}

export interface ReplicateWebhookEvent {
  id: string;
  version: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  status: EReplicateWebhookStatus;
  input: Record<string, any>;
  output?: any[];
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
  urls?: {
    get: string;
    cancel: string;
  };
}

/**
 * Replicate API 创建预测的请求体类型
 */
export interface ReplicateCreatePredictionRequest {
  version: string;
  input: Record<string, any>;
  webhook?: string;
  webhook_events_filter?: EReplicateWebhookEvents[];
}


/**
 * Replicate API 预测响应类型
 */
export interface ReplicatePredictionResponse {
  id: string;
  model?: string;
  version: string;
  input: Record<string, any>;
  output?: any;
  logs?: string;
  error?: string;
  status: EReplicateWebhookStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  urls: {
    get: string;
    cancel: string;
    stream?: string;
  };
  webhook?: string;
  webhook_events_filter?: string[];
  metrics?: {
    predict_time?: number;
  };
}