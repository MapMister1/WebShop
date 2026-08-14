import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { discountPercent, formatMoney } from '../src/lib/format';
import { checkoutSchema } from '../functions/_shared';
import { calculateDiscount } from '../functions/api/checkout';
import { verifyStripeSignature } from '../functions/api/webhooks/stripe';

function mockDb(discount: Record<string, unknown> | null) {
  return {
    prepare: () => ({
      bind: () => ({
        first: vi.fn().mockResolvedValue(discount)
      })
    })
  } as unknown as D1Database;
}

async function sign(payload: string, secret: string, timestamp: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('formatting', () => {
  it('formats cents as currency', () => {
    expect(formatMoney(2899, 'usd')).toBe('$28.99');
  });

  it('calculates discount percentages only when compare-at is higher', () => {
    expect(discountPercent(2500, 5000)).toBe(50);
    expect(discountPercent(5000, 2500)).toBeNull();
  });
});

describe('checkout validation', () => {
  it('rejects invalid quantities', () => {
    expect(() => checkoutSchema.parse({ items: [{ productId: 'p1', quantity: 0 }] })).toThrow();
    expect(() => checkoutSchema.parse({ items: [{ productId: 'p1', quantity: 100 }] })).toThrow();
  });

  it('accepts a minimal valid cart', () => {
    expect(checkoutSchema.parse({ items: [{ productId: 'p1', variantId: null, quantity: 2 }] }).items[0].quantity).toBe(2);
  });
});

describe('discount calculations', () => {
  it('applies percentage discounts server side', async () => {
    const result = await calculateDiscount(mockDb({ code: 'SAVE', percentage_discount: 20, fixed_discount: null, minimum_order_value: 1000 }), 'SAVE', 5000);
    expect(result.amount).toBe(1000);
  });

  it('caps fixed discounts to subtotal', async () => {
    const result = await calculateDiscount(mockDb({ code: 'BIG', percentage_discount: null, fixed_discount: 9999, minimum_order_value: 0 }), 'BIG', 3000);
    expect(result.amount).toBe(3000);
  });

  it('rejects missing discounts', async () => {
    await expect(calculateDiscount(mockDb(null), 'NOPE', 3000)).rejects.toThrow('invalid');
  });
});

describe('stripe webhook signatures', () => {
  it('verifies valid signatures', async () => {
    const payload = JSON.stringify({ id: 'evt_test' });
    const secret = 'whsec_test';
    const timestamp = '123456';
    const signature = await sign(payload, secret, timestamp);
    await expect(verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret)).resolves.toBe(true);
  });

  it('rejects invalid signatures', async () => {
    await expect(verifyStripeSignature('{}', 't=1,v1=bad', 'whsec_test')).resolves.toBe(false);
  });
});
