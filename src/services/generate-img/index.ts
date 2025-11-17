export enum EGenerateImgProvider {
  Replicate = 'replicate',
}

interface GenerateImgOptions {
  prompt: string;
  provider: EGenerateImgProvider;
  model: string;
  outputQuality?: number;
  size?: string;
  aspectRatio?: string;
  seed?: number;
  n?: number;
}

import { 
  EValidationErrorCode, 
  EGenerateImgErrorCode, 
  EExternalServiceErrorCode,
  ServiceErrorCode 
} from '../../types/services/errors';

interface GenerateImgResult {
  success: boolean;
  data?: {
    image: string; // base64 encoded image
    images?: string[]; // for multiple image generation
    prompt: string;
    model: string;
    provider: EGenerateImgProvider;
  };
  errorCode?: ServiceErrorCode;
}

import { experimental_generateImage as generateImage } from 'ai';
import { replicate } from '@ai-sdk/replicate';

/**
 * 生成图片的核心服务函数
 * @param options 图片生成选项
 * @returns 生成结果
 */
export async function generateImg(options: GenerateImgOptions): Promise<GenerateImgResult> {
  const { prompt, provider, model, outputQuality, size, aspectRatio, seed, n = 1 } = options;

  // 先进行所有参数验证，避免在验证过程中调用AI服务
  
  // 验证输入参数
  if (!prompt || prompt.trim().length === 0) {
    return {
      success: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
    };
  }

  if (!model) {
    return {
      success: false,
      errorCode: EValidationErrorCode.INVALID_PARAMETER,
    };
  }

  // 验证生成数量
  if (n && (n < 1 || n > 10)) {
    return {
      success: false,
      errorCode: EValidationErrorCode.PARAMETER_OUT_OF_RANGE,
    };
  }

  // 验证输出质量
  if (outputQuality && (outputQuality < 1 || outputQuality > 100)) {
    return {
      success: false,
      errorCode: EValidationErrorCode.PARAMETER_OUT_OF_RANGE,
    };
  }

  // 验证图片尺寸格式
  if (size) {
    const sizeRegex = /^\d+x\d+$/;
    if (!sizeRegex.test(size)) {
      return {
        success: false,
        errorCode: EValidationErrorCode.INVALID_PARAMETER,
      };
    }
  }
  
  // 验证宽高比格式
  if (aspectRatio) {
    const ratioRegex = /^\d+:\d+$/;
    if (!ratioRegex.test(aspectRatio)) {
      return {
        success: false,
        errorCode: EValidationErrorCode.INVALID_PARAMETER,
      };
    }
  }
  
  // 验证随机种子
  if (seed) {
    if (seed < 0 || seed > 2147483647) {
      return {
        success: false,
        errorCode: EValidationErrorCode.INVALID_PARAMETER,
      };
    }
  }

  // 验证提供商
  if (!Object.values(EGenerateImgProvider).includes(provider)) {
    return {
      success: false,
      errorCode: EGenerateImgErrorCode.UNSUPPORTED_PROVIDER,
    };
  }

  try {
    // 根据提供商配置模型
    let imageModel;
    switch (provider) {
      case EGenerateImgProvider.Replicate:
        imageModel = replicate.image(model);
        break;
      default:
        return {
          success: false,
          errorCode: EGenerateImgErrorCode.UNSUPPORTED_PROVIDER,
        };
    }

    // 构建生成参数
    const generateParams: Parameters<typeof generateImage>[0] = {
      model: imageModel,
      prompt,
    };

    // 添加已验证的可选参数
    if (size) {
      generateParams.size = size as `${number}x${number}`;
    }
    
    if (aspectRatio) {
      generateParams.aspectRatio = aspectRatio as `${number}:${number}`;
    }
    
    if (seed) {
      generateParams.seed = seed;
    }
    
    if (n > 1) generateParams.n = n;

    // 添加提供商特定选项
    if (outputQuality && provider === EGenerateImgProvider.Replicate) {
      generateParams.providerOptions = {
        replicate: {
          output_quality: outputQuality,
        },
      };
    }

    // 生成图片
    const result = await generateImage(generateParams);

    // 检查是否成功生成图片
    if (!result.image) {
      return {
        success: false,
        errorCode: EGenerateImgErrorCode.NO_IMAGE_GENERATED,
      };
    }

    // 处理返回结果
    if (n === 1) {
      return {
        success: true,
        data: {
          image: result.image.base64,
          prompt,
          model,
          provider,
        },
      };
    } else {
      return {
        success: true,
        data: {
          image: result.image.base64, // 第一张图片
          images: result.images.map(img => img.base64),
          prompt,
          model,
          provider,
        },
      };
    }
  } catch (error) {
    console.error('图片生成失败:', error);
    
    // 处理不同类型的错误
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // API密钥相关错误
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        return {
          success: false,
          errorCode: EExternalServiceErrorCode.API_KEY_INVALID,
        };
      }
      
      // 配额超限错误
      if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return {
          success: false,
          errorCode: EExternalServiceErrorCode.API_QUOTA_EXCEEDED,
        };
      }
      
      // 速率限制错误
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return {
          success: false,
          errorCode: EExternalServiceErrorCode.API_RATE_LIMITED,
        };
      }
      
      // 内容政策违规错误
      if (errorMessage.includes('content policy') || errorMessage.includes('nsfw') || errorMessage.includes('inappropriate')) {
        return {
          success: false,
          errorCode: EGenerateImgErrorCode.CONTENT_POLICY_VIOLATION,
        };
      }
      
      // 模型相关错误
      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        return {
          success: false,
          errorCode: EGenerateImgErrorCode.MODEL_NOT_FOUND,
        };
      }
      
      // 网络超时错误
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return {
          success: false,
          errorCode: EExternalServiceErrorCode.EXTERNAL_TIMEOUT,
        };
      }
      
      // Replicate 特定错误
      if (errorMessage.includes('replicate')) {
        return {
          success: false,
          errorCode: EExternalServiceErrorCode.REPLICATE_ERROR,
        };
      }
    }

    // 默认的图片生成失败错误
    return {
      success: false,
      errorCode: EGenerateImgErrorCode.IMAGE_GENERATION_FAILED,
    };
  }
}

