# Cloudflare R2 存储服务

这个服务提供了一个完整的 Cloudflare R2 对象存储操作接口，支持文件上传、下载、删除、列表等操作。

## 功能特性

- ✅ 文件上传（单文件和批量）
- ✅ 文件删除（单文件和批量）
- ✅ 文件下载和获取
- ✅ 文件信息查询
- ✅ 文件列表和搜索
- ✅ 文件存在性检查
- ✅ 自动内容类型推断
- ✅ 元数据支持
- ✅ 缓存控制
- ✅ 错误处理和类型安全

## 快速开始

### 1. 配置 Cloudflare R2

确保您的 `wrangler.jsonc` 中已经配置了 R2 绑定：

```jsonc
{
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "your-bucket-name"
    }
  ]
}
```

### 2. 基本使用

```typescript
import { storage, uploadFile, deleteFile } from '@/services/storage';

// 上传文件
const result = await uploadFile({
  path: 'images',
  fileName: 'avatar.jpg',
  file: fileBlob,
  metadata: {
    userId: '123',
    uploadTime: new Date().toISOString()
  }
});

// 删除文件
await deleteFile({
  filePath: 'images/avatar.jpg'
});
```

## API 参考

### 上传文件

```typescript
interface UploadParams {
  path: string;              // 存储路径
  fileName: string;          // 文件名
  file: File | Blob | ArrayBuffer | ReadableStream | string;
  metadata?: Record<string, string>;     // 自定义元数据
  httpMetadata?: R2HTTPMetadata;         // HTTP 元数据
  cacheControl?: string;                 // 缓存控制
  contentType?: string;                  // 内容类型（可自动推断）
}

// 使用示例
const result = await storage.upload({
  path: 'uploads/2024/01',
  fileName: 'document.pdf',
  file: pdfFile,
  metadata: {
    originalName: 'original-document.pdf',
    uploadedBy: 'user123',
    department: 'hr'
  },
  cacheControl: 'public, max-age=3600'
});
```

### 删除文件

```typescript
// 删除单个文件
await storage.delete({
  filePath: 'uploads/2024/01/document.pdf'
});

// 批量删除
const deletedCount = await storage.batchDelete({
  filePaths: [
    'uploads/file1.pdf',
    'uploads/file2.jpg',
    'uploads/file3.txt'
  ]
});
```

### 获取文件

```typescript
// 获取文件内容
const fileObject = await storage.getFile({
  filePath: 'uploads/document.pdf'
});

// 获取文件信息（不下载内容）
const fileInfo = await storage.getFileInfo({
  filePath: 'uploads/document.pdf'
});

// 检查文件是否存在
const exists = await storage.exists('uploads/document.pdf');
```

### 列出文件

```typescript
// 列出所有文件
const result = await storage.listFiles();

// 带条件的列表查询
const result = await storage.listFiles({
  prefix: 'uploads/2024/',           // 路径前缀
  limit: 50,                        // 限制数量
  delimiter: '/',                   // 分隔符（用于模拟目录结构）
  include: ['httpMetadata', 'customMetadata']  // 包含元数据
});

// 分页查询
const nextPage = await storage.listFiles({
  prefix: 'uploads/',
  cursor: result.cursor,  // 使用上一页的游标
  limit: 20
});
```

### 生成访问 URL

```typescript
// 生成公开访问 URL（需要配置公开访问域名）
const publicUrl = storage.generatePublicUrl(
  'uploads/image.jpg',
  'your-custom-domain.com'  // 可选的自定义域名
);
```

## API 路由示例

项目中提供了完整的 API 路由示例：

### 文件上传 API

```http
POST /api/storage-example
Content-Type: multipart/form-data

file: [文件内容]
path: uploads/2024  (可选，默认为 uploads)
```

### 文件列表 API

```http
GET /api/storage-example?prefix=uploads&limit=20&cursor=xxx
```

### 文件下载 API

```http
# 直接下载文件
GET /api/storage-example/uploads/document.pdf

# 获取文件信息
GET /api/storage-example/uploads/document.pdf?info=true

# 强制下载
GET /api/storage-example/uploads/document.pdf?download=true
```

### 文件删除 API

```http
DELETE /api/storage-example?filePath=uploads/document.pdf
```

### 检查文件存在

```http
HEAD /api/storage-example/uploads/document.pdf
```

## 错误处理

所有方法都会抛出 `StorageError` 异常，包含详细的错误信息：

```typescript
import { StorageError } from '@/services/storage';

try {
  await storage.upload(params);
} catch (error) {
  if (error instanceof StorageError) {
    console.error('存储错误:', error.message);
    console.error('错误代码:', error.code);
    console.error('状态码:', error.statusCode);
  }
}
```

## 常见错误代码

- `R2_BINDING_NOT_FOUND`: R2 绑定未找到
- `CONTEXT_ERROR`: 无法获取 Cloudflare 上下文
- `UPLOAD_FAILED`: 上传失败
- `DELETE_ERROR`: 删除失败
- `GET_INFO_ERROR`: 获取文件信息失败
- `GET_FILE_ERROR`: 获取文件失败
- `LIST_ERROR`: 列出文件失败

## 支持的文件类型

服务会自动推断常见文件类型的 MIME 类型：

- 图片：jpg, jpeg, png, gif, webp, svg, ico
- 文档：pdf, doc, docx, xls, xlsx
- 文本：txt, html, css, js, json, xml
- 视频：mp4, webm, mov
- 音频：mp3, wav, ogg
- 压缩：zip, rar, 7z

## 最佳实践

1. **路径规划**：建议使用有层次的路径结构，如 `uploads/2024/01/user123/`
2. **文件命名**：使用有意义的文件名，避免特殊字符
3. **元数据使用**：充分利用自定义元数据存储业务信息
4. **缓存策略**：为静态资源设置合适的缓存控制
5. **错误处理**：始终处理可能的存储异常
6. **批量操作**：对于多文件操作，优先使用批量方法

## 注意事项

- Cloudflare R2 目前不支持预签名 URL
- 文件大小限制取决于您的 Cloudflare 配置
- 公开访问需要配置 R2 的公开域名
- 建议在生产环境中实施适当的访问控制

## 类型定义

所有接口和类型都有完整的 TypeScript 定义，提供良好的开发体验和类型安全。查看 `storage.ts` 文件获取完整的类型定义。 