import { query } from './db';

export type Message = {
  id: number;
  name: string;
  contact: string;
  content: string;
  read: boolean;
  createdAt: Date;
};

export const MESSAGE_LIMITS = { name: 50, contact: 100, content: 2000 };

export async function addMessage(input: { name: string; contact: string; content: string }) {
  await query('INSERT INTO messages (name, contact, content) VALUES ($1, $2, $3)', [
    input.name,
    input.contact,
    input.content,
  ]);
}

export async function listMessages() {
  const { rows } = await query<Message & { created_at: Date }>(
    'SELECT id, name, contact, content, read, created_at FROM messages ORDER BY created_at DESC',
  );
  return rows.map(({ created_at, ...m }) => ({ ...m, createdAt: created_at }));
}

export async function countUnread() {
  const { rows } = await query<{ count: string }>('SELECT count(*) FROM messages WHERE NOT read');
  return Number(rows[0].count);
}

export async function setRead(id: number, read: boolean) {
  await query('UPDATE messages SET read = $2 WHERE id = $1', [id, read]);
}

export async function deleteMessage(id: number) {
  await query('DELETE FROM messages WHERE id = $1', [id]);
}
