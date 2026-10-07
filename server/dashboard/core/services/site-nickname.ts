import { openStore } from '../storage';

const store = openStore();
const read = store.prepare('SELECT value FROM site_preferences WHERE name = ?');
const write = store.prepare(`
  INSERT INTO site_preferences (name, value) VALUES (?, ?)
  ON CONFLICT(name) DO UPDATE SET value = excluded.value
`);

export async function readSiteNickname(): Promise<string | null> {
  const row = await read.get('display_name');
  return typeof row?.value === 'string' && row.value.trim() ? row.value : null;
}

export async function writeSiteNickname(value: string): Promise<void> {
  await write.run('display_name', value);
}
