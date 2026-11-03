// 把 db/seed/projects 里的 Markdown 项目导入数据库。已存在的项目会跳过（只补上还没有的图解），可以重复运行。
// 用法：npm run db:seed
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { parse } from 'yaml';
import { schemaSql } from '../src/lib/schema.ts';
import { toWebp } from '../src/lib/image.ts';

const seedDir = path.resolve(import.meta.dirname, '../db/seed/projects');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function uploadImage(file: string) {
  const image = await toWebp(await readFile(file));
  const { rows } = await client.query<{ id: number }>(
    'INSERT INTO media (mime, data, width, height) VALUES ($1, $2, $3, $4) RETURNING id',
    [image.mime, image.data, image.width, image.height],
  );
  return rows[0].id;
}

await client.connect();
await client.query(schemaSql);

for (const name of (await readdir(seedDir)).filter((f) => f.endsWith('.md'))) {
  const id = name.replace(/\.md$/, '');
  const raw = await readFile(path.join(seedDir, name), 'utf8');
  const [, frontmatter, markdown] = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) ?? [];
  const data = parse(frontmatter);
  const architecture = data.architecture ? JSON.stringify(data.architecture) : null;

  const exists = await client.query('SELECT 1 FROM projects WHERE id = $1', [id]);
  if (exists.rowCount) {
    const filled = architecture
      ? await client.query('UPDATE projects SET architecture = $2 WHERE id = $1 AND architecture IS NULL', [id, architecture])
      : { rowCount: 0 };
    console.log(filled.rowCount ? `补上 ${id} 的图解` : `跳过 ${id}（已存在）`);
    continue;
  }

  // 正文里引用的本地图片也传进数据库，换成 /media/<id>
  let body = markdown.trim();
  for (const [, , src] of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    if (/^(https?:)?\//.test(src)) continue;
    const mediaId = await uploadImage(path.resolve(seedDir, src));
    body = body.replace(`(${src})`, `(/media/${mediaId})`);
  }

  const coverId = data.cover ? await uploadImage(path.resolve(seedDir, data.cover)) : null;

  await client.query(
    `INSERT INTO projects (id, title, summary, tags, stack, sort_order, cover_id, cover_alt, cover_position, art, demo, source, body, architecture)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      data.title,
      data.summary,
      data.tags ?? [],
      data.stack ?? [],
      data.order ?? 0,
      coverId,
      data.coverAlt ?? null,
      data.coverPosition ?? 'center',
      data.art ?? null,
      data.demo ?? null,
      data.source ?? null,
      body,
      architecture,
    ],
  );
  console.log(`导入 ${id}`);
}

await client.end();
