/**
 * 域名
 */
export const BRAND_NAME = 'BrainrotCraft';
export const BIZ_NAME = 'brainrotcraft';
export const DOMAIN = `${BIZ_NAME}.app`;
export const CAPITALIZED_DOMAIN = DOMAIN.charAt(0).toUpperCase() + DOMAIN.slice(1);
export const ORIGIN = `https://${DOMAIN}`;
export const NEXTAUTH_URL = `https://${DOMAIN}`;

/**
 * 上传到 R2 的跟路径
 */
export const UPLOAD_IMG_ROOT_PATH = 'brainrotcraft';

/**
 * 开发者相关
 */
export const DEVELOPER_EMAIL_WHITELIST = ['hadeshe93@gmail.com'];
export const DEVELOPER_PRODUCT_AMOUNT_USD = 1;
// 性能监控
export const ENABLE_PERFORMANCE_MONITORING = true;
// 预测状态的底层驱动
export const PREDICTION_STORAGE_PROVIDER = 'do';

/**
 * 母站点 - 子站点白名单
 * 允许跨域访问 Fetch API 的子站点域名列表
 */
export const CHILD_SITE_WHITELIST = [
  'http://localhost:4004', // 本地开发
  'http://localhost:3000', // 本地开发
  'https://brainrotcraft.com', // 生产环境（母站也可以自己拉取自己）
  'https://brainrotcraft.app',
  // 在此添加更多子站点域名，例如：
  // 'https://subdomain.example.com',
  // 'https://another-site.com',
];

/**
 * GA4 & Ads
 */
export const GA4_ID = '';
export const ADS_PAGE_VISIT_ID = '';

/**
 * 登录
 */
// Google
export const AUTH_GOOGLE_ENABLED = true;
export const AUTH_GOOGLE_ONE_TAP_ENABLED = false;
export const AUTH_GOOGLE_ID = '65818626922-mc63l9ehuqifltb0uuj8jkabktpohlbe.apps.googleusercontent.com';
// Github
export const AUTH_GITHUB_ENABLED = false;

/**
 * CF Turnstile
 */
// 站点前端公钥
export const CF_TURNSTILE_SITEKEY = '0x4AAAAAAB1HSHT-wXp9nM1X';

/**
 * 用户 & 支付相关
 */
// 是否需要强制限频
export const FORCE_THROTTLE_CHECK = false;
// 主页是否需要展示作品模块
export const NEED_USER_WORKS_SYSTEM = false;
// 是否需要支付系统
export const NEED_PAID_SYSTEM = false;
// 产品
export const PRODUCT_MAP = {
  basic_monthly: {
    product_id: '',
    credits: 400,
    price: '$9.9',
    original_price: '$14.9',
    amount: 9.9,
    currency: 'usd',
  },
  premium_monthly: {
    product_id: '',
    credits: 1000,
    price: '$19.9',
    original_price: '$24.9',
    amount: 19.9,
    currency: 'usd',
  },
};
// 非付费用户默认限频配置
export const DEFAULT_THROTTLE_CONFIG = {
  limitCycleExcutionTimes: 10, // 次数
  limitCycleTimeMs: 60 * 1000, // 单位周期
};
