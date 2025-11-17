import * as cheerio from 'cheerio';
import { IParser, GameBasicInfo } from './types';

/**
 * 游戏列表解析器
 * 遵循单一职责原则：仅负责解析游戏列表 HTML
 */
export class GameListParser implements IParser<GameBasicInfo[]> {
  /**
   * 解析游戏列表 HTML
   * @param html HTML 字符串
   * @param baseUrl 基础 URL，用于拼接相对路径
   * @returns 游戏基本信息数组
   */
  parse(html: string, baseUrl: string = 'https://geometrylite.io'): GameBasicInfo[] {
    const $ = cheerio.load(html);
    const games: GameBasicInfo[] = [];

    // 遍历所有游戏项
    $('li.games__item').each((_, element) => {
      try {
        const $item = $(element);
        const $link = $item.find('a.snippet__url');

        // 提取游戏链接
        const relativeUrl = $link.attr('href');
        if (!relativeUrl) return;

        const url = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${relativeUrl}`;

        // 提取标题
        const title = $link.find('.snippet__name').text().trim();
        if (!title) return;

        // 提取封面图
        const $img = $link.find('img.snippet__img');
        let coverImage = $img.attr('data-src') || $img.attr('src') || '';

        // 补全相对路径的封面图 URL
        if (coverImage && !coverImage.startsWith('http')) {
          coverImage = `${baseUrl}${coverImage.startsWith('/') ? '' : '/'}${coverImage}`;
        }

        // 提取评分
        const rating = $link.find('.snippet-tag--rating.info-rate').text().trim().replace(/\s+/g, ' ');

        // 只添加有效的游戏信息
        if (url && title) {
          games.push({
            url,
            title,
            coverImage,
            rating,
          });
        }
      } catch (error) {
        console.error('Error parsing game item:', error);
      }
    });

    return games;
  }
}
