import type { Icon, BaseBlockSection } from './base';

export interface UseCaseItem {
  title: string;
  description: string;
  stats?: string;
  icon: Icon;
}

export interface UseCases extends BaseBlockSection {
  id?: string;
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: UseCaseItem[];
}