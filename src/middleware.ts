import { defineMiddleware } from 'astro:middleware';
import { isLoggedIn } from './lib/auth';

/** 提交请求必须来自本站页面：Origin（没有就看 Referer）的主机名要和本站一致 */
function isSameSite(request: Request, url: URL) {
  const source = request.headers.get('origin') ?? request.headers.get('referer');
  if (!source) return false;
  try {
    // 部署在反向代理后面时，以代理转发的 Host 为准
    const host = request.headers.get('x-forwarded-host') ?? url.host;
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

// /admin 下除了登录页都要先登录；/api/admin 没登录直接 401
export const onRequest = defineMiddleware((context, next) => {
  const { request, url } = context;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');

  if (!isAdminPage && !isAdminApi) return next();

  if (request.method !== 'GET' && request.method !== 'HEAD' && !isSameSite(request, url)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (path !== '/admin/login' && !isLoggedIn(context.cookies)) {
    return isAdminApi ? new Response('Unauthorized', { status: 401 }) : context.redirect('/admin/login');
  }
  return next();
});
