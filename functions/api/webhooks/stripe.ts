import type { D1PreparedStatement } from '@cloudflare/workers-types';
import { enc, Env, fail, json, randomId, sha256Hex, timingSafeEqual, toHex } from '../../_shared';

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, request.headers.get('stripe-signature') ?? '', env.STRIPE_WEBHOOK_SECRET))) {
    return fail(400, 'Invalid webhook signature');
  }
  const event = JSON.parse(payload) as { id: string; type: string; data: { object: Record<string, unknown> } };
  const inserted = await env.DB.prepare('INSERT OR IGNORE INTO stripe_events (id, type, payload) VALUES (?, ?, ?)').bind(event.id, event.type, payload).run();
  if ((inserted.meta.changes ?? 0) === 0) return json({ ok: true, duplicate: true });
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    try {
      await createPaidOrder(env, event.data.object, event.id);
    } catch (err) {
      await env.DB.prepare('DELETE FROM stripe_events WHERE id = ? AND processed_at IS NULL').bind(event.id).run();
      return fail(500, err instanceof Error ? err.message : 'Webhook processing failed');
    }
  }
  if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
    await env.DB.prepare('UPDATE stripe_events SET processed_at = datetime("now") WHERE id = ?').bind(event.id).run();
  }
  return json({ ok: true });
};

export async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((part) => {
    const [key, value] = part.split('=');
    return [key, value];
  }));
  if (!parts.t || !parts.v1) return false;
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, enc(`${parts.t}.${payload}`));
  return timingSafeEqual(toHex(new Uint8Array(digest)), parts.v1);
}

async function createPaidOrder(env: Env, session: Record<string, unknown>, eventId: string) {
  const sessionId = String(session.id);
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE stripe_checkout_session_id = ?').bind(sessionId).first();
  if (existing) return;
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const cart = JSON.parse(metadata.cart ?? '[]') as Array<{ productId: string; variantId: string | null; quantity: number }>;
  const orderId = randomId('ord_');
  const orderNumber = `AS-${Date.now().toString(36).toUpperCase()}`;
  const customer = (session.customer_details ?? {}) as Record<string, unknown>;
  const address = (customer.address ?? {}) as Record<string, unknown>;
  const email = String(customer.email ?? session.customer_email ?? '');
  const customerId = randomId('cus_');
  const shippingAddress = JSON.stringify(address);
  const orderStatements: D1PreparedStatement[] = [
    env.DB.prepare('INSERT OR IGNORE INTO customers (id, email, name, phone, address_json) VALUES (?, ?, ?, ?, ?)').bind(customerId, email, customer.name ?? null, customer.phone ?? null, shippingAddress),
    env.DB.prepare(`
      INSERT INTO orders (id, order_number, customer_id, email, stripe_checkout_session_id, stripe_payment_intent_id, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, total, currency, shipping_name, shipping_address_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderId, orderNumber, customerId, email, sessionId, session.payment_intent ?? null, 'paid', 'unfulfilled', Number(metadata.subtotal ?? 0), Number(metadata.discount ?? 0), 0, Number(session.amount_total ?? 0), String(session.currency ?? env.STRIPE_CURRENCY), customer.name ?? null, shippingAddress)
  ];
  const inventoryStatements: D1PreparedStatement[] = [];
  for (const item of cart) {
    const product = await env.DB.prepare('SELECT id, title, price, sku, currency FROM products WHERE id = ? AND published = 1 AND status = "active"').bind(item.productId).first<Record<string, unknown>>();
    if (!product) throw new Error('Paid order contains unavailable product');
    let unitPrice = Number(product.price);
    let variantName: string | null = null;
    let sku = String(product.sku);
    if (item.variantId) {
      const variant = await env.DB.prepare('SELECT id, name, sku, price, inventory FROM product_variants WHERE id = ? AND product_id = ?').bind(item.variantId, item.productId).first<Record<string, unknown>>();
      if (!variant) throw new Error('Paid order contains invalid variant');
      unitPrice = variant.price == null ? unitPrice : Number(variant.price);
      variantName = String(variant.name);
      sku = String(variant.sku);
      inventoryStatements.push(env.DB.prepare('UPDATE product_variants SET inventory = inventory - ?, updated_at = datetime("now") WHERE id = ? AND inventory >= ?').bind(item.quantity, item.variantId, item.quantity));
    }
    orderStatements.push(env.DB.prepare(`
      INSERT INTO order_items (id, order_id, product_id, variant_id, title, variant_name, sku, quantity, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(randomId('item_'), orderId, item.productId, item.variantId, product.title, variantName, sku, item.quantity, unitPrice, unitPrice * item.quantity));
  }
  if (inventoryStatements.length > 0) {
    const inventoryResults = await env.DB.batch(inventoryStatements);
    if (inventoryResults.some((result) => result.meta.changes === 0)) throw new Error('Insufficient inventory while processing paid order');
  }
  await env.DB.batch(orderStatements);
  await env.DB.prepare('UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ? AND code != ""').bind(metadata.discount_code ?? '').run();
  await env.DB.prepare('UPDATE stripe_events SET processed_at = datetime("now") WHERE id = ?').bind(eventId).run();
}
