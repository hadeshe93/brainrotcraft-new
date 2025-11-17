/**
 * Translation Service Types
 * Types for AI-powered translation system
 */

export type TranslationTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TranslationTaskFields {
  // Fields to translate
  name?: string;
  description?: string;
  metadataTitle?: string;
  metadataDescription?: string;
  [key: string]: string | undefined;
}

export interface TranslationTaskResult {
  // Translated fields
  [key: string]: string;
}

export interface TranslationTask {
  uuid: string;
  contentType: 'category' | 'tag' | 'featured' | 'game';
  contentUuid: string;
  contentName?: string; // For display purposes
  targetLocale: string;
  status: TranslationTaskStatus;
  fields: TranslationTaskFields | null;
  result: TranslationTaskResult | null;
  error: string | null;
  cost: number | null; // Cost in USD
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface CreateTranslationTaskInput {
  contentType: 'category' | 'tag' | 'featured' | 'game';
  contentUuid: string;
  targetLocale: string;
  fields: TranslationTaskFields;
}

export interface TranslationTaskListOptions {
  contentType?: 'category' | 'tag' | 'featured' | 'game';
  status?: TranslationTaskStatus;
  targetLocale?: string;
  page?: number;
  pageSize?: number;
}

export interface TranslationTaskListResponse {
  tasks: TranslationTask[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchTranslationRequest {
  contentType: 'category' | 'tag' | 'featured' | 'game';
  contentUuids: string[];
  targetLocales: string[];
  fields: string[]; // Field names to translate
}

export interface BatchTranslationResponse {
  created: number;
  skipped: number;
  tasks: TranslationTask[];
}

export interface TranslationServiceOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TranslateRequest {
  texts: Record<string, string>; // field name -> text to translate
  sourceLocale: string;
  targetLocale: string;
  context?: string; // Additional context for better translation
}

export interface TranslateResponse {
  translations: Record<string, string>; // field name -> translated text
  cost: number; // Cost in USD
  tokensUsed: number;
}
