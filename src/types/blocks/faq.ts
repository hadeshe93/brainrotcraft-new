import type { BaseBlockSection } from './base';

export interface FAQ extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: {
    question: string;
    answer: string;
  }[];
};
