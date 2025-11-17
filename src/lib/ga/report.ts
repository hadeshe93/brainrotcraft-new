export const GA_EVENT_MAP = {
  ACTION_THEME_DARK: 'action_theme_dark',
  ACTION_THEME_LIGHT: 'action_theme_light',
  ACTION_SHARE: 'action_share',
  ACTION_SHARE_LINK: 'action_share_link',
  ACTION_SHARE_LINE: 'action_share_line',
  ACTION_SHARE_TWITTER: 'action_share_twitter',
  ACTION_SHARE_FACEBOOK: 'action_share_facebook',
  ACTION_SHARE_TELEGRAM: 'action_share_telegram',
  ACTION_SHARE_LINKEDIN: 'action_share_linkedin',
  ACTION_SHARE_TUMBLR: 'action_share_tumblr',
  ACTION_SHARE_REDDIT: 'action_share_reddit',
  ACTION_CLICK_UPLOAD_IMG: 'action_click_upload_img',
  ACTION_CLICK_DOWNLOAD_IMG: 'action_click_download_img',
  ACTION_CLICK_TOOL_BACKGROUND: 'action_click_tool_background',
  ACTION_CLICK_TOOL_COMPARE: 'action_click_tool_compare',
  ACTION_SELECT_BG_COLOR: 'action_select_bg_color',
  ACTION_SELECT_BG_PHOTO: 'action_select_bg_photo',
  ACTION_CLICK_PRICING_ITEM: 'action_click_pricing_item',
};

export function gaReportEvent(eventName: string, ...restEventParams: any[]) {
  try {
    if (!window.gtag) return;
    window.gtag('event', eventName, ...restEventParams);
  } catch (err) {
    console.error('[gaReportEvent] error:', err);
  }
}