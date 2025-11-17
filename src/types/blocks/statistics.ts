import type { BaseBlockSection } from './base';

export interface Statistics extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: {
    formerText: string;
    middleText: string;
    latterText: string;
  }[];
};

