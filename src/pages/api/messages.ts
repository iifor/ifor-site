import type { APIRoute } from 'astro';
import { addMessage, MESSAGE_LIMITS } from '../../lib/messages';
import { allow } from '../../lib/rate-limit';

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: '请求格式不对' }, 400);
  }

  // 机器人会把隐藏的 website 字段也填上；假装成功，不入库
  if (text(payload.website)) return json({ ok: true });

  const name = text(payload.name);
  const contact = text(payload.contact);
  const content = text(payload.content);

  if (!content) return json({ error: '写点想说的话吧' }, 400);
  if (
    name.length > MESSAGE_LIMITS.name ||
    contact.length > MESSAGE_LIMITS.contact ||
    content.length > MESSAGE_LIMITS.content
  ) {
    return json({ error: '内容太长了' }, 400);
  }
  if (!allow(`message:${clientAddress}`, 5, 10 * 60 * 1000)) {
    return json({ error: '发送太频繁了，过几分钟再试' }, 429);
  }

  await addMessage({ name, contact, content });
  return json({ ok: true });
};
