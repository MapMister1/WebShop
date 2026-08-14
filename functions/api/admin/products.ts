import { Env, fail, json, productInputSchema, randomId, readBody, requireAdmin } from '../../_shared';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  const products = await env.DB.prepare('SELECT * FROM products ORDER BY updated_at DESC').all();
  return json({ products: products.results ?? [] });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  try {
    const body = await readBody(request, productInputSchema);
    const id = randomId('prd_');
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO products (id, slug, title, description, short_description, category_id, price, compare_at_price, cost_price, currency, sku, status, featured, published, supplier_name, supplier_product_url, supplier_product_id, supplier_cost, fulfillment_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, body.slug, body.title, body.description, body.short_description, body.category_id ?? null, body.price, body.compare_at_price ?? null, body.cost_price ?? null, body.currency, body.sku, body.status, body.featured ? 1 : 0, body.published ? 1 : 0, body.supplier_name ?? null, body.supplier_product_url || null, body.supplier_product_id ?? null, body.supplier_cost ?? null, body.fulfillment_notes ?? null),
      ...(body.images ?? []).map((image) => env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)').bind(randomId('img_'), id, image.image_url, image.alt_text, image.sort_order)),
      ...(body.variants ?? []).map((variant) => env.DB.prepare('INSERT INTO product_variants (id, product_id, name, sku, price, inventory, attributes) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(randomId('var_'), id, variant.name, variant.sku, variant.price ?? null, variant.inventory, JSON.stringify(variant.attributes)))
    ]);
    return json({ product: { id, ...body } }, 201);
  } catch {
    return fail(400, 'Invalid product data');
  }
};
