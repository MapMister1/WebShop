import { clearSessionCookie, Env, json } from '../../_shared';

export const onRequestPost = async (_context: { env: Env }) => json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
