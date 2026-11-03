import pg from 'pg';
import { DATABASE_URL } from 'astro:env/server';
import { schemaSql } from './schema';

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });

let schemaReady: Promise<unknown> | undefined;

/** 第一次查询前自动建表 */
export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []) {
  schemaReady ??= pool.query(schemaSql).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  await schemaReady;
  return pool.query<T>(text, params);
}
