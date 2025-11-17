import type { Icon, BaseBlockSection, Image } from './base';

export interface Features extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  uiType?: 'grid' | 'dual-column';
  items: {
    title: string;
    description?: string;
    icon?: Icon;
    image?: Image;
  }[];
};

