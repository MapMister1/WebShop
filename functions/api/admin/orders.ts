import { Env, json, requireAdmin } from '../../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all();
  return json({ orders: orders.results ?? [] });
};
