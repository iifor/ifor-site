import type { APIRoute } from 'astro';
import { getMedia } from '../../lib/media';

// 每次上传都是新 id，内容不会变，可以长期缓存
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const media = Number.isInteger(id) ? await getMedia(id) : undefined;
  if (!media) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(media.data), {
    headers: {
      'Content-Type': media.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
