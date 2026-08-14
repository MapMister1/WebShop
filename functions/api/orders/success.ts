import { Env, fail, json } from '../../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId) return fail(400, 'Missing session ID');
  const order = await env.DB.prepare('SELECT * FROM orders WHERE stripe_checkout_session_id = ? AND payment_status = "paid"').bind(sessionId).first<Record<string, unknown>>();
  if (!order) return fail(404, 'Payment is confirmed by webhook before orders appear. Please refresh in a moment.');
  const items = await env.DB.prepare('SELECT title, variant_name, quantity, unit_price FROM order_items WHERE order_id = ?').bind(order.id).all();
  return json({
    order: {
      order_number: order.order_number,
      email: order.email,
      total: order.total,
      currency: order.currency,
      shipping_name: order.shipping_name,
      shipping_address: order.shipping_address_json,
      items: items.results ?? []
    }
  });
};
