/**
 * 鉴权路由：完全代理给 next-auth 处理
 * - 完全可复用，无任何业务逻辑
 */
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
