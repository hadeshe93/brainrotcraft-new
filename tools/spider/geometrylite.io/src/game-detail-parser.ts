import * as cheerio from 'cheerio';
import { IParser, GameDetailInfo } from './types';

/**
 * 游戏详情解析器
 * 遵循单一职责原则：仅负责解析游戏详情页面的 iframe 链接和介绍内容
 */
export class GameDetailParser implements IParser<GameDetailInfo> {
  /**
   * 解析游戏详情页面，提取实际游戏 URL 和介绍内容
   * @param html HTML 字符串
   * @returns 游戏详情信息（gameUrl 和 contentHtml）
   */
  parse(html: string): GameDetailInfo {
    const $ = cheerio.load(html);

    // 提取游戏 URL
    let gameUrl = '';

    // 首先尝试从 show-embed 按钮的 data-iframe 属性获取
    const $showEmbed = $('#show-embed');
    if ($showEmbed.length > 0) {
      const url = $showEmbed.attr('data-iframe');
      if (url && url !== 'about:blank') {
        gameUrl = url.trim();
      }
    }

    // 备用方案：尝试从 game-area iframe 获取
    if (!gameUrl) {
      const $iframe = $('#game-area');
      if ($iframe.length > 0) {
        const url = $iframe.attr('src');
        if (url && url !== 'about:blank') {
          gameUrl = url.trim();
        }
      }
    }

    if (!gameUrl) {
      console.warn('Game URL not found');
    }

    // 提取游戏介绍内容
    let contentHtml = '';
    const $content = $('.article--content.game-content-page');
    if ($content.length > 0) {
      contentHtml = $content.html() || '';
    } else {
      console.warn('Game content not found');
    }

    return {
      gameUrl,
      contentHtml,
    };
  }
}
