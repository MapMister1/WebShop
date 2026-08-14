import { Env, fail, json, productInputSchema, randomId, readBody, requireAdmin } from '../../../_shared';

export const onRequestPatch = async ({ request, env, params }: { request: Request; env: Env; params: Record<string, string | string[]> }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  try {
    const id = String(params.id);
    const body = await readBody(request, productInputSchema);
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE products SET slug = ?, title = ?, description = ?, short_description = ?, category_id = ?, price = ?, compare_at_price = ?, cost_price = ?, currency = ?, sku = ?, status = ?, featured = ?, published = ?, supplier_name = ?, supplier_product_url = ?, supplier_product_id = ?, supplier_cost = ?, fulfillment_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(body.slug, body.title, body.description, body.short_description, body.category_id ?? null, body.price, body.compare_at_price ?? null, body.cost_price ?? null, body.currency, body.sku, body.status, body.featured ? 1 : 0, body.published ? 1 : 0, body.supplier_name ?? null, body.supplier_product_url || null, body.supplier_product_id ?? null, body.supplier_cost ?? null, body.fulfillment_notes ?? null, id),
      env.DB.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id),
      env.DB.prepare('DELETE FROM product_variants WHERE product_id = ?').bind(id),
      ...(body.images ?? []).map((image) => env.DB.prepare('INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)').bind(randomId('img_'), id, image.image_url, image.alt_text, image.sort_order)),
      ...(body.variants ?? []).map((variant) => env.DB.prepare('INSERT INTO product_variants (id, product_id, name, sku, price, inventory, attributes) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(randomId('var_'), id, variant.name, variant.sku, variant.price ?? null, variant.inventory, JSON.stringify(variant.attributes)))
    ]);
    return json({ product: { id, ...body } });
  } catch {
    return fail(400, 'Invalid product data');
  }
};

export const onRequestDelete = async ({ request, env, params }: { request: Request; env: Env; params: Record<string, string | string[]> }) => {
  const auth = await requireAdmin(request, env);
  if ('response' in auth) return auth.response;
  await env.DB.prepare('UPDATE products SET published = 0, status = "deleted", updated_at = datetime("now") WHERE id = ?').bind(String(params.id)).run();
  return json({ ok: true });
};
