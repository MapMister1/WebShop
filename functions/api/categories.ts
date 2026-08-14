import { Env, json } from '../_shared';

export const onRequestGet = async ({ env }: { env: Env }) => {
  const categories = await env.DB.prepare('SELECT id, name, slug, description, image_url FROM categories ORDER BY name ASC').all();
  return json({ categories: categories.results ?? [] }, 200, { 'cache-control': 'public, max-age=120' });
};
