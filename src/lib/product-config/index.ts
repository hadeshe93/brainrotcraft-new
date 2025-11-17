/**
 * 产品配置映射服务
 * - 根据 product_id 获取完整的产品信息，复用 i18n 文件中的定价配置
 * - 现在先是使用本地配置，如果多了以后或者需要更强的灵活性的话，再使用其他存储方案
 */

import { EPaymentErrorCode } from '@/types/services/errors';
import { getPageContent } from '@/i18n/utils';
import { ProductInfo, PriceInfo } from '@/types/product';


// 服务响应类型
interface ProductConfigResponse {
  success: true;
  data: ProductInfo;
}

interface ProductConfigError {
  success: false;
  errorCode: EPaymentErrorCode;
  message: string;
}

type ProductConfigResult = ProductConfigResponse | ProductConfigError;

interface GetProductConfigParams {
  productId: string;
  locale?: string;
  priceId?: string;
}

/**
 * 根据产品 ID 获取产品配置信息
 * @param productId 产品标识符
 * @param locale 语言代码，默认为 'en'
 * @returns 产品配置信息或错误
 */
export async function getProductConfig(params: GetProductConfigParams): Promise<ProductConfigResult> {
  const { productId, locale = 'en', priceId } = params;
  try {
    // 验证产品ID是否为空
    if (!productId || productId.trim() === '') {
      return {
        success: false,
        errorCode: EPaymentErrorCode.INVALID_PRODUCT_ID,
        message: 'Product ID cannot be empty',
      };
    }

    // 从 i18n 文件获取定价配置
    const homeContent = await getPageContent({ key: 'pricing', locale });
    const pricingItems = (homeContent as any)?.pricing?.items || [];
    
    // 查找对应的产品配置
    const pricingItem = pricingItems.find((item: any) => item.product_id === productId);
    
    if (!pricingItem) {
      return {
        success: false,
        errorCode: EPaymentErrorCode.PRODUCT_NOT_FOUND,
        message: `Product not found: ${productId}`,
      };
    }

    // 从 i18n 配置中获取主要货币
    const primaryCurrency = pricingItem.currency || 'usd';
    
    // 构建价格数组，首个为主要货币（优先级最高）
    const pricing: PriceInfo[] = [];
    
    // 1. 添加主要货币价格（优先级最高）
    if (priceId) {
      const subPriceItem = pricingItem.price?.find((item: any) => item.id === priceId);
      if (subPriceItem) {
        pricingItem.amount = subPriceItem.amount;
        pricingItem.credits = subPriceItem.credits;
      }
    }
    pricing.push({
      amount: pricingItem.amount,
      currency: primaryCurrency,
    });
    
    // 2. 如果主要货币不是 cny 且有中国价格，则添加 cny 价格
    if (primaryCurrency !== 'cny' && pricingItem.cn_amount !== undefined) {
      pricing.push({
        amount: pricingItem.cn_amount,
        currency: 'cny',
      });
    }

    // 构建产品配置对象
    const productConfig: ProductInfo = {
      id: pricingItem.product_id,
      name: pricingItem.product_name,
      credits: pricingItem.credits || 0,
      validMonths: pricingItem.valid_months || 1,
      pricing,
      interval: pricingItem.interval as 'month' | 'year' | '',
      description: pricingItem.description,
      features: pricingItem.features || [],
    };

    return {
      success: true,
      data: productConfig,
    };
  } catch (error) {
    console.error('Error getting product config:', error);
    return {
      success: false,
      errorCode: EPaymentErrorCode.INVALID_PRICE_CONFIGURATION,
      message: 'Failed to get product configuration',
    };
  }
}

/**
 * 获取产品的主要货币价格（数组首个）
 * @param productInfo 产品信息
 * @returns 主要货币价格信息
 */
export function getPrimaryPrice(productInfo: ProductInfo): PriceInfo | null {
  return productInfo.pricing.length > 0 ? productInfo.pricing[0] : null;
}

/**
 * 根据货币类型获取产品价格
 * @param productInfo 产品信息
 * @param currency 货币类型
 * @returns 指定货币的价格信息
 */
export function getPriceByCurrency(productInfo: ProductInfo, currency: string): PriceInfo | null {
  return productInfo.pricing.find(p => p.currency === currency) || null;
}

/**
 * 获取支持的货币列表
 * @returns 支持的货币列表
 */
export function getSupportedCurrencies(): string[] {
  return ['usd', 'cny', 'eur', 'gbp', 'jpy', 'krw'];
}

/**
 * 验证货币是否支持
 * @param currency 货币类型
 * @returns 是否支持
 */
export function isCurrencySupported(currency: string): boolean {
  return getSupportedCurrencies().includes(currency.toLowerCase());
}