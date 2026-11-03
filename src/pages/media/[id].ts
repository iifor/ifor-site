import type { APIRoute } from 'astro';
import { getMedia } from '../../lib/media';

// 每次上传都是新 id，内容不会变，可以长期缓存；?w=480 / ?w=960 取缩略图
export const GET: APIRoute = async ({ params, url }) => {
  const id = Number(params.id);
  const width = Number(url.searchParams.get('w')) || undefined;
  const media = Number.isInteger(id) ? await getMedia(id, width) : undefined;
  if (!media) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      'Content-Type': media.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
