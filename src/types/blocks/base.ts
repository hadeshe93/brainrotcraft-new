export interface Image {
  url: string;
  alt?: string;
  title?: string;
}

export interface Icon {
  name: string;
}

export interface Link {
  url: string;
  title?: string;
  target?: string;
  rel?: string;
}

export interface NavItem {
  title: string;
  description?: string;
  link?: Link;
  children?: NavItem[];
}

export interface Brand {
  title: string;
  description?: string;
  logo: Image;
  link: Link;
}

export interface Metadata {
  title: string;
  description: string;
  image: Image;
}

export enum ESocialType {
  Facebook = 'facebook',
  Twitter = 'twitter',
  Bluesky = 'bluesky',
  Linktree = 'linktree',
  Instagram = 'instagram',
  LinkedIn = 'linkedin',
  Pinterest = 'pinterest',
  Github = 'github',
  Discord = 'discord',
  Email = 'email',
  KoFi = 'ko-fi',
}

export interface SocialItem {
  title: string;
  type: ESocialType;
  link: Link;
}

export interface Social {
  items: SocialItem[];
}

export interface AgreementItem {
  title: string;
  link: Link;
}

export interface Agreement {
  items: AgreementItem[];
}

export type ButtonType = "button" | "link";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonVariant =
  | "secondary"
  | "link"
  | "default"
  | "destructive"
  | "outline"
  | "ghost"
  | null
  | undefined;

export interface Button {
  title?: string;
  icon?: string;
  url?: string;
  target?: string;
  type?: ButtonType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export interface BaseBlockSection {
  id?: string;
  disabled?: boolean;
}