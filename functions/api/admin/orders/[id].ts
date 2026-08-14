import { z } from 'zod';
import { Env, fail, json, readBody, requireAdmin } from '../../../_shared';

const schema = z.object({
  fulfillment_status: z.enum(['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled']),
  tracking_number: z.string().max(200).optional()
});

export const onRequestPatch = async ({ request, env, params }: { request: Request; env: Env; params: Record<string, string | string[]> }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  try {
    const body = await readBody(request, schema);
    await env.DB.prepare('UPDATE orders SET fulfillment_status = ?, tracking_number = ?, updated_at = datetime("now") WHERE id = ?').bind(body.fulfillment_status, body.tracking_number ?? null, String(params.id)).run();
    return json({ ok: true });
  } catch {
    return fail(400, 'Invalid order update');
  }
};
