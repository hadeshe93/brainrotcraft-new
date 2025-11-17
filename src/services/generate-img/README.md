# 图片生成服务

基于 AI SDK 的图片生成服务，支持多种AI提供商和模型。

## 功能特性

- 🎨 支持文本到图片生成
- 🔧 多提供商支持（当前支持 Replicate）
- 📏 灵活的尺寸和宽高比配置
- 🎲 随机种子控制
- 📦 批量图片生成
- ⚡ TypeScript 类型安全
- 🛡️ 完整的错误处理
- 🌍 多语言错误码支持

## 快速开始

### 基础用法

```typescript
import { generateImg, EGenerateImgProvider } from '@/services/generate-img';

const result = await generateImg({
  prompt: '一个未来主义的城市夜景',
  provider: EGenerateImgProvider.Replicate,
  model: 'black-forest-labs/flux-schnell',
});

if (result.success) {
  console.log('生成成功!');
  console.log('图片数据:', result.data?.image); // base64 格式
} else {
  console.error('生成失败，错误码:', result.errorCode);
}
```

### 高级配置

```typescript
const result = await generateImg({
  prompt: '一只可爱的橙色小猫，卡通风格，高清画质',
  provider: EGenerateImgProvider.Replicate,
  model: 'black-forest-labs/flux-1.1-pro-ultra',
  size: '1024x1024',
  outputQuality: 95,
  seed: 42, // 固定种子确保结果可重现
});
```

### 批量生成

```typescript
const result = await generateImg({
  prompt: '宇宙中的星系，科幻风格',
  provider: EGenerateImgProvider.Replicate,
  model: 'recraft-ai/recraft-v3',
  aspectRatio: '16:9',
  n: 4, // 生成4张图片
});

if (result.success && result.data?.images) {
  console.log(`成功生成 ${result.data.images.length} 张图片`);
  result.data.images.forEach((image, index) => {
    console.log(`图片 ${index + 1}:`, image);
  });
}
```

## API 参考

### `generateImg(options)`

#### 参数

- `prompt` (string): 图片生成的文本提示词
- `provider` (EGenerateImgProvider): AI 提供商
- `model` (string): 使用的AI模型名称
- `outputQuality?` (number): 输出质量 (1-100)
- `size?` (string): 图片尺寸，格式: "宽x高" (如 "1024x1024")
- `aspectRatio?` (string): 宽高比，格式: "宽:高" (如 "16:9")
- `seed?` (number): 随机种子，用于控制生成结果的一致性
- `n?` (number): 生成图片数量，默认为 1

#### 返回值

```typescript
interface GenerateImgResult {
  success: boolean;
  data?: {
    image: string; // 第一张图片的 base64 编码
    images?: string[]; // 所有图片的 base64 编码数组
    prompt: string; // 使用的提示词
    model: string; // 使用的模型
    provider: EGenerateImgProvider; // 使用的提供商
  };
  errorCode?: ServiceErrorCode; // 错误码（多语言支持）
}
```

### 工具函数

#### `getSupportedModels(provider)`

获取指定提供商支持的模型列表。

```typescript
import { getSupportedModels, EGenerateImgProvider } from '@/services/generate-img';

const models = getSupportedModels(EGenerateImgProvider.Replicate);
console.log(models);
// ['black-forest-labs/flux-schnell', 'black-forest-labs/flux-1.1-pro-ultra', ...]
```

#### `getSupportedSizes(provider, model?)`

获取支持的图片尺寸列表。

```typescript
import { getSupportedSizes, EGenerateImgProvider } from '@/services/generate-img';

const sizes = getSupportedSizes(EGenerateImgProvider.Replicate);
console.log(sizes);
// ['1024x1024', '1024x768', '768x1024', ...]
```

#### `getSupportedAspectRatios(provider, model?)`

获取支持的宽高比列表。

```typescript
import { getSupportedAspectRatios, EGenerateImgProvider } from '@/services/generate-img';

const ratios = getSupportedAspectRatios(EGenerateImgProvider.Replicate);
console.log(ratios);
// ['1:1', '2:3', '3:2', '4:5', '5:4', '16:9', '9:16', ...]
```

## 错误处理

### 错误码系统

服务使用结构化的错误码系统，支持多语言国际化：

#### 错误码范围分配

- **1000-1999**: 通用错误
- **2000-2999**: 用户认证相关错误  
- **3000-3999**: 权限相关错误
- **4000-4999**: 参数验证错误
- **5000-5999**: 外部服务错误
- **6000-6999**: 图片生成服务错误
- **7000-7999**: 存储服务错误
- **8000-8999**: 支付服务错误
- **9000-9999**: 其他业务逻辑错误

#### 常见错误码

