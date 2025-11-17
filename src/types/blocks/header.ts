import type { Image, Link, NavItem } from './base';

export interface Header {
  brand: {
    title: string;
    description?: string;
    logo: Image;
    link: Link;
  };
  nav: NavItem[];
  showSign?: boolean;
  showShare?: boolean;
  showLocale?: boolean;
  showTheme?: boolean;
};

