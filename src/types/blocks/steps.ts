import type { Image, BaseBlockSection } from './base';

export interface Steps extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  description?: string;
  items: {
    title: string;
    description?: string | string[];
    img: Image;
  }[];
  cta?: {
    buttonText: string;
    url: string;
  };
};

