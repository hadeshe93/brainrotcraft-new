'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { EPredictionStatus } from '@/types/services/prediction';

// 预测数据接口
interface PredictionData {
  predictionId: string;
  status: EPredictionStatus;
  imageUrl?: string;
  imagePath?: string;
  error?: string;
  estimatedTime?: number;
  generationTime?: number;
  createdAt: number;
  updatedAt: number;
}

// API 响应接口
interface PredictionStatusResponse {
  success: boolean;
  message: string;
  data?: PredictionData;
  errorCode?: number;
  category?: string;
}

// Hook 配置选项
interface UsePredictionPollingOptions {
  /** 是否启用轮询 */
  enabled?: boolean;
  /** 轮询间隔（毫秒），支持递增间隔 */
  intervals?: number[];
  /** 最大轮询次数 */
  maxAttempts?: number;
  /** 成功回调 */
  onSuccess?: (data: PredictionData) => void;
  /** 失败回调 */
  onError?: (error: string) => void;
  /** 状态变化回调 */
  onStatusChange?: (status: EPredictionStatus, data: PredictionData) => void;
}

// Hook 返回值
interface UsePredictionPollingResult {
  data: PredictionData | null;
  error: string | null;
  isLoading: boolean;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => Promise<PredictionStatusResponse | undefined>;
}

// 状态获取器函数
const fetcher = async (url: string): Promise<PredictionStatusResponse> => {
  const response = await fetch(url);
  return response.json();
};

// 判断是否为最终状态
const isFinalStatus = (status: EPredictionStatus): boolean => {
  return ['succeeded', 'failed', 'canceled'].includes(status);
};

/**
 * 智能预测轮询 Hook
 * 
 * 特性：
 * - 递增轮询间隔（避免过度请求）
 * - 自动停止轮询（完成/失败/取消时）
 * - 错误重试机制
 * - 状态变化回调
 * - 手动控制轮询开始/停止
 */
export function usePredictionPolling(
  predictionId: string | null,
  options: UsePredictionPollingOptions = {}
): UsePredictionPollingResult {
  const {
    enabled = true,
    intervals = [1000],
    maxAttempts = 100,
    onSuccess,
    onError,
    onStatusChange,
  } = options;

  // 状态管理
  const [isPolling, setIsPolling] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<EPredictionStatus | null>(null);

  // 计时器引用
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalIndexRef = useRef(0);
  const attemptsRef = useRef(0);

  // 回调函数引用 - 解决定时器闭包问题
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);

  // 构建 API URL
  const apiUrl = predictionId ? `/api/prediction/${predictionId}` : null;

  // 使用 SWR 进行数据获取（禁用自动刷新，由轮询控制）
  const {
    data: response,
    error: swrError,
    isLoading: swrLoading,
    mutate,
  } = useSWR<PredictionStatusResponse>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // 禁用自动刷新
    }
  );

  // 清理计时器
  const clearPollingTimer = useCallback(() => {
    console.log('🔄 清理计时器');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 停止轮询
  const stopPolling = useCallback(() => {
    console.log('X 停止轮询');
    setIsPolling(false);
    clearPollingTimer();
    intervalIndexRef.current = 0;
    attemptsRef.current = 0;
  }, [clearPollingTimer]);

  // 执行轮询
  const performPoll = useCallback(async () => {
    console.log(`111 🔄 轮询第 ${attemptsRef.current + 1} 次，使用间隔: ${intervals[intervalIndexRef.current]}ms`);
    if (!apiUrl || attemptsRef.current >= maxAttempts) {
      console.log('🛑 轮询停止：达到最大尝试次数或 URL 无效');
      stopPolling();
      return;
    }

    try {
      console.log(`🔄 轮询第 ${attemptsRef.current + 1} 次，使用间隔: ${intervals[intervalIndexRef.current]}ms`);
      
      // 增加尝试次数
      attemptsRef.current += 1;

      // 触发数据获取
      const data = await mutate();
      
      if (!data) {
        throw new Error('No data received from API');
      }

      if (!data.success) {
        throw new Error(data.message || 'API request failed');
      }

      if (!data.data) {
        throw new Error('No prediction data in response');
      }

      const predictionData = data.data;
      const currentStatus = predictionData.status;

      console.log(`📊 轮询状态: ${currentStatus}`, predictionData);

      // 状态变化回调 - 使用 Ref 避免闭包问题
      if (currentStatus !== previousStatus) {
        setPreviousStatus(currentStatus);
        onStatusChangeRef.current?.(currentStatus, predictionData);
      }

      // 检查是否为最终状态
      if (isFinalStatus(currentStatus)) {
        console.log(`✅ 预测完成，状态: ${currentStatus}`);
        
        if (currentStatus === 'succeeded') {
          onSuccessRef.current?.(predictionData);
        } else {
          onErrorRef.current?.(predictionData.error || `Prediction ${currentStatus}`);
        }

        stopPolling();
        return;
      }

      // 设置下次轮询
      const currentIntervalIndex = Math.min(intervalIndexRef.current, intervals.length - 1);
      const nextInterval = intervals[currentIntervalIndex];

      console.log('🔄 设置下次轮询:', nextInterval);
      timeoutRef.current = setTimeout(() => {
        console.log('定时时间到 ！！');
        // 递增间隔索引（但不超过最大值）
        if (intervalIndexRef.current < intervals.length - 1) {
          intervalIndexRef.current += 1;
        }
        // 使用 Ref 保存的函数引用，避免闭包问题
        performPollRef.current?.();
      }, nextInterval);

    } catch (error) {
      console.error('Polling error:', error);
      onErrorRef.current?.(error instanceof Error ? error.message : 'Unknown polling error');
      stopPolling();
    }
  }, [apiUrl, maxAttempts, stopPolling, mutate, intervals, previousStatus]);

  // performPoll 函数引用 - 用于定时器回调
  const performPollRef = useRef(performPoll);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (!apiUrl || !enabled) return;

    setIsPolling(true);
    intervalIndexRef.current = 0;
    attemptsRef.current = 0;
    setPreviousStatus(null);

    // 立即执行第一次轮询
    performPoll();
  }, [apiUrl, enabled, performPoll]);

  // 手动刷新
  const refetch = useCallback(async () => {
    return await mutate();
  }, [mutate]);

  // 更新 performPoll 引用
  useEffect(() => {
    performPollRef.current = performPoll;
  }, [performPoll]);

  // 更新回调函数引用
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // 自动开始轮询（当 predictionId 可用且启用时）
  useEffect(() => {
    if (predictionId && enabled && !isPolling) {
      startPolling();
    }
  }, [predictionId, enabled, isPolling, startPolling]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearPollingTimer();
    };
  }, [clearPollingTimer]);

  // 返回结果
  return {
    data: response?.success ? response.data || null : null,
    error: swrError ? swrError.message : (response?.success === false ? response.message : null),
    isLoading: swrLoading,
    isPolling,
    startPolling,
    stopPolling,
    refetch,
  };
} 