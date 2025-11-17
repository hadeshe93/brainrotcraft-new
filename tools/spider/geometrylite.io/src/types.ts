/**
 * 游戏基本信息
 */
export interface GameBasicInfo {
  /** 游戏详情链接 */
  url: string;
  /** 游戏标题 */
  title: string;
  /** 游戏封面图 */
  coverImage: string;
  /** 游戏评分 */
  rating: string;
}

/**
 * 游戏详情信息（从详情页解析）
 */
export interface GameDetailInfo {
  /** 实际游戏 iframe 链接 */
  gameUrl: string;
  /** 游戏介绍内容 HTML */
  contentHtml: string;
}

/**
 * 游戏完整信息（包含实际游戏链接和内容）
 */
export interface GameFullInfo extends GameBasicInfo {
  /** 实际游戏 iframe 链接 */
  gameUrl: string;
  /** 游戏介绍内容文件路径（相对路径） */
  contentPath: string;
}

/**
 * HTTP 请求配置
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * 解析器接口
 */
export interface IParser<T> {
  parse(html: string, baseUrl?: string): T;
}

/**
 * HTTP 客户端接口
 */
export interface IHttpClient {
  fetch(url: string, config?: RequestConfig): Promise<string>;
}

/**
 * 导出器接口
 */
export interface IExporter<T> {
  export(data: T[], filePath: string): Promise<void>;
}
