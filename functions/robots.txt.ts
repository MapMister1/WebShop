import { Env } from './_shared';

export const onRequestGet = async ({ env }: { env: Env }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${env.PUBLIC_SITE_URL}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
