import { z } from 'zod';
import { Env, fail, json, randomId, readBody, sessionCookie, sha256Hex, verifyPassword } from '../../_shared';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await readBody(request, schema);
    const user = await env.DB.prepare('SELECT id, email, password_hash FROM admin_users WHERE email = ?').bind(body.email.toLowerCase()).first<{ id: string; password_hash: string }>();
    if (!user || !(await verifyPassword(body.password, user.password_hash))) return fail(401, 'Invalid email or password');
    const token = crypto.randomUUID() + crypto.randomUUID();
    await env.DB.prepare('INSERT INTO admin_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime("now", "+8 hours"))').bind(randomId('ses_'), user.id, await sha256Hex(`${env.ADMIN_SESSION_SECRET}:${token}`)).run();
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token) });
  } catch {
    return fail(400, 'Invalid login request');
  }
};
