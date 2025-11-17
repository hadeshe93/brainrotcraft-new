/**
 * 性能监控工具类
 * 用于记录各环节的耗时打点，便于性能分析和调试
 * 
 * 使用方式：
 * 1. 通过环境变量 ENABLE_PERFORMANCE_MONITORING=true 开启监控
 * 2. 使用 performanceMonitor.start(label) 开始计时
 * 3. 使用 performanceMonitor.end(label) 结束计时
 */
import { ENABLE_PERFORMANCE_MONITORING } from "@/constants/config";
interface TimingData {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isEnabled: boolean;
  private timings: Map<string, TimingData> = new Map();
  
  constructor() {
    // 通过环境变量控制开关，便于部署时控制
    this.isEnabled = ENABLE_PERFORMANCE_MONITORING;
    console.log(`⏱️ 性能监控已自动${this.isEnabled ? '启用' : '禁用'}`);
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * 开始计时
   * @param label 计时标签
   * @param metadata 可选的元数据信息
   */
  start(label: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    this.timings.set(label, {
      label,
      startTime: Date.now(),
      metadata,
    });
    
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.log(`⏱️ [${label}] 计时开始${metadataStr}`);
  }
  
  /**
   * 结束计时
   * @param label 计时标签
   * @returns 耗时（毫秒），如果未启用监控则返回 null
   */
  end(label: string): number | null {
    if (!this.isEnabled) return null;
    
    const timing = this.timings.get(label);
    if (!timing) {
      console.warn(`⚠️ 未找到计时标签: ${label}`);
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - timing.startTime;
    
    timing.endTime = endTime;
    timing.duration = duration;
    
    console.log(`⏱️ [${label}] 计时完成，耗时: ${duration}ms`);
    
    this.timings.delete(label); // 清理已完成的计时
    return duration;
  }
  
  /**
   * 记录一个即时的性能标记点
   * @param label 标记点名称
   * @param metadata 可选的元数据信息
   */
  mark(label: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.log(`📍 [${label}] 标记点${metadataStr}`);
  }
  
  /**
   * 获取所有进行中的计时数据（调试用）
   * @returns 计时数据数组
   */
  getAllTimings(): TimingData[] {
    if (!this.isEnabled) return [];
    return Array.from(this.timings.values());
  }
  
  /**
   * 清理所有计时数据
   */
  clear(): void {
    this.timings.clear();
  }
  
  /**
   * 检查监控是否启用
   * @returns 是否启用
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * 手动启用/禁用监控（运行时切换）
   * @param enabled 是否启用
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`⏱️ 性能监控已手动${enabled ? '启用' : '禁用'}`);
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 导出类型定义，便于其他模块使用
export type { TimingData };