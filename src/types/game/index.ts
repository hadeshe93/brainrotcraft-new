export interface GameItem {
  uuid: string;
  name: string;
  slug: string;
  thumbnail: string;
  rating: number;
  interact: number;
  upvoteCount: number;
  createdAt: number;
  isManual: boolean; // 是否为运营数据
}

export interface Comment {
  uuid: string;
  content: string;
  authorName: string;
  createdAt: number;
}

export interface SimilarGame {
  uuid: string;
  name: string;
  slug: string;
  thumbnail: string;
  rating?: number;
  interact?: number;
}