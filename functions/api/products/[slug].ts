import { Env, fail, json, loadProductBundle } from '../../_shared';

export const onRequestGet = async ({ params, env }: { params: Record<string, string | string[]>; env: Env }) => {
  const slug = String(params.slug ?? '');
  const product = await loadProductBundle(env.DB, 'p.slug = ?', [slug]);
  if (!product) return fail(404, 'Product not found');
  const relatedRows = await env.DB.prepare(`
    SELECT slug FROM products
    WHERE published = 1 AND status = "active" AND id != ? AND category_id IS ?
    ORDER BY featured DESC, created_at DESC LIMIT 4
  `).bind(product.id, product.category_id).all<{ slug: string }>();
  const related = (await Promise.all((relatedRows.results ?? []).map((row: { slug: string }) => loadProductBundle(env.DB, 'p.slug = ?', [row.slug])))).filter(Boolean);
  return json({ product, related }, 200, { 'cache-control': 'public, max-age=120' });
};
