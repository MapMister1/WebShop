import { Env, json } from '../_shared';

export const onRequestGet = async ({ env }: { env: Env }) => {
  const rows = await env.DB.prepare('SELECT key, value FROM settings WHERE public = 1').all<{ key: string; value: string }>();
  return json({ settings: Object.fromEntries((rows.results ?? []).map((row: { key: string; value: string }) => [row.key, row.value])) }, 200, { 'cache-control': 'public, max-age=120' });
};
