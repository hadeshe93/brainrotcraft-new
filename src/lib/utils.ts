import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 
// 样式合并
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
}

// 格式化金额
// - 最多保留两位小数，小数部分最后一位如果是 0 则去掉
export function formatAmount(amount: number, currencyRaw?: string): string {
  const formattedAmount = amount.toFixed(2).replace(/\.?0+$/, '');
  const currency = currencyRaw?.toUpperCase() || 'USD';
  if (!currency) {
    return formattedAmount;
  }
  
  // 货币符号映射
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'CNY': '¥',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'KRW': '₩',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'SGD': 'S$',
    'CAD': 'C$',
    'AUD': 'A$',
  };
  
  const symbol = currencySymbols[currency] || currency;
  
  // 对于日元和韩元，通常不显示小数部分
  if (['JPY', 'KRW'].includes(currency.toUpperCase())) {
    return `${symbol}${Math.round(amount)}`;
  }
  
  return `${symbol}${formattedAmount}`;
}