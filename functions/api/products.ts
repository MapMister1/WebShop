import { Env, json, publicProduct } from '../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '12')));
  const offset = (page - 1) * limit;
  const where = ['p.published = 1', 'p.status = "active"'];
  const bindings: unknown[] = [];
  const ids = url.searchParams.get('ids');
  if (ids) {
    const idList = ids.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 50);
    where.push(`p.id IN (${idList.map(() => '?').join(',')})`);
    bindings.push(...idList);
  }
  const q = url.searchParams.get('q');
  if (q) {
    where.push('(p.title LIKE ? OR p.short_description LIKE ? OR p.sku LIKE ?)');
    bindings.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const category = url.searchParams.get('category');
  if (category) {
    where.push('c.slug = ?');
    bindings.push(category);
  }
  const min = Number(url.searchParams.get('min'));
  if (Number.isFinite(min) && min > 0) {
    where.push('p.price >= ?');
    bindings.push(Math.round(min * 100));
  }
  const max = Number(url.searchParams.get('max'));
  if (Number.isFinite(max) && max > 0) {
    where.push('p.price <= ?');
    bindings.push(Math.round(max * 100));
  }
  const sortMap: Record<string, string> = {
    featured: 'p.featured DESC, p.created_at DESC',
    newest: 'p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC'
  };
  const orderBy = sortMap[url.searchParams.get('sort') ?? 'featured'] ?? sortMap.featured;
  const base = `FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`;
  const total = await env.DB.prepare(`SELECT COUNT(*) AS count ${base}`).bind(...bindings).first<{ count: number }>();
  const rows = await env.DB.prepare(`
    SELECT p.id, p.slug, p.title, p.description, p.short_description, p.category_id, c.name AS category_name,
      p.price, p.compare_at_price, p.currency, p.sku, p.status, p.featured, p.published, p.created_at, p.updated_at
    ${base}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, offset).all<Record<string, unknown>>();
  const products = await Promise.all((rows.results ?? []).map(async (row: Record<string, unknown>) => {
    const images = await env.DB.prepare('SELECT id, product_id, image_url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC').bind(row.id).all();
    const variants = await env.DB.prepare('SELECT id, product_id, name, sku, price, inventory, attributes FROM product_variants WHERE product_id = ? ORDER BY name ASC').bind(row.id).all<Record<string, unknown>>();
    return publicProduct(row, images.results ?? [], (variants.results ?? []).map((v: Record<string, unknown>) => ({ ...v, attributes: JSON.parse(String(v.attributes ?? '{}')) })));
  }));
  return json({ products, total: total?.count ?? 0, page, pageSize: limit }, 200, { 'cache-control': 'public, max-age=60' });
};
