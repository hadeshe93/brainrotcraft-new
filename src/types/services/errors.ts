/**
 * 服务错误码定义
 *
 * 错误码范围分配：
 * 1000-1999: 通用错误
 * 2000-2999: 用户认证相关错误
 * 3000-3999: 权限相关错误
 * 4000-4999: 参数验证错误
 * 5000-5999: 外部服务错误
 * 6000-6999: 图片生成服务错误
 * 7000-7999: 安全验证服务错误码
 * 8000-8099: 限频服务错误
 * 8100-8199: 支付服务错误
 * 9000-9999: 其他业务逻辑错误
 */

// 通用错误码 (1000-1999)
export enum ECommonErrorCode {
  // 系统级错误
  UNKNOWN_ERROR = 1000,
  INTERNAL_SERVER_ERROR = 1001,
  SERVICE_UNAVAILABLE = 1002,
  NETWORK_ERROR = 1003,
  TIMEOUT_ERROR = 1004,

  // 资源错误
  NOT_FOUND = 1050,
  RESOURCE_NOT_FOUND = 1051,
  FORBIDDEN = 1052,
  USER_NOT_AUTHENTICATED = 1053,
  METHOD_NOT_ALLOWED = 1054,

  // 限频错误
  RATE_LIMIT_EXCEEDED = 1060,
  TOO_MANY_REQUESTS = 1061,

  // 验证错误
  TURNSTILE_VERIFICATION_FAILED = 1070,

  // 配置错误
  CONFIG_ERROR = 1100,
  ENV_VAR_MISSING = 1101,
  INVALID_CONFIG = 1102,
}

// 参数验证错误码 (4000-4999)
export enum EValidationErrorCode {
  // 通用验证错误
  INVALID_PARAMETER = 4000,
  MISSING_REQUIRED_PARAMETER = 4001,
  PARAMETER_OUT_OF_RANGE = 4002,
  INVALID_FORMAT = 4003,

  // 表单数据错误
  FORM_DATA_INVALID = 4010,
  FORM_DATA_PARSE_ERROR = 4011,

  // Turnstile 验证错误
  TURNSTILE_TOKEN_REQUIRED = 4600,
  TURNSTILE_VERIFICATION_FAILED = 4601,
}

// 外部服务错误码 (5000-5999)
export enum EExternalServiceErrorCode {
  // 通用外部服务错误
  EXTERNAL_SERVICE_ERROR = 5000,
  API_KEY_INVALID = 5001,
  API_QUOTA_EXCEEDED = 5002,
  API_RATE_LIMITED = 5003,
  EXTERNAL_TIMEOUT = 5004,

  // AI 提供商错误
  AI_PROVIDER_ERROR = 5100,
  REPLICATE_ERROR = 5101,
  OPENAI_ERROR = 5102,
  STABILITY_ERROR = 5103,
}

// 图片生成服务错误码 (6000-6999)
export enum EGenerateImgErrorCode {
  // 通用图片生成错误
  IMAGE_GENERATION_FAILED = 6001,

  // 供应商错误
  UNSUPPORTED_PROVIDER = 6100,

  // 模型相关错误
  MODEL_NOT_FOUND = 6200,

  // 内容相关错误
  CONTENT_POLICY_VIOLATION = 6300,
  NO_IMAGE_GENERATED = 6301,
}

// 安全验证服务错误码 (7000-7999)
export enum ETurnstileErrorCode {
  // 验证状态错误
  VERIFICATION_IN_PROGRESS = 7001,
  SITEKEY_REQUIRED = 7002,
  VERIFICATION_FAILED = 7003,
  CONTAINER_NOT_FOUND = 7004,
  VERIFICATION_LOAD_FAILED = 7005,
  USER_CANCELLED_VERIFICATION = 7006,
  VERIFICATION_REQUIRED = 7007,
}

// 限频服务错误码 (8000-8099)
export enum EThrottleErrorCode {
  // 限频相关错误
  REQUEST_RATE_LIMITED = 8000,
  TOO_MANY_REQUESTS = 8001,
  THROTTLE_QUOTA_EXCEEDED = 8002,

  // 系统错误
  THROTTLE_SERVICE_UNAVAILABLE = 8010,
  DURABLE_OBJECT_ERROR = 8011,

  // 参数验证错误
  INVALID_USER_IDENTIFIER = 8020,
  INVALID_REQUEST_TYPE = 8021,
}

// 支付服务错误码 (8100-8199)
export enum EPaymentErrorCode {
  // 通用支付错误
  PAYMENT_FAILED = 8100,
  PAYMENT_CANCELLED = 8101,
  PAYMENT_TIMEOUT = 8102,
  INVALID_PAYMENT_METHOD = 8103,
  PAYMENT_DECLINED = 8104,

  // 产品配置错误
  PRODUCT_NOT_FOUND = 8110,
  INVALID_PRODUCT_ID = 8111,
  PRODUCT_UNAVAILABLE = 8112,
  INVALID_PRICE_CONFIGURATION = 8113,
  CURRENCY_NOT_SUPPORTED = 8114,

  // Stripe 相关错误
  STRIPE_API_ERROR = 8120,
  STRIPE_SESSION_CREATE_FAILED = 8121,
  STRIPE_WEBHOOK_VERIFICATION_FAILED = 8122,
  STRIPE_PAYMENT_INTENT_FAILED = 8123,
  STRIPE_CUSTOMER_CREATE_FAILED = 8124,

  // 订单相关错误
  ORDER_CREATE_FAILED = 8130,
  ORDER_NOT_FOUND = 8131,
  ORDER_ALREADY_PROCESSED = 8132,
  ORDER_EXPIRED = 8133,
  DUPLICATE_ORDER = 8134,

