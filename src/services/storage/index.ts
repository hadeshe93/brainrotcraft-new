/**
 * 实现一个操作 Cloudflare R2 的类
 * - 包括：上传、删除方法
 * - 所有方法的入参都收敛到一个对象中，注意优先定义方法的签名和参数类型，然后再实现
 * - 上传方法的入参中，需要包含文件存储的路径和文件本身，函数返回存储成功的路径
 */
import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { DOMAIN as DOMAIN_READ_STORAGE } from '@/constants/config';
import { EAppEnv } from '@/types/base/env';

// 上传参数接口
export interface UploadParams {
  /** 文件存储路径（不包含文件名） */
  path: string;
  /** 文件名 */
  fileName: string;
  /** 文件内容 */
  file: File | Blob | ArrayBuffer | ReadableStream | string;
  /** 可选的元数据 */
  metadata?: Record<string, string>;
  /** 可选的 HTTP 元数据 */
  httpMetadata?: R2HTTPMetadata;
  /** 可选的缓存控制 */
  cacheControl?: string;
  /** 内容类型，如果不提供将自动推断 */
  contentType?: string;
}

// 删除参数接口
export interface DeleteParams {
  /** 要删除的文件路径 */
  filePath: string;
}

// 批量删除参数接口
export interface BatchDeleteParams {
  /** 要删除的文件路径数组 */
  filePaths: string[];
}

// 获取文件参数接口
export interface GetFileParams {
  /** 文件路径 */
  filePath: string;
  /** 可选的范围请求 */
  range?: R2Range;
}

// 列出文件参数接口
export interface ListFilesParams {
  /** 路径前缀 */
  prefix?: string;
  /** 分隔符 */
  delimiter?: string;
  /** 限制数量 */
  limit?: number;
  /** 游标（用于分页） */
  cursor?: string;
  /** 开始位置 */
  startAfter?: string;
  /** 是否包含元数据 */
  include?: ('httpMetadata' | 'customMetadata')[];
}

// 上传结果接口
export interface UploadResult {
  /** 成功上传的文件路径 */
  filePath: string;
  /** 文件的 ETag */
  etag: string;
  /** 文件大小 */
  size: number;
  /** 上传时间 */
  uploaded: Date;
  /** 存储类别 */
  storageClass: string;
  /** 版本号 */
  version: string;
}

// 文件信息接口
export interface FileInfo {
  /** 文件路径 */
  key: string;
  /** ETag */
  etag: string;
  /** 文件大小 */
  size: number;
  /** 上传时间 */
  uploaded: Date;
  /** HTTP 元数据 */
  httpMetadata?: R2HTTPMetadata;
  /** 自定义元数据 */
  customMetadata?: Record<string, string>;
  /** 存储类别 */
  storageClass: string;
  /** 版本号 */
  version: string;
}

// 列出文件结果接口
export interface ListFilesResult {
  /** 文件列表 */
  objects: FileInfo[];
  /** 目录前缀列表 */
  delimitedPrefixes: string[];
  /** 是否被截断 */
  truncated: boolean;
  /** 下一页游标 */
  cursor?: string;
}

// 存储错误类
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Cloudflare R2 存储服务类
 */
export class R2Storage {
  private bucket: R2Bucket | null = null;

  constructor() {
    // 构造函数保持简单，R2Bucket 在需要时获取
  }

  /**
   * 获取 R2 存储桶实例
   */
  private async getBucket(): Promise<R2Bucket> {
    if (this.bucket) {
      return this.bucket;
    }

    try {
      const env = await getCloudflareEnv();
      if (!env.R2) {
        throw new StorageError(
          'R2 binding not found. Please check your wrangler.jsonc configuration.',
          'R2_BINDING_NOT_FOUND'
        );
      }
      this.bucket = env.R2;
      return this.bucket;
    } catch (error) {
      throw new StorageError(
        'Failed to get Cloudflare context or R2 binding',
        'CONTEXT_ERROR',
        500
      );
    }
  }

  /**
   * 构造完整的文件路径
   */
  private buildFilePath(path: string, fileName: string): string {
    // 清理路径，确保没有重复的斜杠
    const cleanPath = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    const cleanFileName = fileName.replace(/^\/+/, '');
    
    return cleanPath ? `${cleanPath}/${cleanFileName}` : cleanFileName;
  }

