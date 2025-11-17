import type { BaseBlockSection } from './base';

export interface Changelog extends BaseBlockSection {
  list: ChangelogItem[];
}

export interface ChangelogItem {
  version: string;
  date: string;
  changes: string[];
}
