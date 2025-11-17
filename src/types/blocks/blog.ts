import type { Metadata } from './base';

export interface BlogListItem {
  slug: string;
  title: string;
  description: string;
  publishDate: string;
  author: {
    id: string;
    username: string;
    avatar: string;
  };
  readingTime: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishDate: string;
  author: {
    id: string;
    username: string;
    avatar: string;
  };
  readingTime: string;
  content: string;
}