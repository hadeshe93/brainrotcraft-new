import { User } from "@/types/user";
import { users, userWorks } from "@/db/schema";
import { createDrizzleClient } from "@/db/client";
import { eq, and, desc, count } from "drizzle-orm";
import { debug } from "@/lib/debug";
import { uuid } from "@/lib/uuid";

export interface UserProfile extends User {
  worksCount: number;
  followersCount: number; // 暂时为 0，后续可扩展
  accountStatus?: 'active' | 'suspended' | 'deleted';
}

export interface UserWork {
  uuid: string;
  workType: 'text_to_text' | 'text_to_image' | 'image_to_image';
  inputContent: string;
  inputImageUrl?: string;
  workResult: string;
  creditsConsumed: number;
  generationStatus: 'generating' | 'completed' | 'failed';
  isPublic: boolean;
  likesCount: number;
  downloadsCount: number;
  createdAt: string;
}

export interface PaginatedWorks {
  works: UserWork[];
  hasMore: boolean;
  total: number;
}

// 在API路由中使用的版本
export async function getUserProfileByUuid(userUuid: string, db: D1Database): Promise<UserProfile | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    // 获取用户基本信息
    const existingUsers = await drizzle
      .select()
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);
    
    if (existingUsers.length === 0) {
      return null;
    }
    
    const user = existingUsers[0];
    
    // 获取作品数量统计
    const worksCountResult = await drizzle
      .select({ count: count() })
      .from(userWorks)
      .where(
        and(
          eq(userWorks.userUuid, userUuid),
          eq(userWorks.managementStatus, 'active'),
          eq(userWorks.generationStatus, 'completed')
        )
      );
    
    const worksCount = worksCountResult[0]?.count || 0;
    
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      account_provider: user.accountProvider || undefined,
      provider_account_id: user.providerAccountId || undefined,
      created_at: new Date(user.createdAt * 1000).toISOString(),
      worksCount,
      followersCount: 0, // 暂时硬编码为0，后续可扩展关注功能
      accountStatus: user.accountStatus as 'active' | 'suspended' | 'deleted' | undefined,
    };
  } catch (error) {
    debug('Error in getUserProfileByUuid:', error);
    return null;
  }
}

// 获取用户作品列表（分页）
export async function getUserWorksPaginated(
  userUuid: string, 
  page: number = 1, 
  limit: number = 20,
  db: D1Database
): Promise<PaginatedWorks> {
  const drizzle = createDrizzleClient(db);
  const offset = (page - 1) * limit;
  
  try {
    // 获取总数
    const totalResult = await drizzle
      .select({ count: count() })
      .from(userWorks)
      .where(
        and(
          eq(userWorks.userUuid, userUuid),
          eq(userWorks.managementStatus, 'active'),
          eq(userWorks.generationStatus, 'completed')
        )
      );
    
    const total = totalResult[0]?.count || 0;
    
    // 获取分页作品
    const worksData = await drizzle
      .select({
        uuid: userWorks.uuid,
        workType: userWorks.workType,
        inputContent: userWorks.inputContent,
        inputImageUrl: userWorks.inputImageUrl,
        workResult: userWorks.workResult,
        creditsConsumed: userWorks.creditsConsumed,
        generationStatus: userWorks.generationStatus,
        isPublic: userWorks.isPublic,
        likesCount: userWorks.likesCount,
        downloadsCount: userWorks.downloadsCount,
        createdAt: userWorks.createdAt,
      })
      .from(userWorks)
      .where(
        and(
          eq(userWorks.userUuid, userUuid),
          eq(userWorks.managementStatus, 'active'),
          eq(userWorks.generationStatus, 'completed')
        )
      )
      .orderBy(desc(userWorks.createdAt))
      .limit(limit)
      .offset(offset);
    
    const works: UserWork[] = worksData.map(work => ({
      uuid: work.uuid,
      workType: work.workType as 'text_to_text' | 'text_to_image' | 'image_to_image',
      inputContent: work.inputContent,
      inputImageUrl: work.inputImageUrl || undefined,
      workResult: work.workResult,
      creditsConsumed: work.creditsConsumed,
      generationStatus: work.generationStatus as 'generating' | 'completed' | 'failed',
      isPublic: !!work.isPublic,
      likesCount: work.likesCount || 0,
      downloadsCount: work.downloadsCount || 0,
      createdAt: new Date(work.createdAt * 1000).toISOString(),
    }));
    
    return {
      works,
      hasMore: offset + limit < total,
      total,
    };
  } catch (error) {
    debug('Error in getUserWorksPaginated:', error);
    return {
      works: [],
      hasMore: false,
      total: 0,
    };
  }
}