**参数验证错误 (4000-4999)**:
- `4102`: 提示词为空
- `4202`: 模型名称为空  
- `4300`: 无效的图片尺寸格式
- `4301`: 无效的宽高比格式
- `4302`: 无效的输出质量值
- `4303`: 无效的随机种子值
- `4304`: 无效的生成数量

**外部服务错误 (5000-5999)**:
- `5001`: API密钥无效
- `5002`: API配额超限
- `5003`: API请求频率限制
- `5004`: 外部服务超时
- `5101`: Replicate服务错误

**图片生成错误 (6000-6999)**:
- `6001`: 图片生成失败
- `6002`: 未生成任何图片
- `6100`: 不支持的提供商
- `6200`: 模型未找到
- `6300`: 内容政策违规
- `6301`: 检测到NSFW内容

### 错误处理示例

#### 基础错误处理

```typescript
import { ErrorCodeUtils } from '@/types/services/errors';

const result = await generateImg({
  prompt: "美丽的风景",
  provider: EGenerateImgProvider.Replicate,
  model: 'black-forest-labs/flux-schnell',
});

if (!result.success) {
  const errorCategory = ErrorCodeUtils.getErrorCategory(result.errorCode!);
  const httpStatus = ErrorCodeUtils.getHttpStatusCode(result.errorCode!);
  
  console.error('生成失败');
  console.error('错误码:', result.errorCode);
  console.error('错误类别:', errorCategory);
  console.error('HTTP状态码:', httpStatus);
  
  // 根据错误类型处理
  if (ErrorCodeUtils.isClientError(result.errorCode!)) {
    // 客户端错误，检查参数
    console.log('请检查输入参数');
  } else if (ErrorCodeUtils.isServerError(result.errorCode!)) {
    // 服务端错误，可能需要重试
    console.log('服务暂时不可用，请稍后重试');
  }
}
```

#### 高级错误处理 - 重试机制

```typescript
import { generateImageWithRetry } from '@/services/generate-img/example';

const result = await generateImageWithRetry('美丽的风景', 3);

if (result.success) {
  console.log('生成成功!', '重试次数:', result.retryCount);
} else {
  console.error('生成失败，错误码:', result.errorCode);
  console.error('总重试次数:', result.retryCount);
}
```

## 支持的提供商和模型

### Replicate

当前支持的模型：

- `black-forest-labs/flux-schnell` - 快速生成，适合原型开发
- `black-forest-labs/flux-1.1-pro-ultra` - 高质量生成，商业级
- `recraft-ai/recraft-v3` - 专业设计风格
- `stability-ai/stable-diffusion-3.5-large` - 稳定扩散模型

### 支持的尺寸

- `1024x1024` - 正方形
- `1024x768` - 横向
- `768x1024` - 纵向
- `1536x1024` - 宽屏横向
- `1024x1536` - 宽屏纵向

### 支持的宽高比

- `1:1` - 正方形
- `2:3`, `3:2` - 传统照片比例
- `4:5`, `5:4` - 社交媒体比例
- `16:9`, `9:16` - 视频比例
- `9:21`, `21:9` - 超宽屏比例

## 最佳实践

### 1. 提示词优化

```typescript
// ✅ 好的提示词
const goodPrompt = "一只毛茸茸的橙色猫咪，坐在阳光明媚的窗台上，高清摄影，柔和的自然光，浅景深";

// ❌ 不够具体的提示词
const poorPrompt = "猫";
```

### 2. 错误处理

```typescript
import { ErrorCodeUtils } from '@/types/services/errors';

try {
  const result = await generateImg({
    prompt: "美丽的风景",
    provider: EGenerateImgProvider.Replicate,
    model: 'black-forest-labs/flux-schnell',
  });

  if (!result.success) {
    // 处理业务错误
    console.error('生成失败，错误码:', result.errorCode);
    
    // 获取错误详情
    if (result.errorCode) {
      const errorInfo = {
        category: ErrorCodeUtils.getErrorCategory(result.errorCode),
        isClientError: ErrorCodeUtils.isClientError(result.errorCode),
        httpStatusCode: ErrorCodeUtils.getHttpStatusCode(result.errorCode),
      };
      console.error('错误详情:', errorInfo);
    }
    return;
  }

  // 使用生成的图片
  const imageData = result.data?.image;
} catch (error) {
  // 处理系统错误
  console.error('系统错误:', error);
}
```

### 3. 性能优化

```typescript
// 对于快速预览，使用较快的模型
const previewResult = await generateImg({
  prompt: "概念草图",
  provider: EGenerateImgProvider.Replicate,
  model: 'black-forest-labs/flux-schnell',
  size: '512x512', // 较小尺寸更快
});

// 对于最终产品，使用高质量模型
const finalResult = await generateImg({
  prompt: "最终产品图",
  provider: EGenerateImgProvider.Replicate,
  model: 'black-forest-labs/flux-1.1-pro-ultra',
  size: '1024x1024',
  outputQuality: 95,
});
```

