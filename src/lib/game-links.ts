/**
 * Game Links Utilities
 * Centralized management for all game link generation logic
 */

/**
 * Get the path for game detail page (relative path)
 * @param slug - Game slug, empty string indicates homepage game
 * @returns Game detail page path
 * @example
 * getGamePath('super-mario') // '/game/super-mario'
 * getGamePath('') // '/' (homepage game)
 */
export function getGamePath(slug: string): string {
  if (slug === '') {
    return '/';
  }
  return `/game/${slug}`;
}

/**
 * Get the full share link for a game (absolute URL)
 * @param slug - Game slug
 * @param origin - Site domain (optional, defaults to current domain)
 * @returns Full game share link
 * @example
 * getGameShareUrl('super-mario') // 'https://example.com/game/super-mario'
 * getGameShareUrl('') // 'https://example.com/' (homepage game)
 */
export function getGameShareUrl(slug: string, origin?: string): string {
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const path = getGamePath(slug);
  return `${baseOrigin}${path}`;
}


export function checkGameUrlNeedsNoReferrer(url: string) {
  const BLACK_LIST = ['poki-gdn.com', 'poki.com'];
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  return BLACK_LIST.some(item => hostname.includes(item));
}