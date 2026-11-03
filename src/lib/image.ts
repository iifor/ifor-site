import sharp from 'sharp';

const MAX_WIDTH = 1600;

/** 统一压成 webp，最宽 1600px；网站上传和导入脚本共用 */
export async function toWebp(input: Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { mime: 'image/webp', data, width: info.width, height: info.height };
}
