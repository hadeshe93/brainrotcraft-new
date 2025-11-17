export * from './order';
export * from './credit';

/**
 * 用户类型
 */
export enum EUserType {
  PAID = 'paid', // 付费登录用户，曾经有过付费订单（订阅或者一次性支付）
  FREE = 'free', // 免费登录用户，没有任何一张付费订单
  ANONYMOUS = 'anonymous', // 匿名用户
}

/**
 * 更加精细的用户类型
 */
export enum EStrictUserType {
  Anonymous = 'anonymous', // 匿名用户
  SignedIn = 'signed-in', // 仅登录用户
  HasCredits = 'has-credits', // 有积分用户
}

/**
 * 用户详情信息
 */

export interface User {
  id?: number;
  uuid?: string;
  email: string;
  created_at?: string;
  nickname: string;
  avatar: string;
  password?: string; // 原始密码，仅在注册/更新密码时使用
  account_provider?: string;
  provider_account_id?: string;
  userType?: EUserType;
}

export interface GoogleOneTapLoginPayload {
  name: string;
  email: string;
  picture: string;
  // 如果是 G One Tap 登录 => credentials 登录，那这个就是谷歌侧的 sub，账号 ID
  sub: string;
  accessToken?: string;
}
