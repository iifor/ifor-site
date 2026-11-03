import type { APIRoute } from 'astro';
import { mediaUrl, saveUploadedImage } from '../../../lib/media';

// 后台正文编辑器"插入图片"用：上传后返回可直接贴进 Markdown 的地址
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const { media, error } = await saveUploadedImage(form.get('file'));
  if (!media) {
    return new Response(JSON.stringify({ error: error ?? '没有收到图片' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ url: mediaUrl(media.id) }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
