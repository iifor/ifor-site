// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
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
