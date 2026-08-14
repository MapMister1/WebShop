import { Env } from './_shared';

export const onRequestGet = async ({ env }: { env: Env }) => {
  const rows = await env.DB.prepare('SELECT slug, updated_at FROM products WHERE published = 1 AND status = "active" ORDER BY updated_at DESC').all<{ slug: string; updated_at: string }>();
  const staticUrls = ['', '/shop', '/about', '/contact', '/shipping', '/returns', '/privacy', '/terms'];
  const urls = [
    ...staticUrls.map((path) => `<url><loc>${env.PUBLIC_SITE_URL}${path}</loc></url>`),
    ...(rows.results ?? []).map((row: { slug: string; updated_at: string }) => `<url><loc>${env.PUBLIC_SITE_URL}/products/${row.slug}</loc><lastmod>${row.updated_at.slice(0, 10)}</lastmod></url>`)
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
};
