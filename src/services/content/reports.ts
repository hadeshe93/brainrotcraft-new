/**
 * Reports Service
 * Database operations for game reports (user feedback on broken games, etc.)
 */

import { eq, desc, and, isNull, sql, SQL } from 'drizzle-orm';
import { createDrizzleClient } from '@/db/client';
import { reports } from '@/db/schema';
import { nanoid } from 'nanoid';

export interface CreateReportInput {
  gameUuid: string;
  reportType: string;
  userName: string;
  userEmail: string;
  content: string;
  userUuid?: string | null;
  status?: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  ipAddress?: string | null;
}

export interface ListReportsOptions {
  gameUuid?: string;
  userUuid?: string;
  orderBy?: 'created_at';
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new report
 */
export async function createReport(input: CreateReportInput, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  const newReport = {
    uuid: nanoid(),
    gameUuid: input.gameUuid,
    reportType: input.reportType,
    userName: input.userName,
    userEmail: input.userEmail,
    content: input.content,
    userUuid: input.userUuid || null,
    status: input.status || 'pending',
    ipAddress: input.ipAddress || null,
    adminNote: null,
    processedAt: null,
    processedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await client.insert(reports).values(newReport);

  return newReport;
}

/**
 * Get report by UUID
 */
export async function getReportByUuid(uuid: string, db: D1Database, includeDeleted: boolean = false) {
  const client = createDrizzleClient(db);

  const conditions: SQL[] = [eq(reports.uuid, uuid)];
  if (!includeDeleted) {
    conditions.push(isNull(reports.deletedAt));
  }

  const result = await client
    .select()
    .from(reports)
    .where(and(...conditions))
    .limit(1);

  return result[0] || null;
}

/**
 * List reports with pagination and filtering
 */
export async function listReports(options: ListReportsOptions, db: D1Database) {
  const client = createDrizzleClient(db);

  const { gameUuid, userUuid, orderBy = 'created_at', orderDirection = 'desc', page = 1, pageSize = 20 } = options;

  // Build where conditions
  const conditions: SQL[] = [isNull(reports.deletedAt)];

  if (gameUuid) {
    conditions.push(eq(reports.gameUuid, gameUuid));
  }

  if (userUuid) {
    conditions.push(eq(reports.userUuid, userUuid));
  }

  // Build order by
  const orderFn = orderDirection === 'asc' ? desc : desc; // Always desc for now
  const orderByClause = orderFn(reports.createdAt);

  // Get total count
  const countResult = await client
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(and(...conditions));

  const total = countResult[0]?.count ?? 0;

  // Get paginated results
  const offset = (page - 1) * pageSize;
  const results = await client
    .select()
    .from(reports)
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
 * Get reports for a specific game
 */
export async function getGameReports(gameUuid: string, page: number = 1, pageSize: number = 20, db: D1Database) {
  return listReports(
    {
      gameUuid,
      page,
      pageSize,
      orderBy: 'created_at',
      orderDirection: 'desc',
    },
    db,
  );
}

/**
 * Soft delete report by UUID
 */
export async function deleteReport(uuid: string, db: D1Database) {
  const client = createDrizzleClient(db);
  const now = Math.floor(Date.now() / 1000);

  await client
    .update(reports)
    .set({ deletedAt: now })
    .where(and(eq(reports.uuid, uuid), isNull(reports.deletedAt)));

  return true;
}

/**
 * Get report count for a game
 */
export async function getGameReportCount(gameUuid: string, db: D1Database) {
  const client = createDrizzleClient(db);

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(and(eq(reports.gameUuid, gameUuid), isNull(reports.deletedAt)));

  return result[0]?.count ?? 0;
}

/**
 * Get total reports count (for admin dashboard)
 */
export async function getTotalReportsCount(db: D1Database) {
  const client = createDrizzleClient(db);

  const result = await client
    .select({ count: sql<number>`count(*)` })
    .from(reports)
    .where(isNull(reports.deletedAt));

  return result[0]?.count ?? 0;
}
