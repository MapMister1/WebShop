import type { D1Database } from '@cloudflare/workers-types';
import { checkoutSchema, Env, fail, json, readBody } from '../_shared';

interface CheckoutLine {
  productId: string;
  variantId: string | null;
  title: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const body = await readBody(request, checkoutSchema);
    const lines: CheckoutLine[] = [];
    for (const item of body.items) {
      const product = await env.DB.prepare('SELECT id, title, price, currency, sku, published, status FROM products WHERE id = ?').bind(item.productId).first<Record<string, unknown>>();
      if (!product || !product.published || product.status !== 'active') return fail(400, 'A product in your cart is unavailable.');
      let unitPrice = Number(product.price);
      let variantName: string | null = null;
      let sku = String(product.sku);
      if (item.variantId) {
        const variant = await env.DB.prepare('SELECT id, name, sku, price, inventory FROM product_variants WHERE id = ? AND product_id = ?').bind(item.variantId, item.productId).first<Record<string, unknown>>();
        if (!variant) return fail(400, 'A selected variant is invalid.');
        if (Number(variant.inventory) < item.quantity) return fail(409, 'One or more items are out of stock.');
        unitPrice = variant.price == null ? unitPrice : Number(variant.price);
        variantName = String(variant.name);
        sku = String(variant.sku);
      }
      lines.push({ productId: item.productId, variantId: item.variantId ?? null, title: String(product.title), variantName, sku, quantity: item.quantity, unitPrice, currency: String(product.currency) });
    }
    const currency = lines[0]?.currency ?? env.STRIPE_CURRENCY;
    if (!lines.every((line) => line.currency === currency)) return fail(400, 'Mixed currency carts are not supported.');
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const discount = await calculateDiscount(env.DB, body.discountCode, subtotal);
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', `${env.PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${env.PUBLIC_SITE_URL}/cart?checkout=cancelled`);
    params.set('payment_method_types[0]', 'card');
    env.SHIPPING_COUNTRIES.split(',').map((c) => c.trim()).filter(Boolean).forEach((country, idx) => params.set(`shipping_address_collection[allowed_countries][${idx}]`, country));
    lines.forEach((line, idx) => {
      params.set(`line_items[${idx}][quantity]`, String(line.quantity));
      params.set(`line_items[${idx}][price_data][currency]`, currency);
      params.set(`line_items[${idx}][price_data][unit_amount]`, String(line.unitPrice));
      params.set(`line_items[${idx}][price_data][product_data][name]`, line.variantName ? `${line.title} - ${line.variantName}` : line.title);
      params.set(`line_items[${idx}][price_data][product_data][metadata][sku]`, line.sku);
    });
    if (discount.amount > 0) {
      params.set('discounts[0][coupon]', await createStripeCoupon(env, currency, discount.amount));
    }
    params.set('metadata[cart]', JSON.stringify(lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity }))));
    params.set('metadata[discount_code]', discount.code ?? '');
    params.set('metadata[subtotal]', String(subtotal));
    params.set('metadata[discount]', String(discount.amount));
    const session = await stripePost<{ url: string }>('/v1/checkout/sessions', env.STRIPE_SECRET_KEY, params);
    return json({ url: session.url });
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : 'Unable to start checkout');
  }
};

export async function calculateDiscount(db: D1Database, code: string | undefined, subtotal: number) {
  if (!code) return { amount: 0, code: null as string | null };
  const discount = await db.prepare(`
    SELECT * FROM discount_codes
    WHERE lower(code) = lower(?) AND active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (maximum_uses IS NULL OR used_count < maximum_uses)
  `).bind(code).first<Record<string, unknown>>();
  if (!discount) throw new Error('Discount code is invalid.');
  if (discount.minimum_order_value && subtotal < Number(discount.minimum_order_value)) throw new Error('Cart does not meet the discount minimum.');
  const percentage = Number(discount.percentage_discount ?? 0);
  const fixed = Number(discount.fixed_discount ?? 0);
  const amount = Math.min(subtotal, Math.max(fixed, Math.round(subtotal * (percentage / 100))));
  return { amount, code: String(discount.code) };
}

async function createStripeCoupon(env: Env, currency: string, amount: number) {
  const params = new URLSearchParams();
  params.set('amount_off', String(amount));
  params.set('currency', currency);
  params.set('duration', 'once');
  const coupon = await stripePost<{ id: string }>('/v1/coupons', env.STRIPE_SECRET_KEY, params);
  return coupon.id;
}

async function stripePost<T>(path: string, key: string, body: URLSearchParams): Promise<T> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Stripe request failed');
  return data as T;
}