// 通过邮箱和密码获取用户（用于登录）
export async function getUserByEmailAndPassword(email: string, password: string, db: D1Database): Promise<User | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const existingUsers = await drizzle
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.accountProvider, 'email')
        )
      )
      .limit(1);
    
    if (existingUsers.length === 0) {
      return null;
    }
    
    const user = existingUsers[0];
    
    // 验证密码
    if (!user.password || !(await verifyPassword(password, user.password))) {
      return null;
    }
    
    return {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      account_provider: user.accountProvider || undefined,
      provider_account_id: user.providerAccountId || undefined,
      created_at: new Date(user.createdAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error in getUserByEmailAndPassword:', error);
    return null;
  }
}

export async function upsertUser(user: User, db: D1Database): Promise<User> {
  const drizzle = createDrizzleClient(db);
  
  try {
    // 如果用户有email和account_provider，先尝试查找现有用户
    let existingUser = null;
    
    if (user.email) {
      // 优先通过邮箱查找
      const existingUsers = await drizzle
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      
      if (existingUsers.length > 0) {
        existingUser = existingUsers[0];
      }
    }
    
    // 如果通过第三方登录，也检查provider信息
    if (!existingUser && user.account_provider && user.provider_account_id) {
      const existingProviderUsers = await drizzle
        .select()
        .from(users)
        .where(
          and(
            eq(users.accountProvider, user.account_provider),
            eq(users.providerAccountId, user.provider_account_id)
          )
        )
        .limit(1);
      
      if (existingProviderUsers.length > 0) {
        existingUser = existingProviderUsers[0];
      }
    }
    
    const now = Math.floor(Date.now() / 1000); // 秒级时间戳
    
    // 处理密码哈希
    let hashedPassword: string | null = null;
    if (user.password) {
      hashedPassword = await hashPassword(user.password);
    }
    
    if (existingUser) {
      // 更新现有用户
      const updateData: any = {
        nickname: user.nickname || existingUser.nickname,
        avatar: user.avatar || existingUser.avatar,
        accountProvider: user.account_provider || existingUser.accountProvider,
        providerAccountId: user.provider_account_id || existingUser.providerAccountId,
        updatedAt: now,
      };
      
      // 如果提供了新密码，则更新密码
      if (hashedPassword) {
        updateData.password = hashedPassword;
      }
      
      const updatedUsers = await drizzle
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .returning();
      
      const updatedUser = updatedUsers[0];
      return {
        id: updatedUser.id,
        uuid: updatedUser.uuid,
        email: updatedUser.email,
        nickname: updatedUser.nickname || '',
        avatar: updatedUser.avatar || '',
        account_provider: updatedUser.accountProvider || undefined,
        provider_account_id: updatedUser.providerAccountId || undefined,
        created_at: new Date(updatedUser.createdAt * 1000).toISOString(),
      };
    } else {
      // 创建新用户
      const newUuid = uuid();
      
      // 确定账号类型
      let accountProvider: string;
      if (user.account_provider) {
        accountProvider = user.account_provider;
      } else if (user.password) {
        accountProvider = 'email';
      } else {
        throw new Error('User must have either account_provider or password');
      }
      
      const newUsers = await drizzle
        .insert(users)
        .values({
          uuid: newUuid,
          email: user.email,
          nickname: user.nickname || '',
          avatar: user.avatar || '',
          password: hashedPassword, // 第三方登录为 null，邮箱注册为哈希密码
          accountProvider: accountProvider || null,
          providerAccountId: user.provider_account_id || null,
          ipAddress: null, // 可以在调用时传入
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      const newUser = newUsers[0];
      return {
        id: newUser.id,
        uuid: newUser.uuid,
        email: newUser.email,
        nickname: newUser.nickname || '',
        avatar: newUser.avatar || '',
        account_provider: newUser.accountProvider || undefined,
        provider_account_id: newUser.providerAccountId || undefined,
        created_at: new Date(newUser.createdAt * 1000).toISOString(),
      };
    }
  } catch (error) {
    debug('Error in upsertUser:', error);
    throw new Error('Failed to upsert user');
  }
}

// 验证密码
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hashedPassword;
}

// 简单的密码哈希函数，在生产环境中应该使用 bcrypt
async function hashPassword(password: string): Promise<string> {
  // 使用 Web Crypto API 进行密码哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt'); // 在生产环境中应该使用随机盐
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}