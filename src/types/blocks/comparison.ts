import type { Image, BaseBlockSection } from './base';

export interface ComparisonFeature {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ComparisonItem {
  title: string;
  featured?: boolean;
  features: ComparisonFeature[];
}

export interface Comparison extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: ComparisonItem[];
  img?: Image;
}