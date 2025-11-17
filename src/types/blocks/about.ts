import { BaseBlockSection } from "./base";
import { SocialItem } from "./base";

interface AboutMember {
  name: string;
  avatar: string;
  title: string; // 职位
  description: string; // 介绍，markdown string
  socials: SocialItem[];
}

export interface AboutBlockSection extends BaseBlockSection {
  introduction: string; // markdown string
  members: AboutMember[];
}