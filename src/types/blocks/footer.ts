import type { Image, Link, NavItem, Social, Agreement } from './base';

export interface Footer {
  brand: {
    title: string;
    description?: string;
    extraDescriptions?: string[];
    logo: Image;
    link: Link;
  };
  copyright: string;
  nav: NavItem[];
  social: Social;
  agreement: Agreement;
  badge: {
    items: {
      type: 'stripe_climate';
      [key: string]: any;
    }[];
  };
};

