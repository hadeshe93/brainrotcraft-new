/**
 * Comments Service
 * Database operations for game comments
 */

import { eq, desc, asc, and, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { comments } from '@/db/schema';
import { nanoid } from 'nanoid';

export interface CreateCommentInput {
  gameUuid: string;
  userUuid?: string | null;
  content: string;
  status?: 'pending' | 'approved' | 'rejected';
  isAiGenerated?: boolean;
  // Anonymous comment fields
  anonymousName?: string | null;
  anonymousEmail?: string | null;
  source?: 'user' | 'anonymous' | 'ai' | 'admin';
  ipAddress?: string | null;
}

export interface UpdateCommentInput {
  content?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ListCommentsOptions {
  gameUuid?: string;
  userUuid?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isAiGenerated?: boolean;
  orderBy?: 'created_at';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new comment
 */
export async function createComment(input: CreateCommentInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const newComment = {
    uuid: nanoid(),
    gameUuid: input.gameUuid,
    userUuid: input.userUuid || null,
    content: input.content,
    status: input.status || 'pending',
    isAiGenerated: input.isAiGenerated || false,
    anonymousName: input.anonymousName || null,
    anonymousEmail: input.anonymousEmail || null,
    source: input.source || 'anonymous',
    ipAddress: input.ipAddress || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(comments).values(newComment);

  return newComment;
}

/**
 * Batch create comments (for AI generation)
 */
export async function batchCreateComments(inputs: CreateCommentInput[], db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const newComments = inputs.map((input) => ({
    uuid: nanoid(),
    gameUuid: input.gameUuid,
    userUuid: input.userUuid || null,
    content: input.content,
    status: input.status || 'pending',
    isAiGenerated: input.isAiGenerated || false,
    anonymousName: input.anonymousName || null,
    anonymousEmail: input.anonymousEmail || null,
    source: input.source || 'anonymous',
    ipAddress: input.ipAddress || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));

  await client.insert(comments).values(newComments);

  return newComments;
}

/**
 * Get comment by UUID
 */
export async function getCommentByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(comments.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(comments.deletedAt));
  }

  const result = await client
    .select()
    .from(comments)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * List comments with pagination and filtering
 */
export async function listComments(options: ListCommentsOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const {
    gameUuid,
    userUuid,
    status,
    isAiGenerated,
    orderBy = 'created_at',
    orderDirection = 'desc',
    page = 1,
    pageSize = 20,
  } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(comments.deletedAt)];

  if (gameUuid) {
    conditions.push(eq(comments.gameUuid, gameUuid));
  }

  if (userUuid) {
    conditions.push(eq(comments.userUuid, userUuid));
  }

  if (status) {
    conditions.push(eq(comments.status, status));
  }

  if (isAiGenerated !== undefined) {
    conditions.push(eq(comments.isAiGenerated, isAiGenerated));
  }

  // Build order by
  const orderFn = orderDirection === 'asc' ? asc : desc;
  const orderByClause = orderFn(comments.createdAt);

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get approved comments for a game (public view)
 */
export async function getApprovedComments(gameUuid: string, page: number = 1, pageSize: number = 20, db: D1Database) {
  return listComments(
    {
      gameUuid,
      status: 'approved',
      page,
      pageSize,
      orderBy: 'created_at',
      orderDirection: 'desc',
    },
    db,
  );
}

/**
 * Update comment by UUID
 */
export async function updateComment(uuid: string, input: UpdateCommentInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const updateData: any = {
    ...input,
    updatedAt: now,
  };

  await client
    .update(comments)
    .set(updateData)
    .where(and(eq(comments.uuid, uuid), isNull(comments.deletedAt)));

  return getCommentByUuid(uuid, db);
}

/**
 * Approve comment
 */
export async function approveComment(uuid: string, db: D1Database) {
  return updateComment(uuid, { status: 'approved' }, db);
}

/**
 * Reject comment
 */
export async function rejectComment(uuid: string, db: D1Database) {
  return updateComment(uuid, { status: 'rejected' }, db);
}

/**
 * Batch approve comments
 */
export async function batchApproveComments(uuids: string[], db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  for (const uuid of uuids) {
    await client
      .update(comments)
      .set({ status: 'approved', updatedAt: now })
      .where(and(eq(comments.uuid, uuid), isNull(comments.deletedAt)));
  }

  return true;
}

/**
 * Batch reject comments
 */
export async function batchRejectComments(uuids: string[], db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  for (const uuid of uuids) {
    await client
      .update(comments)
      .set({ status: 'rejected', updatedAt: now })
      .where(and(eq(comments.uuid, uuid), isNull(comments.deletedAt)));
  }

  return true;
}

/**
 * Soft delete comment by UUID
 */
export async function deleteComment(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(comments)
    .set({ deletedAt: now })
    .where(and(eq(comments.uuid, uuid), isNull(comments.deletedAt)));

  return true;
}

/**
 * Get comment count for a game
 */
export async function getGameCommentCount(gameUuid: string, db: D1Database, approvedOnly: boolean = true) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(comments.gameUuid, gameUuid), isNull(comments.deletedAt)];

  if (approvedOnly) {
    conditions.push(eq(comments.status, 'approved'));
  }

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Get pending comments count (for admin dashboard)
 */
export async function getPendingCommentsCount(db: D1Database) {
  const client = createDrizzleClient(db);

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(and(eq(comments.status, 'pending'), isNull(comments.deletedAt)));

  return result[0]?.count ?? 0;
}
