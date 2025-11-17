import { DOMAIN } from "@/constants/config";

export interface CreateCacheOptions {
  biz: string;
  key: string;
}

export function createCacheList(options: CreateCacheOptions) {
  return `${DOMAIN}:${options.biz}:list:${options.key}`;
}

export function createCacheItem(options: CreateCacheOptions) {
  return `${DOMAIN}:${options.biz}:item:${options.key}`;
}