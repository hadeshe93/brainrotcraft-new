import type { BaseBlockSection } from './base';

export interface Introduction extends BaseBlockSection {
  title: string;
  description: string[];
}