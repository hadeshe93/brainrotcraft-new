import { getCloudflareEnv } from "@/services/base";
import { DOMAIN } from "@/constants/config";

interface Value {
  // 第几次限制
  limitTimes: number;
  // 限制结束时间
  limitEndTimeMs: number;
  // 当前周期已经执行的次数
  executedTimesCurrentCycle: number;
  // 当前是第几个周期
  currentCycle: number;
}

export interface TryApplyOptions {
  limitCycleExcutionTimes: number;
  limitCycleTimeMs: number;
}

export interface ThrottlerDOValue {
  granted: boolean;
  value: Value;
}

export interface CycleLimitParams {
  limitCycleExcutionTimes: number;
  limitCycleTimeMs: number;
}

interface ThrottleDoStorageOptions {
  bizName: string;
}

class ThrottleDoStorage {
  bizName: string;

  constructor(options: ThrottleDoStorageOptions) {
    this.bizName = options.bizName;
  }

  private getKey(rawKey: string) {
    return `${this.bizName}:${rawKey}`;
  }

  private async getService() {
    const env = await getCloudflareEnv();
    const { THROTTLE_SERVICE } = env;
    
    if (!THROTTLE_SERVICE) {
      throw new Error('THROTTLE_SERVICE binding not found');
    }

    return THROTTLE_SERVICE;
  }

  async tryApply(userIdentifier: string, options?: TryApplyOptions): Promise<ThrottlerDOValue> {
    const service = await this.getService();
    return await service.tryApply(this.getKey(userIdentifier), options);
  }

  async clearState(userIdentifier: string) {
    const service = await this.getService();
    return await service.clearState(this.getKey(userIdentifier));
  }

  async getState(userIdentifier: string): Promise<ThrottlerDOValue> {
    const service = await this.getService();
    return await service.getState(this.getKey(userIdentifier));
  }
}

export const throttleDoStorage = new ThrottleDoStorage({
  bizName: DOMAIN,
});
