import type { Image, Link, BaseBlockSection } from './base';

export interface ShowcaseItem {
  title: string;
  description?: string;
  image: Image;
  link?: Link;
}

export interface Showcase extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: ShowcaseItem[];
}