/**
 * 获取支持的模型列表
 * @param provider 提供商
 * @returns 模型列表
 */
export function getSupportedModels(provider: EGenerateImgProvider): string[] {
  switch (provider) {
    case EGenerateImgProvider.Replicate:
      return [
        'black-forest-labs/flux-schnell',
        'black-forest-labs/flux-1.1-pro-ultra',
        'recraft-ai/recraft-v3',
        'stability-ai/stable-diffusion-3.5-large',
        'prunaai/flux.1-dev:b0306d92aa025bb747dc74162f3c27d6ed83798e08e5f8977adf3d859d0536a3'
      ];
    default:
      return [];
  }
}

/**
 * 获取提供商支持的图片尺寸
 * @param provider 提供商
 * @returns 支持的尺寸列表
 */
export function getSupportedSizes(provider: EGenerateImgProvider): string[] {
  switch (provider) {
    case EGenerateImgProvider.Replicate:
      // 大部分Replicate模型支持的标准尺寸
      return ['1024x1024', '1024x768', '768x1024', '1536x1024', '1024x1536'];
    default:
      return [];
  }
}

/**
 * 获取提供商支持的宽高比
 * @param provider 提供商 
 * @returns 支持的宽高比列表
 */
export function getSupportedAspectRatios(provider: EGenerateImgProvider): string[] {
  switch (provider) {
    case EGenerateImgProvider.Replicate:
      return ['1:1', '2:3', '3:2', '4:5', '5:4', '16:9', '9:16', '9:21', '21:9'];
    default:
      return [];
  }
}