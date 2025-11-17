import { userWorks } from '@/db/schema';
import { createDrizzleClient } from '@/db/client';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { uuid } from '@/lib/uuid';
import { debug } from '@/lib/debug';
import { UserWork, EUserWorkManagementStatus } from '@/types/user/work';
import { GetUserWorksParams } from '@/types/services/user';
export type { UserWork };


// 分页查询结果
export interface PaginatedUserWorks {
  items: UserWork[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 统计信息
export interface UserWorkStats {
  totalWorks: number;
  completedWorks: number;
  failedWorks: number;
  generatingWorks: number;
  totalCreditsConsumed: number;
  totalLikes: number;
  totalDownloads: number;
  worksByType: {
    text_to_text: number;
    text_to_image: number;
    image_to_image: number;
  };
}

/**
 * 创建用户作品
 */
export async function createUserWork(work: Omit<UserWork, 'uuid'>, db: D1Database): Promise<UserWork> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const workUuid = uuid();
    const now = Math.floor(Date.now() / 1000);
    
    const newWorks = await drizzle
      .insert(userWorks)
      .values({
        uuid: workUuid,
        userUuid: work.userUuid,
        workType: work.workType,
        inputContent: work.inputContent,
        inputImageUrl: work.inputImageUrl || null,
        workResult: work.workResult,
        generationDuration: work.generationDuration || null,
        creditsConsumed: work.creditsConsumed,
        generationStatus: work.generationStatus,
        managementStatus: work.managementStatus || 'active',
        isPublic: work.isPublic || false,
        likesCount: work.likesCount || 0,
        downloadsCount: work.downloadsCount || 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    const newWork = newWorks[0];
    debug('Created user work:', newWork.uuid);
    
    return {
      id: newWork.id,
      uuid: newWork.uuid,
      userUuid: newWork.userUuid,
      workType: newWork.workType as UserWork['workType'],
      inputContent: newWork.inputContent,
      inputImageUrl: newWork.inputImageUrl || undefined,
      workResult: newWork.workResult,
      generationDuration: newWork.generationDuration || undefined,
      creditsConsumed: newWork.creditsConsumed,
      generationStatus: newWork.generationStatus as UserWork['generationStatus'],
      managementStatus: newWork.managementStatus as UserWork['managementStatus'],
      isPublic: !!newWork.isPublic,
      likesCount: newWork.likesCount || 0,
      downloadsCount: newWork.downloadsCount || 0,
      createdAt: new Date(newWork.createdAt * 1000).toISOString(),
      updatedAt: new Date(newWork.updatedAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error creating user work:', error);
    throw new Error('Failed to create user work');
  }
}

/**
 * 根据 predictionId 查找用户作品（通过 workResult 字段匹配）
 */
export async function getUserWorkByPredictionId(predictionId: string, db: D1Database): Promise<UserWork | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const works = await drizzle
      .select()
      .from(userWorks)
      .where(eq(userWorks.workResult, predictionId))
      .limit(1);
    
    if (works.length === 0) {
      return null;
    }

    const work = works[0];
    return {
      id: work.id,
      uuid: work.uuid,
      userUuid: work.userUuid,
      workType: work.workType as UserWork['workType'],
      inputContent: work.inputContent,
      inputImageUrl: work.inputImageUrl || undefined,
      workResult: work.workResult,
      generationDuration: work.generationDuration || undefined,
      creditsConsumed: work.creditsConsumed,
      generationStatus: work.generationStatus as UserWork['generationStatus'],
      managementStatus: work.managementStatus as UserWork['managementStatus'] || EUserWorkManagementStatus.Active,
      isPublic: !!work.isPublic,
      likesCount: work.likesCount || 0,
      downloadsCount: work.downloadsCount || 0,
      createdAt: new Date(work.createdAt * 1000).toISOString(),
      updatedAt: new Date(work.updatedAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error getting user work by prediction ID:', error);
    return null;
  }
}

/**
 * 根据 UUID 获取用户作品
 */
export async function getUserWorkByUuid(workUuid: string, db: D1Database): Promise<UserWork | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const works = await drizzle
      .select()
      .from(userWorks)
      .where(eq(userWorks.uuid, workUuid))
      .limit(1);
    
    if (works.length === 0) {
      return null;
    }
    
    const work = works[0];
    return {
      id: work.id,
      uuid: work.uuid,
      userUuid: work.userUuid,
      workType: work.workType as UserWork['workType'],
      inputContent: work.inputContent,
      inputImageUrl: work.inputImageUrl || undefined,
      workResult: work.workResult,
      generationDuration: work.generationDuration || undefined,
      creditsConsumed: work.creditsConsumed,
      generationStatus: work.generationStatus as UserWork['generationStatus'],
      managementStatus: work.managementStatus as UserWork['managementStatus'],
      isPublic: !!work.isPublic,
      likesCount: work.likesCount || 0,
      downloadsCount: work.downloadsCount || 0,
      createdAt: new Date(work.createdAt * 1000).toISOString(),
      updatedAt: new Date(work.updatedAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error getting user work by uuid:', error);
    return null;
  }
}

/**
 * 分页查询用户作品
 */
export async function getUserWorks(params: GetUserWorksParams, db: D1Database): Promise<PaginatedUserWorks> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const {
      userUuid,
      workType,
      generationStatus,
      managementStatus = 'active',
      isPublic,
      page = 1,
      pageSize = 20,
      orderBy = 'created_at',
      order = 'desc'
    } = params;
    
    // 构建查询条件
    const conditions = [];
    
    if (userUuid) {
      conditions.push(eq(userWorks.userUuid, userUuid));
    }
    
    if (workType) {
      conditions.push(eq(userWorks.workType, workType));
    }
    
    if (generationStatus) {
      conditions.push(eq(userWorks.generationStatus, generationStatus));
    }
    
    if (managementStatus) {
      conditions.push(eq(userWorks.managementStatus, managementStatus));
    }
    
    if (isPublic !== undefined) {
      conditions.push(eq(userWorks.isPublic, isPublic));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // 构建排序
    let orderColumn;
    switch (orderBy) {
      case 'created_at':
        orderColumn = userWorks.createdAt;
        break;
      case 'updated_at':
        orderColumn = userWorks.updatedAt;
        break;
      case 'likes_count':
        orderColumn = userWorks.likesCount;
        break;
      case 'downloads_count':
        orderColumn = userWorks.downloadsCount;
        break;
      default:
        orderColumn = userWorks.createdAt;
    }
    const orderClause = order === 'asc' ? asc(orderColumn) : desc(orderColumn);
    
    // 查询总数
    const totalResult = await drizzle
      .select({ count: count() })
      .from(userWorks)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    
    // 分页查询
    const offset = (page - 1) * pageSize;
    const works = await drizzle
      .select()
      .from(userWorks)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset);
    
    const items: UserWork[] = works.map(work => ({
      id: work.id,
      uuid: work.uuid,
      userUuid: work.userUuid,
      workType: work.workType as UserWork['workType'],
      inputContent: work.inputContent,
      inputImageUrl: work.inputImageUrl || undefined,
      workResult: work.workResult,
      generationDuration: work.generationDuration || undefined,
      creditsConsumed: work.creditsConsumed,
      generationStatus: work.generationStatus as UserWork['generationStatus'],
      managementStatus: work.managementStatus as UserWork['managementStatus'],
      isPublic: !!work.isPublic,
      likesCount: work.likesCount || 0,
      downloadsCount: work.downloadsCount || 0,
      createdAt: new Date(work.createdAt * 1000).toISOString(),
      updatedAt: new Date(work.updatedAt * 1000).toISOString(),
    }));
    
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    debug('Error getting user works:', error);
    throw new Error('Failed to get user works');
  }
}

/**
 * 更新用户作品
 */
export async function updateUserWork(
  workUuid: string,
  updates: Partial<Omit<UserWork, 'uuid' | 'userUuid' | 'createdAt'>>,
  db: D1Database
): Promise<UserWork | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // 构建更新数据
    const updateData: any = {
      updatedAt: now,
    };
    
    if (updates.workType !== undefined) updateData.workType = updates.workType;
    if (updates.inputContent !== undefined) updateData.inputContent = updates.inputContent;
    if (updates.inputImageUrl !== undefined) updateData.inputImageUrl = updates.inputImageUrl;
    if (updates.workResult !== undefined) updateData.workResult = updates.workResult;
    if (updates.generationDuration !== undefined) updateData.generationDuration = updates.generationDuration;
    if (updates.creditsConsumed !== undefined) updateData.creditsConsumed = updates.creditsConsumed;
    if (updates.generationStatus !== undefined) updateData.generationStatus = updates.generationStatus;
    if (updates.managementStatus !== undefined) updateData.managementStatus = updates.managementStatus;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
    if (updates.likesCount !== undefined) updateData.likesCount = updates.likesCount;
    if (updates.downloadsCount !== undefined) updateData.downloadsCount = updates.downloadsCount;
    
    const updatedWorks = await drizzle
      .update(userWorks)
      .set(updateData)
      .where(eq(userWorks.uuid, workUuid))
      .returning();
    
    if (updatedWorks.length === 0) {
      return null;
    }
    
    const work = updatedWorks[0];
    debug('Updated user work:', work.uuid);
    
    return {
      id: work.id,
      uuid: work.uuid,
      userUuid: work.userUuid,
      workType: work.workType as UserWork['workType'],
      inputContent: work.inputContent,
      inputImageUrl: work.inputImageUrl || undefined,
      workResult: work.workResult,
      generationDuration: work.generationDuration || undefined,
      creditsConsumed: work.creditsConsumed,
      generationStatus: work.generationStatus as UserWork['generationStatus'],
      managementStatus: work.managementStatus as UserWork['managementStatus'],
      isPublic: !!work.isPublic,
      likesCount: work.likesCount || 0,
      downloadsCount: work.downloadsCount || 0,
      createdAt: new Date(work.createdAt * 1000).toISOString(),
      updatedAt: new Date(work.updatedAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error updating user work:', error);
    throw new Error('Failed to update user work');
  }
}

/**
 * 软删除用户作品（设置 managementStatus 为 'deleted'）
 */
export async function deleteUserWork(workUuid: string, db: D1Database): Promise<boolean> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const result = await drizzle
      .update(userWorks)
      .set({
        managementStatus: 'deleted',
        updatedAt: now,
      })
      .where(eq(userWorks.uuid, workUuid))
      .returning();
    
    debug('Soft deleted user work:', workUuid);
    return result.length > 0;
  } catch (error) {
    debug('Error deleting user work:', error);
    return false;
  }
}

