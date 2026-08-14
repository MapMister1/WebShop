import { Env, json, requireAdmin } from '../../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  const [sales, orders, pending, completed, refunds, products, lowStock, recent] = await Promise.all([
    env.DB.prepare('SELECT COALESCE(SUM(total), 0) AS value FROM orders WHERE payment_status = "paid"').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM orders').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM orders WHERE fulfillment_status IN ("unfulfilled", "processing")').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM orders WHERE fulfillment_status = "delivered"').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM orders WHERE payment_status = "refunded"').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM products').first(),
    env.DB.prepare('SELECT COUNT(*) AS value FROM product_variants WHERE inventory <= 3').first(),
    env.DB.prepare('SELECT order_number, email, total, currency, fulfillment_status, created_at FROM orders ORDER BY created_at DESC LIMIT 10').all()
  ]);
  return json({ sales, orders, pending, completed, refunds, products, lowStock, recentOrders: recent.results ?? [] });
};
