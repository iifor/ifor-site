import { query } from './db';
import { toWebp } from './image';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type MediaInfo = { id: number; width: number | null; height: number | null };

export async function saveImage(input: ArrayBuffer): Promise<MediaInfo> {
  const image = await toWebp(Buffer.from(input));
  const { rows } = await query<{ id: number }>(
    'INSERT INTO media (mime, data, width, height) VALUES ($1, $2, $3, $4) RETURNING id',
    [image.mime, image.data, image.width, image.height],
  );
  return { id: rows[0].id, width: image.width, height: image.height };
}

/** 处理表单里上传的图片：没选文件返回 {}，出错返回 error，成功返回 media */
export async function saveUploadedImage(value: FormDataEntryValue | null): Promise<{ media?: MediaInfo; error?: string }> {
  if (!(value instanceof File) || value.size === 0) return {};
  if (!value.type.startsWith('image/')) return { error: '只能上传图片文件' };
  if (value.size > MAX_UPLOAD_BYTES) return { error: '图片不能超过 15MB' };
  try {
    return { media: await saveImage(await value.arrayBuffer()) };
  } catch {
    return { error: '这张图片读不出来，换一张试试' };
  }
}

export async function getMedia(id: number) {
  const { rows } = await query<{ mime: string; data: Buffer }>('SELECT mime, data FROM media WHERE id = $1', [id]);
  return rows[0];
}

export async function getMediaInfo(id: number) {
  const { rows } = await query<MediaInfo>('SELECT id, width, height FROM media WHERE id = $1', [id]);
  return rows[0];
}

export const mediaUrl = (id: number) => `/media/${id}`;
