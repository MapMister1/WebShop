import { z } from 'zod';
import { clientIp, Env, fail, json, readBody, randomId } from '../_shared';

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(220),
  message: z.string().trim().min(10).max(4000),
  website: z.string().optional()
});

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await readBody(request, schema);
    if (body.website) return json({ ok: true });
    const ip = clientIp(request);
    const recent = await env.DB.prepare('SELECT COUNT(*) AS count FROM contact_messages WHERE ip = ? AND created_at > datetime("now", "-10 minutes")').bind(ip).first<{ count: number }>();
    if ((recent?.count ?? 0) > 4) return fail(429, 'Too many messages. Please try again later.');
    await env.DB.prepare('INSERT INTO contact_messages (id, name, email, message, ip) VALUES (?, ?, ?, ?, ?)').bind(randomId('msg_'), body.name, body.email, body.message, ip).run();
    return json({ ok: true });
  } catch {
    return fail(400, 'Invalid contact message');
  }
};