  // 用户侧错误
  USER_NOT_AUTHENTICATED = 8140,
  USER_NOT_FOUND = 8141,
  INSUFFICIENT_USER_INFO = 8142,
  TRY_SUBSCRIBE_MULTIPLE_PLANS = 8143,
  TRY_SUBSCRIBE_SAME_PLAN = 8144,

  // 系统配置错误
  PAYMENT_PROVIDER_NOT_CONFIGURED = 8150,
  PAYMENT_KEYS_MISSING = 8151,
  WEBHOOK_SECRET_MISSING = 8152,

  // 获取平台信息错误
  GET_PLATFORM_INFO_FAILED = 8160,
  GET_PLATFORM_CUSTOMER_ID_FAILED = 8161,

  // 门户会话创建错误
  PORTAL_SESSION_CREATE_FAILED = 8170,

  // 订阅相关错误
  SUBSCRIPTION_QUERY_FAILED = 8180,
}

// 用户积分系统错误码 (9000-9099)
export enum EUserCreditsErrorCode {
  // 积分不足相关错误
  INSUFFICIENT_CREDITS = 9000,
  INSUFFICIENT_AVAILABLE_CREDITS = 9001,

  // 预扣相关错误
  RESERVATION_NOT_FOUND = 9010,
  RESERVATION_ALREADY_EXISTS = 9011,
  RESERVATION_EXPIRED = 9012,

  // 积分池相关错误
  CREDIT_POOL_NOT_INITIALIZED = 9020,
  CREDIT_POOL_STATE_INVALID = 9021,
  SUBSCRIPTION_CYCLE_EXPIRED = 9022,
  POOL_ALREADY_INITIALIZED = 9023,

  // 积分池操作错误
  POOL_INITIALIZATION_FAILED = 9030,
  POOL_GET_STATE_FAILED = 9031,
  POOL_RESERVE_FAILED = 9032,
  POOL_CONFIRM_FAILED = 9033,
  POOL_CANCEL_FAILED = 9034,
  POOL_REFRESH_FAILED = 9035,
  POOL_CHECK_FAILED = 9036,
  POOL_CLEANUP_FAILED = 9037,
  POOL_UPDATE_FAILED = 9038,

  // 数据库操作错误
  DATABASE_OPERATION_FAILED = 9040,
  DUPLICATE_EXPENSE_RECORD = 9041,

  // 参数验证错误
  INVALID_CREDITS_AMOUNT = 9050,
  INVALID_USER_UUID = 9051,
  INVALID_PREDICTION_ID = 9052,

  // 系统错误
  DURABLE_OBJECT_ERROR = 9060,
  CREDIT_SYSTEM_UNAVAILABLE = 9061,
}

// 统一的错误码类型
export type ServiceErrorCode =
  | ECommonErrorCode
  | EValidationErrorCode
  | EExternalServiceErrorCode
  | EGenerateImgErrorCode
  | ETurnstileErrorCode
  | EThrottleErrorCode
  | EPaymentErrorCode
  | EUserCreditsErrorCode;

/**
 * 错误码工具函数
 */
export class ErrorCodeUtils {
  /**
   * 根据错误码获取错误类别
   */
  static getErrorCategory(errorCode: ServiceErrorCode): string {
    const code = Number(errorCode);

    if (code >= 1000 && code < 2000) return 'common';
    if (code >= 2000 && code < 3000) return 'auth';
    if (code >= 3000 && code < 4000) return 'permission';
    if (code >= 4000 && code < 5000) return 'validation';
    if (code >= 5000 && code < 6000) return 'external';
    if (code >= 6000 && code < 7000) return 'generate-img';
    if (code >= 7000 && code < 8000) return 'turnstile';
    if (code >= 8000 && code < 8100) return 'throttle';
    if (code >= 8100 && code < 8200) return 'payment';
    if (code >= 9000 && code < 10000) return 'user-credits';

    return 'unknown';
  }

  /**
   * 判断是否为客户端错误（4xxx）
   */
  static isClientError(errorCode: ServiceErrorCode): boolean {
    const code = Number(errorCode);
    return code >= 4000 && code < 5000;
  }

  /**
   * 判断是否为服务端错误（5xxx及以上）
   */
  static isServerError(errorCode: ServiceErrorCode): boolean {
    const code = Number(errorCode);
    return code >= 5000;
  }

  /**
   * 获取建议的HTTP状态码
   */
  static getHttpStatusCode(errorCode: ServiceErrorCode): number {
    const code = Number(errorCode);

    // 验证错误 -> 400 Bad Request
    if (code >= 4000 && code < 5000) return 400;

    // 外部服务错误 -> 502 Bad Gateway
    if (code >= 5000 && code < 6000) return 502;

    // 业务逻辑错误 -> 422 Unprocessable Entity
    if (code >= 6000 && code < 10000) return 422;

    // 其他错误 -> 500 Internal Server Error
    return 500;
  }
}

/**
 * 错误信息构建器
 */
export interface ErrorInfo {
  code: ServiceErrorCode;
  category: string;
  isClientError: boolean;
  httpStatusCode: number;
}

export function createErrorInfo(errorCode: ServiceErrorCode): ErrorInfo {
  return {
    code: errorCode,
    category: ErrorCodeUtils.getErrorCategory(errorCode),
    isClientError: ErrorCodeUtils.isClientError(errorCode),
    httpStatusCode: ErrorCodeUtils.getHttpStatusCode(errorCode),
  };
}
