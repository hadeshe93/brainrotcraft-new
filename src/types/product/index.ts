// 价格信息接口
export interface PriceInfo {
  amount: number;
  currency: string;
}

export type ProductInterval = 'month' | 'year' | ''; // 空字符串表示一次性支付

// 产品信息接口
export interface ProductInfo {
  id: string;
  name: string;
  credits: number;
  validMonths: number;
  pricing: PriceInfo[]; // 数组，首个为主要货币
  interval: ProductInterval; // 空字符串表示一次性支付
  description: string;
  features: string[];
}