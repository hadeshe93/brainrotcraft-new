/**
 * Translation Task Service
 * Manages translation tasks for batch translation operations
 */

import { nanoid } from 'nanoid';

export type TranslationTaskType = 'full' | 'supplement';
export type TranslationTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TranslationTaskProgress {
  games: { done: number; total: number };
  categories: { done: number; total: number };
  tags: { done: number; total: number };
  featured: { done: number; total: number };
}

export interface TranslationTask {
  id: number;
  uuid: string;
  languageCode: string;
  type: TranslationTaskType;
  status: TranslationTaskStatus;
  progress: TranslationTaskProgress;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface CreateTranslationTaskInput {
  languageCode: string;
  type: TranslationTaskType;
  estimatedProgress: TranslationTaskProgress;
}

export interface UpdateTranslationTaskInput {
  status?: TranslationTaskStatus;
  progress?: Partial<TranslationTaskProgress>;
  error?: string | null;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Create a new translation task
 */
export async function createTranslationTask(
  input: CreateTranslationTaskInput,
  db: D1Database,
): Promise<TranslationTask> {
  const uuid = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO translation_tasks
       (uuid, language_code, type, status, progress, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(uuid, input.languageCode, input.type, 'pending', JSON.stringify(input.estimatedProgress), now)
    .run();

  const result = await db.prepare('SELECT * FROM translation_tasks WHERE uuid = ?').bind(uuid).first<TranslationTask>();

  if (!result) {
    throw new Error('Failed to create translation task');
  }

  // Parse JSON progress
  return {
    ...result,
    progress: typeof result.progress === 'string' ? JSON.parse(result.progress) : result.progress,
  };
}

/**
 * Get all translation tasks (sorted by creation date descending)
 */
export async function getAllTranslationTasks(
  options: {
    languageCode?: string;
    status?: TranslationTaskStatus;
    limit?: number;
    offset?: number;
  } = {},
  db: D1Database,
): Promise<TranslationTask[]> {
  let query = 'SELECT * FROM translation_tasks WHERE 1=1';
  const params: (string | number)[] = [];

  if (options.languageCode) {
    query += ' AND language_code = ?';
    params.push(options.languageCode);
  }

  if (options.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<TranslationTask>();

  // Parse JSON progress for each task
  return (result.results || []).map((task) => ({
    ...task,
    progress: typeof task.progress === 'string' ? JSON.parse(task.progress) : task.progress,
  }));
}

/**
 * Get a translation task by UUID
 */
export async function getTranslationTaskByUuid(uuid: string, db: D1Database): Promise<TranslationTask | null> {
  const result = await db.prepare('SELECT * FROM translation_tasks WHERE uuid = ?').bind(uuid).first<TranslationTask>();

  if (!result) {
    return null;
  }

  return {
    ...result,
    progress: typeof result.progress === 'string' ? JSON.parse(result.progress) : result.progress,
  };
}

/**
 * Update a translation task
 */
export async function updateTranslationTask(
  uuid: string,
  input: UpdateTranslationTaskInput,
  db: D1Database,
): Promise<TranslationTask> {
  const currentTask = await getTranslationTaskByUuid(uuid, db);

  if (!currentTask) {
    throw new Error('Translation task not found');
  }

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }

  if (input.progress !== undefined) {
    const newProgress = { ...currentTask.progress, ...input.progress };
    updates.push('progress = ?');
    params.push(JSON.stringify(newProgress));
  }

  if (input.error !== undefined) {
    updates.push('error = ?');
    params.push(input.error);
  }

  if (input.startedAt !== undefined) {
    updates.push('started_at = ?');
    params.push(input.startedAt);
  }

  if (input.completedAt !== undefined) {
    updates.push('completed_at = ?');
    params.push(input.completedAt);
  }

  if (updates.length === 0) {
    return currentTask;
  }

  const query = `UPDATE translation_tasks SET ${updates.join(', ')} WHERE uuid = ?`;
  params.push(uuid);

  await db
    .prepare(query)
    .bind(...params)
    .run();

  const updated = await getTranslationTaskByUuid(uuid, db);
  if (!updated) {
    throw new Error('Failed to update translation task');
  }

  return updated;
}

/**
 * Cancel a translation task (only if pending or running)
 */
export async function cancelTranslationTask(uuid: string, db: D1Database): Promise<TranslationTask> {
  const task = await getTranslationTaskByUuid(uuid, db);

  if (!task) {
    throw new Error('Translation task not found');
  }

  if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
    throw new Error(`Cannot cancel task with status: ${task.status}`);
  }

  return await updateTranslationTask(
    uuid,
    {
      status: 'cancelled',
      completedAt: Math.floor(Date.now() / 1000),
    },
    db,
  );
}

/**
 * Get task statistics
 */
export async function getTranslationTaskStats(db: D1Database): Promise<{
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}> {
  const result = await db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM translation_tasks`,
    )
    .first<{
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    }>();

  return (
    result || {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }
  );
}
