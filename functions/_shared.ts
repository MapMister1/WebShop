import { z } from 'zod';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  PRODUCT_IMAGES?: R2Bucket;
  PUBLIC_STORE_NAME: string;
  PUBLIC_SITE_URL: string;
  PUBLIC_STRIPE_KEY?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_SESSION_SECRET: string;
  ADMIN_BOOTSTRAP_KEY: string;
  STRIPE_CURRENCY: string;
  SHIPPING_COUNTRIES: string;
}

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().min(1).max(99)
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  discountCode: z.string().trim().max(64).optional()
});

export const productInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(1).max(12000),
  short_description: z.string().min(1).max(500),
  category_id: z.string().nullable().optional(),
  price: z.number().int().min(1),
  compare_at_price: z.number().int().min(0).nullable().optional(),
  cost_price: z.number().int().min(0).nullable().optional(),
  currency: z.string().default('usd'),
  sku: z.string().trim().min(1).max(80),
  status: z.string().default('active'),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  images: z.array(z.object({
    image_url: z.string().url(),
    alt_text: z.string().min(1).max(180),
    sort_order: z.number().int().min(0).default(0)
  })).max(12).default([]),
  variants: z.array(z.object({
    name: z.string().min(1).max(120),
    sku: z.string().min(1).max(80),
    price: z.number().int().min(0).nullable().optional(),
    inventory: z.number().int().min(0),
    attributes: z.record(z.string()).default({})
  })).max(30).default([]),
  supplier_name: z.string().max(200).optional().nullable(),
  supplier_product_url: z.string().url().optional().nullable().or(z.literal('')),
  supplier_product_id: z.string().max(200).optional().nullable(),
  supplier_cost: z.number().int().min(0).optional().nullable(),
  fulfillment_notes: z.string().max(2000).optional().nullable()
});

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

export function fail(status: number, message: string) {
  return json({ error: message }, status);
}

type RequestLike = { text(): Promise<string>; headers: { get(name: string): string | null } };

export async function readBody<T>(request: RequestLike, schema: z.ZodType<T>) {
  const text = await request.text();
  if (text.length > 128_000) throw new Error('Request too large');
  return schema.parse(JSON.parse(text || '{}'));
}

export function publicProduct(row: Record<string, unknown>, images: unknown[], variants: unknown[]) {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description),
    short_description: String(row.short_description),
    category_id: row.category_id ? String(row.category_id) : null,
    category_name: row.category_name ? String(row.category_name) : null,
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    currency: String(row.currency),
    sku: String(row.sku),
    status: String(row.status),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    images,
    variants
  };
}

export async function loadProductBundle(db: D1Database, whereSql: string, bindings: unknown[], includeUnpublished = false) {
  const publishSql = includeUnpublished ? '' : ' AND p.published = 1 AND p.status = "active"';
  const product = await db.prepare(`
    SELECT p.*, c.name AS category_name
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${whereSql}${publishSql}
  `).bind(...bindings).first<Record<string, unknown>>();
  if (!product) return null;
  const images = await db.prepare('SELECT id, product_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').bind(product.id).all();
  const variants = await db.prepare('SELECT id, product_id, name, sku, price, inventory, attributes FROM product_variants WHERE product_id = ? ORDER BY name ASC').bind(product.id).all<Record<string, unknown>>();
  return publicProduct(product, images.results ?? [], (variants.results ?? []).map((v: Record<string, unknown>) => ({ ...v, attributes: JSON.parse(String(v.attributes ?? '{}')) })));
}

export async function getAdmin(request: RequestLike, env: Env) {
  const token = getCookie(request, 'admin_session');
  if (!token) return null;
  const tokenHash = await sha256Hex(`${env.ADMIN_SESSION_SECRET}:${token}`);
  return env.DB.prepare(`
    SELECT au.id, au.email
    FROM admin_sessions s JOIN admin_users au ON au.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).bind(tokenHash).first<{ id: string; email: string }>();
}

export async function requireAdmin(request: RequestLike, env: Env) {
  const admin = await getAdmin(request, env);
  if (!admin) return { response: fail(401, 'Admin authentication required') };
  return { admin };
}

export function sessionCookie(token: string, maxAge = 60 * 60 * 8) {
  return `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

export function getCookie(request: RequestLike, name: string) {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 160_000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const actual = await hashPassword(password, fromBase64(salt));
  return timingSafeEqual(actual, stored);
}

export async function sha256Hex(text: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc(text))));
}

export function randomId(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

export function enc(text: string) {
  return new TextEncoder().encode(text);
}

export function toHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function clientIp(request: RequestLike) {
  return request.headers.get('cf-connecting-ip') ?? 'local';
}
