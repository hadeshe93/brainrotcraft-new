import type { Image, BaseBlockSection } from './base';

export interface Hero extends BaseBlockSection {
  logo: Image;
  title: string;
  emphasisTitle: string;
  primaryDescription: string;
  secondaryDescription: string;
  badges?: {
    title: string;
  }[];
};

