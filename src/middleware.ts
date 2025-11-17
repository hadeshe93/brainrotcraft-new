import createI18nMiddleware from 'next-intl/middleware';
import { createAutoRouter, defineRouteHandler } from '@/lib/auto-router';
import { routing } from '@/i18n/routing';
import { NextResponse } from 'next/server';

// 需要 i18n 处理的中间件
const i18nMw = defineRouteHandler(createI18nMiddleware(routing));
const i18nWithPathnameMw = defineRouteHandler(async (req, ...rest) => {
  const response = await i18nMw(req, ...rest);
  const pathname = req.nextUrl.pathname;
  response.headers.set('x-pathname', pathname);
  return response;
});

// 使用 itty-router 来分发组合不同的中间件
const router = createAutoRouter();
router
  .all('/api/*', async () => {
    return NextResponse.next();
  })
  .all('/auth/signin', async () => {
    return NextResponse.next();
  })
  // 该路由应该兜底，其他路由利用 router 进行捕获转发
  .all('*', i18nWithPathnameMw);

export default router.fetch;
// export default i18nMw;
export const config = {
  // Match only internationalized pathnames
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
