import type { Image, BaseBlockSection } from './base';

export interface CompareItem {
  title?: string;
  description?: string;
  images: [Image, Image];
}

export interface CompareShowcase extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: CompareItem[];
}