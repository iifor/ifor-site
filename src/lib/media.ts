import sharp from 'sharp';
import { query } from './db';
import { toWebp } from './image';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** 允许请求的缩略宽度；不在列表里的宽度一律给原图，免得被人随便要尺寸来耗 CPU */
export const MEDIA_WIDTHS = [480, 960] as const;

export type MediaInfo = { id: number; width: number | null; height: number | null };
type MediaFile = { mime: string; data: Buffer };

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

// 图片一旦上传就不会变（换图是新 id），所以原图和缩略图都可以放心缓存在内存里。
// 按插入顺序淘汰最早的，总量控制在 48MB 以内。
const CACHE_LIMIT_BYTES = 48 * 1024 * 1024;
const cache = new Map<string, MediaFile>();
let cachedBytes = 0;

function remember(key: string, file: MediaFile) {
  cache.set(key, file);
  cachedBytes += file.data.length;
  for (const [oldKey, old] of cache) {
    if (cachedBytes <= CACHE_LIMIT_BYTES) break;
    cache.delete(oldKey);
    cachedBytes -= old.data.length;
  }
  return file;
}

async function loadOriginal(id: number) {
  const key = `${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { rows } = await query<MediaFile>('SELECT mime, data FROM media WHERE id = $1', [id]);
  return rows[0] && remember(key, rows[0]);
}

/** 取图片；width 是 MEDIA_WIDTHS 里的值时返回缩小后的 webp，原图本来就更小则直接给原图 */
export async function getMedia(id: number, width?: number) {
  const original = await loadOriginal(id);
  if (!original || !width || !(MEDIA_WIDTHS as readonly number[]).includes(width)) return original;
  const key = `${id}@${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const resized = await sharp(original.data)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  return remember(key, { mime: 'image/webp', data: resized.length < original.data.length ? resized : original.data });
}

export async function getMediaInfo(id: number) {
  const { rows } = await query<MediaInfo>('SELECT id, width, height FROM media WHERE id = $1', [id]);
  return rows[0];
}

export const mediaUrl = (id: number, width?: number) => (width ? `/media/${id}?w=${width}` : `/media/${id}`);

/** 给 <img srcset> 用：两档缩略图加原图 */
export const mediaSrcset = (id: number) =>
  [...MEDIA_WIDTHS.map((w) => `${mediaUrl(id, w)} ${w}w`), `${mediaUrl(id)} 1600w`].join(', ');
