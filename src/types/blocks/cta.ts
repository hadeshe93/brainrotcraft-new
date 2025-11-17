import type { Button, Image, BaseBlockSection } from './base';

export interface CTA extends BaseBlockSection {
  title: string;
  emphasisTitle?: string;
  subtitle: string;
  description: string;
  primaryButton: Button;
  secondaryButton?: Button;
  backgroundImage?: Image;
  features?: string[];
}