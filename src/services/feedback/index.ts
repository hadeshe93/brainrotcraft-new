import { FeedbackRecord } from "@/types/blocks/feedback";
import { kvStorage } from '@/services/kv-storage';
import { createCacheList, createCacheItem } from '@/lib/cache';

export async function createFeedback(payload: FeedbackRecord) {
  const listKey = createCacheList({ biz: 'feedback', key: 'list' });
  const itemKey = createCacheItem({ biz: 'feedback', key: payload.uuid });
  const listRes = await kvStorage.get<string[]>(listKey, { type: 'json' });
  let list: string[] = [];
  if (listRes.success) {
    list = listRes.data || [];
  }
  list.push(payload.uuid);
  const putListRes = await kvStorage.set(listKey, list);
  if (!putListRes.success) return false;

  const putItemRes = await kvStorage.set(itemKey, payload);
  if (!putItemRes.success) return false;

  return true;
}

export async function getFeedbackList() {
  const listKey = createCacheList({ biz: 'feedback', key: 'list' });
  const listRes = await kvStorage.get<string[]>(listKey, { type: 'json' });
  if (!listRes.success) return [];
  const promises = listRes.data?.map(async (uuid) => {
    const itemKey = createCacheItem({ biz: 'feedback', key: uuid });
    const itemRes = await kvStorage.get<FeedbackRecord>(itemKey, { type: 'json' });
    if (!itemRes.success) return null;
    return itemRes.data;
  });
  const items = await Promise.all(promises);
  return items.filter((item) => item !== null);
}