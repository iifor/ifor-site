// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';

import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// 线上域名，构建时传入，例如 SITE_URL=https://ifor.example.com npm run build。
// Astro 生产模式默认不信任请求里的域名，不配置的话后台的表单提交会被它的跨站检查拦下。
const siteUrl = process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined;

// https://astro.build/config
export default defineConfig({
  site: siteUrl?.origin,
  // 项目和留言都在数据库里，页面按请求渲染，用 Node 独立服务运行
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    allowedDomains: siteUrl ? [{ hostname: siteUrl.hostname, protocol: siteUrl.protocol.slice(0, -1) }] : [],
  },
  env: {
    schema: {
      DATABASE_URL: envField.string({ context: 'server', access: 'secret' }),
      ADMIN_PASSWORD: envField.string({ context: 'server', access: 'secret', min: 8 }),
      // 用来签名后台登录 Cookie；不设则由 ADMIN_PASSWORD 派生
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  // 鼠标悬停在站内链接上就预取，点进详情页几乎无等待
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // 等宽字体构建时下载到本地，只保留拉丁字符；中文用系统字体，不下载
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