/**
 * 硬删除用户作品（从数据库中完全删除）
 */
export async function hardDeleteUserWork(workUuid: string, db: D1Database): Promise<boolean> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const result = await drizzle
      .delete(userWorks)
      .where(eq(userWorks.uuid, workUuid))
      .returning();
    
    debug('Hard deleted user work:', workUuid);
    return result.length > 0;
  } catch (error) {
    debug('Error hard deleting user work:', error);
    return false;
  }
}

/**
 * 更新作品的点赞数
 */
export async function updateWorkLikes(workUuid: string, increment: number, db: D1Database): Promise<boolean> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const result = await drizzle
      .update(userWorks)
      .set({
        likesCount: sql`${userWorks.likesCount} + ${increment}`,
        updatedAt: now,
      })
      .where(eq(userWorks.uuid, workUuid))
      .returning();
    
    debug('Updated work likes:', workUuid, 'increment:', increment);
    return result.length > 0;
  } catch (error) {
    debug('Error updating work likes:', error);
    return false;
  }
}

/**
 * 更新作品的下载数
 */
export async function updateWorkDownloads(workUuid: string, increment: number, db: D1Database): Promise<boolean> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const result = await drizzle
      .update(userWorks)
      .set({
        downloadsCount: sql`${userWorks.downloadsCount} + ${increment}`,
        updatedAt: now,
      })
      .where(eq(userWorks.uuid, workUuid))
      .returning();
    
    debug('Updated work downloads:', workUuid, 'increment:', increment);
    return result.length > 0;
  } catch (error) {
    debug('Error updating work downloads:', error);
    return false;
  }
}

