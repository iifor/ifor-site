// 生产入口：在 Astro 的 standalone 处理器外面包一层 gzip / brotli 压缩。
// Node 适配器自己不压缩，HTML、CSS、JSON 原样传输会大好几倍。
// 用法：npm run build && node server.mjs（PORT、HOST 和其他环境变量照常传）
import http from 'node:http';
import compression from 'compression';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const compress = compression();
const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? 'localhost';

http
  .createServer((req, res) => compress(req, res, () => handler(req, res)))
  .listen(port, host, () => console.log(`ifor 已启动：http://${host}:${port}`));
