# Atelier Supply Cloudflare Pages Store

Production-oriented dropshipping ecommerce starter for Cloudflare Pages, Pages Functions, D1, R2-ready product images, and Stripe Checkout.

## Stack

- React, TypeScript, Vite
- Cloudflare Pages Functions
- Cloudflare D1 migrations
- Optional Cloudflare R2 product image storage
- Stripe Checkout and signed Stripe webhooks
- Lightweight admin auth with PBKDF2 password hashing and httpOnly sessions

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment placeholders:

```bash
cp .env.example .env
```

3. Create a local D1 database through Wrangler:

```bash
npx wrangler d1 create webshop
```

Put the returned production database ID into `wrangler.toml`.

4. Apply migrations and seed local data:

```bash
npm run db:migrate:local
npm run db:seed:local
```

5. Start local Pages development:

```bash
npm run cf:preview
```

If running `wrangler pages dev` directly, bind local resources explicitly:

```bash
wrangler pages dev dist --d1=DB=webshop --r2=PRODUCT_IMAGES=atelier-product-images
```

For frontend-only work you can run:

```bash
npm run dev
```

## Stripe

Create a Stripe account, then configure:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_STRIPE_KEY`

The browser sends only product IDs, variant IDs, quantities, and an optional discount code. The server reads D1, validates published products and variants, recalculates prices and discounts, creates a Stripe Checkout Session, and relies on the signed webhook before creating the paid order.

Set the webhook endpoint in Stripe to:

```text
https://your-domain.com/api/webhooks/stripe
```

Listen for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

## GitHub-connected Cloudflare Pages Deployment

The repository is configured for Cloudflare Pages Git integration. Cloudflare's Vite settings for this project are:

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` |

To connect the repository:

1. Push this project to the `main` branch of your GitHub repository.
2. In Cloudflare Dashboard, open **Workers & Pages** and choose **Create application → Pages → Connect to Git**.
3. Authorize the Cloudflare GitHub application, select the `WebShop` repository, and select the `main` production branch.
4. Enter the settings above and create the Pages project.
5. In the Pages project, open **Settings → Environment variables** and add the values from `.env.example`. Add secret values as encrypted secrets.
6. In **Settings → Bindings**, configure the D1 binding named `DB` and the optional R2 binding named `PRODUCT_IMAGES`. The names must match `wrangler.toml` and the application code.
7. Deploy once, then apply the production migration and seed commands below from a machine authenticated with Wrangler.

Every push to the connected production branch will build and deploy automatically. Pull requests and preview branches can receive their own Pages preview deployments.

## Cloudflare Resources and CLI Deployment

1. Create D1:

```bash
npx wrangler d1 create webshop
```

2. Update `wrangler.toml` with the D1 database ID.

3. Create an R2 bucket if you want Cloudflare-hosted product images:

```bash
npx wrangler r2 bucket create atelier-product-images
```

4. Set production secrets:

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET
npx wrangler pages secret put ADMIN_SESSION_SECRET
npx wrangler pages secret put ADMIN_BOOTSTRAP_KEY
```

5. Apply migrations and optional seed data:

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

6. For the GitHub-connected setup, push the migration/configuration changes to GitHub and let Pages build the site. To test the same build locally, run:

```bash
npm run build
```

The `npm run pages:deploy` command is available as a direct-upload fallback, but it is not needed for the GitHub-connected Pages project.

7. Add a custom domain in the Pages dashboard, then update `PUBLIC_SITE_URL` in `wrangler.toml` or the Pages environment variables. Use the final HTTPS domain for the Stripe success, cancel, webhook, sitemap, and robots URLs.

## First Admin

Open `/admin`. Enter an email, a 12+ character password, and the `ADMIN_BOOTSTRAP_KEY`. This only works while there are no admin users. After setup, log in with email and password.

Admin features included:

- Dashboard metrics
- Product create/update/delete through soft deletion
- Product publishing and featuring
- Image URLs, variants, inventory, internal supplier fields
- Order list and fulfillment status updates
- Editable policy and disclosure text

## Operating Orders

After Stripe confirms payment through the webhook:

- An order is created in D1
- Order items snapshot title, SKU, variant, quantity, and price
- Variant inventory is decremented server-side
- The customer sees `/success?session_id=...`

Never treat the success page redirect as proof of payment. The webhook is the source of truth.

## Dropshipping Disclosure

The footer and product page include a small disclosure that items may be sourced from third-party marketplaces or suppliers. Do not hide this in a way that misleads customers. Product origin, materials, shipping ranges, and policy text should be edited to match verifiable supplier information.

## Verification

Run before deploy:

```bash
npm run typecheck
npm run test
npm run build
```

GitHub also runs the same verification through `.github/workflows/ci.yml` on pushes to `main` and on pull requests.

## Secrets

Do not commit `.env` files or real API keys. `.gitignore` excludes local env files. Only `PUBLIC_*` values may be exposed to browser code.
