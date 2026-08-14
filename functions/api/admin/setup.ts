import { z } from 'zod';
import { Env, fail, hashPassword, json, randomId, readBody } from '../../_shared';

const schema = z.object({ email: z.string().email(), password: z.string().min(12), bootstrapKey: z.string().min(16) });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await readBody(request, schema);
    if (body.bootstrapKey !== env.ADMIN_BOOTSTRAP_KEY) return fail(403, 'Invalid bootstrap key');
    const existing = await env.DB.prepare('SELECT COUNT(*) AS count FROM admin_users').first<{ count: number }>();
    if ((existing?.count ?? 0) > 0) return fail(409, 'Admin already exists');
    await env.DB.prepare('INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)').bind(randomId('adm_'), body.email.toLowerCase(), await hashPassword(body.password)).run();
    return json({ ok: true });
  } catch {
    return fail(400, 'Invalid admin setup request');
  }
};
