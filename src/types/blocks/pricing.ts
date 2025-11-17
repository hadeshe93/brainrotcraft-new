import type { Button, BaseBlockSection } from './base';

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string | {
    id: string;
    credits: number;
    price: string;
    amount: number;
  }[];
  original_price?: string;
  currency?: string;
  currency_symbol?: string;
  unit?: string;
  features_title?: string;
  features?: {
    notContained?: boolean;
    content: string;
  }[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  credits?: number;
  valid_months?: number;
  group?: string;
}

export interface Pricing extends BaseBlockSection {
  id?: string;
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  items?: PricingItem[];
  groups?: PricingGroup[];
}