## 注意事项

1. **图片数据格式**: 返回的图片数据是 base64 编码的字符串，可以直接用于 `<img>` 标签的 `src` 属性
2. **异步操作**: 图片生成是异步操作，请适当处理加载状态
3. **资源消耗**: 高质量模型和大尺寸图片会消耗更多计算资源和时间
4. **种子值**: 使用相同的种子值、提示词和参数可以生成相似的图片
5. **批量生成**: 批量生成时，第一张图片也会包含在 `images` 数组中
6. **错误码**: 使用错误码而不是错误信息，便于国际化和统一处理

## 故障排除

### 常见错误码及解决方案

1. **4102 (提示词为空)**: 确保传入了有效的提示词
2. **4202 (模型名称为空)**: 确保传入了有效的模型名称
3. **6100 (不支持的提供商)**: 确保使用了正确的提供商枚举值
4. **5001 (API密钥无效)**: 检查环境变量中的API密钥配置
5. **5002 (API配额超限)**: 检查账户余额或升级服务计划
6. **6300 (内容政策违规)**: 修改提示词，避免敏感内容

### 调试技巧

启用调试模式：

```typescript
import { createErrorInfo } from '@/types/services/errors';

// 生成图片
const result = await generateImg(options);

if (!result.success && result.errorCode) {
  const errorInfo = createErrorInfo(result.errorCode);
  console.log('错误详情:', errorInfo);
}
```

检查网络连接和API配置，确保AI SDK能够正常访问相应的AI提供商服务。

## 快速集成指南

### 1. Next.js API 端点集成

创建 API 端点 `/app/api/generate-image/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateImg, EGenerateImgProvider } from '@/services/generate-img';
import { ErrorCodeUtils } from '@/types/services/errors';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, size, aspectRatio } = await request.json();

    const result = await generateImg({
      prompt,
      provider: EGenerateImgProvider.Replicate,
      model: model || 'black-forest-labs/flux-schnell',
      size,
      aspectRatio,
    });

    if (!result.success) {
      const httpStatus = result.errorCode 
        ? ErrorCodeUtils.getHttpStatusCode(result.errorCode)
        : 400;
        
      return NextResponse.json(
        { 
          success: false,
          errorCode: result.errorCode,
          errorCategory: result.errorCode 
            ? ErrorCodeUtils.getErrorCategory(result.errorCode)
            : 'unknown'
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json({
      success: true,
      image: result.data?.image,
      metadata: {
        prompt: result.data?.prompt,
        model: result.data?.model,
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errorCode: 1001, // INTERNAL_SERVER_ERROR
        errorCategory: 'common'
      },
      { status: 500 }
    );
  }
}
```

### 2. React 组件集成

```typescript
import { useState } from 'react';
import { ErrorCodeUtils } from '@/types/services/errors';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      
      if (data.success) {
        setImage(data.image);
      } else {
        // 根据错误码显示用户友好的错误信息
        const isClientError = data.errorCode 
          ? ErrorCodeUtils.isClientError(data.errorCode)
          : false;
          
        setError(isClientError 
          ? '请检查输入参数' 
          : '服务暂时不可用，请稍后重试'
        );
      }
    } catch (error) {
      console.error('请求失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="输入图片描述..."
        className="w-full p-2 border rounded"
      />
      <button
        onClick={generateImage}
        disabled={loading || !prompt.trim()}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? '生成中...' : '生成图片'}
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {image && (
        <div className="mt-4">
          <img
            src={`data:image/png;base64,${image}`}
            alt="Generated"
            className="max-w-full rounded"
          />
        </div>
      )}
    </div>
  );
}
```

### 3. 环境配置

确保在 `.env.local` 文件中配置必要的API密钥：

```bash
# Replicate API Key
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

### 4. 高级示例使用

查看 `example.ts` 文件获取更多高级用法示例，包括：

- 产品图片生成
- 社交媒体配图
- 批量概念艺术生成
- 可重现图片生成
- 根据用户偏好动态选择模型
- 重试机制和批量处理

## 开发与贡献

1. 确保使用 Node.js 20+
2. 运行 `pnpm install` 安装依赖
3. 所有类型都有完整的 TypeScript 定义
4. 遵循项目的代码规范和最佳实践
5. 错误处理使用统一的错误码系统

## 版本历史

- **v1.1.0** - 重构错误处理系统，支持多语言错误码
- **v1.0.0** - 初始版本，支持 Replicate 提供商和基本图片生成功能
