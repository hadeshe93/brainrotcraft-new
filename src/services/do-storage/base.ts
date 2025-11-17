import { getCloudflareEnv } from "@/services/base";
import { DOMAIN } from "@/constants/config";

interface BaseDoStorageOptions {
  bizName: string;
}

class BaseDoStorage {
  bizName: string;

  constructor(options: BaseDoStorageOptions) {
    this.bizName = options.bizName;
  }

  private getKey(rawKey: string) {
    return `${this.bizName}:${rawKey}`;
  }

  private async getService() {
    const env = await getCloudflareEnv();
    const { BASE_DO_SERVICE } = env;
    
    if (!BASE_DO_SERVICE) {
      throw new Error('BASE_DO_SERVICE binding not found');
    }

    return BASE_DO_SERVICE;
  }

  async set(doName: string, value: unknown, expirationTtl = 0) {
    const service = await this.getService();
    return await service.set(this.getKey(doName), value, expirationTtl);
  }

  async get(doName: string) {
    const service = await this.getService();
    return await service.get(this.getKey(doName));
  }

  async increment(doName: string, amount = 1, expirationTtl = 0) {
    const service = await this.getService();
    return await service.increment(this.getKey(doName), amount, expirationTtl);
  }

  async decrement(doName: string, amount = 1, expirationTtl = 0) {
    const service = await this.getService();
    return await service.decrement(this.getKey(doName), amount, expirationTtl);
  }
  
}

export const baseDoStorage = new BaseDoStorage({
  bizName: DOMAIN,
});