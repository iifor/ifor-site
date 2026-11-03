import { query } from './db';

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
  art: 'seats' | null;
  demo: string | null;
  source: string | null;
  body: string;
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
  art: row.art === 'seats' ? 'seats' : null,
  demo: row.demo,
  source: row.source,
  body: row.body,
});

const columns = `title, summary, tags, stack, sort_order, published, cover_id, cover_alt, cover_position, art, demo, source, body`;
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
];

export async function listProjects({ includeDrafts = false } = {}) {
  const { rows } = await query<Row>(
    `SELECT * FROM projects ${includeDrafts ? '' : 'WHERE published'} ORDER BY sort_order, created_at`,
  );
  return rows.map(fromRow);
}

export async function getProject(id: string) {
  const { rows } = await query<Row>('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

/** 新建成功返回 true；id 已存在返回 false */
export async function createProject(id: string, input: ProjectInput) {
  const { rowCount } = await query(
    `INSERT INTO projects (id, ${columns})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO NOTHING`,
    [id, ...values(input)],
  );
  return rowCount === 1;
}

export async function updateProject(id: string, input: ProjectInput) {
  await query(
    `UPDATE projects SET (${columns}, updated_at) =
     ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
     WHERE id = $1`,
    [id, ...values(input)],
  );
}

export async function deleteProject(id: string) {
  await query('DELETE FROM projects WHERE id = $1', [id]);
}
