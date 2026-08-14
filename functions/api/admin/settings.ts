import { z } from 'zod';
import { Env, fail, json, readBody, requireAdmin } from '../../_shared';

const schema = z.object({ settings: z.record(z.string().max(12000)) });

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  const rows = await env.DB.prepare('SELECT key, value FROM settings ORDER BY key').all<{ key: string; value: string }>();
  return json({ settings: Object.fromEntries((rows.results ?? []).map((row: { key: string; value: string }) => [row.key, row.value])) });
};

export const onRequestPatch = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  try {
    const body = await readBody(request, schema);
    await env.DB.batch(Object.entries(body.settings).map(([key, value]) => env.DB.prepare('INSERT INTO settings (key, value, public) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime("now")').bind(key, value)));
    return json({ ok: true });
  } catch {
    return fail(400, 'Invalid settings payload');
  }
};
