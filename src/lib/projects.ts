import { query } from './db';
import { parseDiagrams, type ArchitectureSpec } from './architecture';

/** 没有封面图时显示的插画 */
export const PROJECT_ARTS = { seats: '座位插画', loop: '网络插画' } as const;
export type ProjectArt = keyof typeof PROJECT_ARTS;
export const isProjectArt = (value: unknown): value is ProjectArt =>
  typeof value === 'string' && Object.hasOwn(PROJECT_ARTS, value);

export type Project = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  stack: string[];
  order: number;
  published: boolean;
  coverId: number | null;
  coverAlt: string | null;
  coverPosition: string;
  art: ProjectArt | null;
  demo: string | null;
  source: string | null;
  body: string;
  /** 详情页上的动态图解，可以有多张 */
  architecture: ArchitectureSpec[];
};

export type ProjectInput = Omit<Project, 'id'>;

type Row = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  stack: string[];
  sort_order: number;
  published: boolean;
  cover_id: number | null;
  cover_alt: string | null;
  cover_position: string;
  art: string | null;
  demo: string | null;
  source: string | null;
  body: string;
  architecture: unknown;
};

const fromRow = (row: Row): Project => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  tags: row.tags,
  stack: row.stack,
  order: row.sort_order,
  published: row.published,
  coverId: row.cover_id,
  coverAlt: row.cover_alt,
  coverPosition: row.cover_position,
  art: isProjectArt(row.art) ? row.art : null,
  demo: row.demo,
  source: row.source,
  body: row.body,
  // 库里的数据也再校验一遍，坏数据就当没有图
  architecture: row.architecture ? parseDiagrams(row.architecture).specs : [],
});

const columns = `title, summary, tags, stack, sort_order, published, cover_id, cover_alt, cover_position, art, demo, source, body, architecture`;
const values = (p: ProjectInput) => [
  p.title,
  p.summary,
  p.tags,
  p.stack,
  p.order,
  p.published,
  p.coverId,
  p.coverAlt,
  p.coverPosition,
  p.art,
  p.demo,
  p.source,
  p.body,
  p.architecture.length ? JSON.stringify(p.architecture) : null,
];

// 首页和详情页每次都要项目列表；缓存在内存里，后台改动时清掉。
// 再加 60 秒过期，兜住导入脚本这类绕过网站直接改库的情况。
const LIST_TTL_MS = 60_000;
let listCache: { at: number; rows: Project[] } | undefined;

function invalidate() {
  listCache = undefined;
}

export async function listProjects({ includeDrafts = false } = {}) {
  if (!listCache || Date.now() - listCache.at > LIST_TTL_MS) {
    const { rows } = await query<Row>('SELECT * FROM projects ORDER BY sort_order, created_at');
    listCache = { at: Date.now(), rows: rows.map(fromRow) };
  }
  return includeDrafts ? listCache.rows : listCache.rows.filter((p) => p.published);
}

export async function getProject(id: string) {
  const { rows } = await query<Row>('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

/** 新建成功返回 true；id 已存在返回 false */
export async function createProject(id: string, input: ProjectInput) {
  const { rowCount } = await query(
    `INSERT INTO projects (id, ${columns})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO NOTHING`,
    [id, ...values(input)],
  );
  invalidate();
  return rowCount === 1;
}

export async function updateProject(id: string, input: ProjectInput) {
  await query(
    `UPDATE projects SET (${columns}, updated_at) =
     ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
     WHERE id = $1`,
    [id, ...values(input)],
  );
  invalidate();
}

export async function deleteProject(id: string) {
  await query('DELETE FROM projects WHERE id = $1', [id]);
  invalidate();
}