/**
 * 获取用户作品统计信息
 */
export async function getUserWorkStats(userUuid: string, db: D1Database): Promise<UserWorkStats> {
  const drizzle = createDrizzleClient(db);
  
  try {
    // 基础统计
    const basicStats = await drizzle
      .select({
        totalWorks: count(),
        totalCreditsConsumed: sql<number>`sum(${userWorks.creditsConsumed})`,
        totalLikes: sql<number>`sum(${userWorks.likesCount})`,
        totalDownloads: sql<number>`sum(${userWorks.downloadsCount})`,
      })
      .from(userWorks)
      .where(and(
        eq(userWorks.userUuid, userUuid),
        eq(userWorks.managementStatus, 'active')
      ));
    
    // 按状态统计
    const statusStats = await drizzle
      .select({
        generationStatus: userWorks.generationStatus,
        count: count(),
      })
      .from(userWorks)
      .where(and(
        eq(userWorks.userUuid, userUuid),
        eq(userWorks.managementStatus, 'active')
      ))
      .groupBy(userWorks.generationStatus);
    
    // 按类型统计
    const typeStats = await drizzle
      .select({
        workType: userWorks.workType,
        count: count(),
      })
      .from(userWorks)
      .where(and(
        eq(userWorks.userUuid, userUuid),
        eq(userWorks.managementStatus, 'active')
      ))
      .groupBy(userWorks.workType);
    
    const basic = basicStats[0] || {
      totalWorks: 0,
      totalCreditsConsumed: 0,
      totalLikes: 0,
      totalDownloads: 0,
    };
    
    // 处理状态统计
    const statusMap = statusStats.reduce((acc, item) => {
      acc[item.generationStatus] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    // 处理类型统计
    const typeMap = typeStats.reduce((acc, item) => {
      acc[item.workType] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalWorks: basic.totalWorks,
      completedWorks: statusMap['completed'] || 0,
      failedWorks: statusMap['failed'] || 0,
      generatingWorks: statusMap['generating'] || 0,
      totalCreditsConsumed: basic.totalCreditsConsumed || 0,
      totalLikes: basic.totalLikes || 0,
      totalDownloads: basic.totalDownloads || 0,
      worksByType: {
        text_to_text: typeMap['text_to_text'] || 0,
        text_to_image: typeMap['text_to_image'] || 0,
        image_to_image: typeMap['image_to_image'] || 0,
      },
    };
  } catch (error) {
    debug('Error getting user work stats:', error);
    throw new Error('Failed to get user work stats');
  }
}

/**
 * 批量更新作品状态
 */
export async function batchUpdateWorkStatus(
  workUuids: string[],
  status: 'generating' | 'completed' | 'failed',
  db: D1Database
): Promise<number> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const now = Math.floor(Date.now() / 1000);
    
    const result = await drizzle
      .update(userWorks)
      .set({
        generationStatus: status,
        updatedAt: now,
      })
      .where(sql`${userWorks.uuid} IN (${workUuids.map(uuid => `'${uuid}'`).join(',')})`)
      .returning();
    
    debug('Batch updated work status:', workUuids.length, 'works to', status);
    return result.length;
  } catch (error) {
    debug('Error batch updating work status:', error);
    return 0;
  }
}
