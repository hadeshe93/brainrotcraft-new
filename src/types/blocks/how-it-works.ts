import type { Image, BaseBlockSection } from './base';

export interface HowItWorksSection {
  title: string;
  content: string;
  features?: string[];
}

export interface HowItWorks extends BaseBlockSection {
  id?: string;
  title: string;
  emphasisTitle?: string;
  description?: string;
  sections: HowItWorksSection[];
  img?: Image;
}