  /**
   * 根据文件名推断内容类型
   */
  private inferContentType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // 图片
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      // 文档
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // 文本
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      // 视频
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      // 音频
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      // 压缩文件
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * 上传文件到 R2
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    try {
      const bucket = await this.getBucket();
      const filePath = this.buildFilePath(params.path, params.fileName);
      
      // 准备上传选项
      const putOptions: R2PutOptions = {
        httpMetadata: {
          contentType: params.contentType || this.inferContentType(params.fileName),
          cacheControl: params.cacheControl || 'public, max-age=31536000',
          ...params.httpMetadata,
        },
        customMetadata: params.metadata,
      };

      // 执行上传
      const result = await bucket.put(filePath, params.file, putOptions);

      if (!result) {
        throw new StorageError(
          'Upload failed: R2 put operation returned null',
          'UPLOAD_FAILED'
        );
      }

      return {
        filePath,
        etag: result.etag,
        size: result.size,
        uploaded: result.uploaded,
        storageClass: result.storageClass,
        version: result.version,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_ERROR'
      );
    }
  }

  /**
   * 删除单个文件
   */
  async delete(params: DeleteParams): Promise<boolean> {
    try {
      const bucket = await this.getBucket();
      await bucket.delete(params.filePath);
      return true;
    } catch (error) {
      throw new StorageError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR'
      );
    }
  }

  /**
   * 批量删除文件
   */
     async batchDelete(params: BatchDeleteParams): Promise<number> {
     try {
       const bucket = await this.getBucket();
       await bucket.delete(params.filePaths);
       return params.filePaths.length;
    } catch (error) {
      throw new StorageError(
        `Batch delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_DELETE_ERROR'
      );
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(params: GetFileParams): Promise<FileInfo | null> {
    try {
      const bucket = await this.getBucket();
      const result = await bucket.head(params.filePath);

      if (!result) {
        return null;
      }

      return {
        key: result.key,
        etag: result.etag,
        size: result.size,
        uploaded: result.uploaded,
        httpMetadata: result.httpMetadata,
        customMetadata: result.customMetadata,
        storageClass: result.storageClass,
        version: result.version,
      };
    } catch (error) {
      throw new StorageError(
        `Get file info failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_INFO_ERROR'
      );
    }
  }

  /**
   * 获取文件内容
   */
  async getFile(params: GetFileParams): Promise<R2ObjectBody | null> {
    try {
      const bucket = await this.getBucket();
      const result = await bucket.get(params.filePath, {
        range: params.range,
      });

      return result;
    } catch (error) {
      throw new StorageError(
        `Get file failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_FILE_ERROR'
      );
    }
  }

  /**
   * 列出文件
   */
  async listFiles(params: ListFilesParams = {}): Promise<ListFilesResult> {
    try {
      const bucket = await this.getBucket();
      const result = await bucket.list({
        prefix: params.prefix,
        delimiter: params.delimiter,
        limit: params.limit,
        cursor: params.cursor,
        startAfter: params.startAfter,
        include: params.include,
      });

      const objects: FileInfo[] = result.objects.map(obj => ({
        key: obj.key,
        etag: obj.etag,
        size: obj.size,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
        storageClass: obj.storageClass,
        version: obj.version,
      }));

      return {
        objects,
        delimitedPrefixes: result.delimitedPrefixes,
        truncated: result.truncated,
        cursor: result.truncated ? result.cursor : undefined,
      };
    } catch (error) {
      throw new StorageError(
        `List files failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_ERROR'
      );
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const info = await this.getFileInfo({ filePath });
      return info !== null;
    } catch (error) {
      // 如果是获取信息错误，返回 false
      if (error instanceof StorageError && error.code === 'GET_INFO_ERROR') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件的公开访问 URL
   * 注意：这需要您的 R2 存储桶配置为公开访问
   */
  generatePublicUrl(filePath: string, domainRaw = DOMAIN_READ_STORAGE, needOrigin = false): string {
    const fullPath = `/api/storage/${filePath}`;
    if (!needOrigin) return fullPath;
    const isDevEnv = process.env.NEXT_PUBLIC_RUNTIME_ENV === EAppEnv.development;
    if (isDevEnv) return `${process.env.REPLICATE_LOCAL_WEBHOOK_ORIGIN}${fullPath}`;
    return `https://${domainRaw}${fullPath}`;
  }

  /**
   * 获取透明图片的公开访问 URL
   * 注意：这需要您的 R2 存储桶配置为公开访问
   */
  generateTransparentImageUrl(options: GenerateTransparentImageUrlOptions): string {
    const { filePath, rawName, domainRaw = DOMAIN_READ_STORAGE, needOrigin = false } = options;
    const filePathSegs = filePath.split('.');
    const rawExt = filePathSegs.pop();
    const rawNameSegment = rawName ? `&raw_name=${rawName}` : '';
    const latestFilePath = `${filePathSegs.join('.')}.png?raw_ext=${rawExt}${rawNameSegment}`;
    const fullPath = `/api/transparent-img/${latestFilePath}`;
    if (!needOrigin) return fullPath;
    return `https://${domainRaw}${fullPath}`;
  }

  /**
   * 生成预签名 URL 用于临时访问（如果支持的话）
   * 注意：目前 R2 不支持预签名 URL，这里作为预留接口
   */
  generatePresignedUrl(filePath: string, expiresIn: number = 3600): string {
    // 这是一个预留接口，当 Cloudflare R2 支持预签名 URL 时可以实现
    throw new StorageError(
      'Presigned URLs are not supported by Cloudflare R2 yet',
      'NOT_SUPPORTED'
    );
  }

  async checkWriteAuth(request: NextRequest): Promise<Response | undefined> {
    const env = await getCloudflareEnv();
    const token = request.headers.get('x-r2-write-token');
    if (token !== env.CLOUDFLARE_R2_WRITE_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

export interface GenerateTransparentImageUrlOptions {
  filePath: string;
  rawName?: string;
  domainRaw?: string;
  needOrigin?: boolean;
}

// 创建默认的存储实例
export const storage = new R2Storage();

// 便捷的导出方法
export const uploadFile = (params: UploadParams) => storage.upload(params);
export const deleteFile = (params: DeleteParams) => storage.delete(params);
export const batchDeleteFiles = (params: BatchDeleteParams) => storage.batchDelete(params);
export const getFileInfo = (params: GetFileParams) => storage.getFileInfo(params);
export const getFile = (params: GetFileParams) => storage.getFile(params);
export const listFiles = (params?: ListFilesParams) => storage.listFiles(params);
export const fileExists = (filePath: string) => storage.exists(filePath);
export const generatePublicUrl = (filePath: string, domain?: string, needOrigin = false) => storage.generatePublicUrl(filePath, domain, needOrigin);
export const generateTransparentImageUrl = (options: GenerateTransparentImageUrlOptions) => storage.generateTransparentImageUrl(options);

export default storage;