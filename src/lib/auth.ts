import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { ADMIN_PASSWORD, SESSION_SECRET } from 'astro:env/server';

// 后台登录态：一个带过期时间和 HMAC 签名的 Cookie，不需要存服务端会话
const COOKIE = 'ifor_admin';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const sha256 = (value: string) => createHash('sha256').update(value).digest();
const secret = SESSION_SECRET || sha256(`ifor-session:${ADMIN_PASSWORD}`).toString('hex');
const sign = (value: string) => createHmac('sha256', secret).update(value).digest('base64url');

function same(a: string | Buffer, b: string | Buffer) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const checkPassword = (input: string) => same(sha256(input), sha256(ADMIN_PASSWORD));

export function startSession(cookies: AstroCookies, secure: boolean) {
  const expires = String(Date.now() + MAX_AGE_SECONDS * 1000);
  cookies.set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function endSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/' });
}

export function isLoggedIn(cookies: AstroCookies) {
  const [expires, signature] = cookies.get(COOKIE)?.value.split('.') ?? [];
  return Boolean(expires && signature) && Number(expires) > Date.now() && same(signature, sign(expires));
}

/** 部署在反向代理后面时，靠 X-Forwarded-Proto 判断是否 https */
export const isHttps = (request: Request, url: URL) =>
  url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
