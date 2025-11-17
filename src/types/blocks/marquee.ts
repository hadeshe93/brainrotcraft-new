import type { Image, BaseBlockSection } from './base';

export interface MarqueePortrait extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: {
    image: Image;
  }[];
};

