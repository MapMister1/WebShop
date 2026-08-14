PRAGMA foreign_keys = ON;

DELETE FROM product_images;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM discount_codes;
DELETE FROM settings;

INSERT INTO categories (id, name, slug, description, image_url) VALUES
('cat_chains', 'Chains', 'chains', 'Everyday chains in polished and textured finishes.', NULL),
('cat_necklaces', 'Necklaces', 'necklaces', 'Layering necklaces and pendant pieces.', NULL),
('cat_rings', 'Rings', 'rings', 'Simple rings and statement shapes.', NULL),
('cat_bracelets', 'Bracelets', 'bracelets', 'Low-profile bracelets for daily wear.', NULL),
('cat_accessories', 'Accessories', 'accessories', 'Small finishing pieces and styling accessories.', NULL);

INSERT INTO products (id, slug, title, description, short_description, category_id, price, compare_at_price, cost_price, currency, sku, featured, published, supplier_name, supplier_product_id, supplier_cost, fulfillment_notes) VALUES
('prd_cross_chain', 'stainless-steel-cross-chain', 'Stainless Steel Cross Chain', '<p>A clean pendant chain with a polished cross detail. Replace this editable description with verified material and sizing information before launch.</p>', 'Polished pendant chain with a minimal cross detail.', 'cat_chains', 2899, 4200, 1150, 'usd', 'AS-CHAIN-001', 1, 1, 'Internal supplier placeholder', 'replace-me', 900, 'Verify supplier shipping method before fulfillment.'),
('prd_rope_chain', 'classic-rope-chain', 'Classic Rope Chain', '<p>A textured chain designed for simple layering. Update length, plating, and care details from the admin dashboard.</p>', 'Textured chain for everyday layering.', 'cat_chains', 3499, 4999, 1400, 'usd', 'AS-CHAIN-002', 1, 1, NULL, NULL, NULL, NULL),
('prd_box_chain', 'slim-box-chain', 'Slim Box Chain', '<p>A low-profile box chain with a crisp geometric profile. Confirm final material claims before publishing.</p>', 'Low-profile chain with a crisp profile.', 'cat_chains', 2499, NULL, 920, 'usd', 'AS-CHAIN-003', 0, 1, NULL, NULL, NULL, NULL),
('prd_pearl_necklace', 'single-pearl-necklace', 'Single Pearl Necklace', '<p>A small pearl-look pendant on a delicate chain. Do not claim natural pearl unless independently verified.</p>', 'Small pearl-look pendant necklace.', 'cat_necklaces', 3199, 4400, 1250, 'usd', 'AS-NECK-001', 1, 1, NULL, NULL, NULL, NULL),
('prd_bar_necklace', 'minimal-bar-necklace', 'Minimal Bar Necklace', '<p>A simple bar necklace for clean daily styling. Replace with original product copy before launch.</p>', 'Clean bar pendant for daily styling.', 'cat_necklaces', 2799, NULL, 1080, 'usd', 'AS-NECK-002', 0, 1, NULL, NULL, NULL, NULL),
('prd_signet_ring', 'soft-square-signet-ring', 'Soft Square Signet Ring', '<p>A rounded signet-style ring with a smooth face. Size availability is controlled through variants.</p>', 'Rounded signet-style ring.', 'cat_rings', 2999, 3999, 1200, 'usd', 'AS-RING-001', 1, 1, NULL, NULL, NULL, NULL),
('prd_stacking_ring', 'thin-stacking-ring-set', 'Thin Stacking Ring Set', '<p>A set of slim rings intended for stacking. Confirm exact finish and sizing before selling.</p>', 'Slim rings designed for stacking.', 'cat_rings', 2299, 3100, 870, 'usd', 'AS-RING-002', 0, 1, NULL, NULL, NULL, NULL),
('prd_cuff_bracelet', 'polished-cuff-bracelet', 'Polished Cuff Bracelet', '<p>An open cuff bracelet with a polished finish. Product claims should match supplier documentation.</p>', 'Open cuff bracelet with a polished finish.', 'cat_bracelets', 3299, NULL, 1320, 'usd', 'AS-BRAC-001', 1, 1, NULL, NULL, NULL, NULL),
('prd_chain_bracelet', 'flat-link-chain-bracelet', 'Flat Link Chain Bracelet', '<p>A flat link bracelet for a clean wrist stack. Replace placeholder imagery and descriptions before production launch.</p>', 'Flat link bracelet for a clean wrist stack.', 'cat_bracelets', 2699, 3600, 990, 'usd', 'AS-BRAC-002', 0, 1, NULL, NULL, NULL, NULL),
('prd_claw_clip', 'metallic-claw-clip', 'Metallic Claw Clip', '<p>A simple metallic hair clip for everyday styling. Validate dimensions and finish before launch.</p>', 'Metallic hair clip for everyday styling.', 'cat_accessories', 1699, 2400, 610, 'usd', 'AS-ACC-001', 0, 1, NULL, NULL, NULL, NULL);

INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order) VALUES
('img_cross_1', 'prd_cross_chain', 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80', 'Stainless steel cross chain on neutral surface', 0),
('img_rope_1', 'prd_rope_chain', 'https://images.unsplash.com/photo-1603974372039-adc49044b6bd?auto=format&fit=crop&w=900&q=80', 'Classic rope chain detail', 0),
('img_box_1', 'prd_box_chain', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80', 'Slim chain jewelry detail', 0),
('img_pearl_1', 'prd_pearl_necklace', 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=900&q=80', 'Pearl-look necklace detail', 0),
('img_bar_1', 'prd_bar_necklace', 'https://images.unsplash.com/photo-1512163143273-bde0e3cc7407?auto=format&fit=crop&w=900&q=80', 'Minimal necklace on fabric', 0),
('img_signet_1', 'prd_signet_ring', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80', 'Signet ring on hand', 0),
('img_stack_1', 'prd_stacking_ring', 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=80', 'Thin stacking rings', 0),
('img_cuff_1', 'prd_cuff_bracelet', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80', 'Polished cuff bracelet', 0),
('img_chain_bracelet_1', 'prd_chain_bracelet', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80', 'Flat chain bracelet detail', 0),
('img_clip_1', 'prd_claw_clip', 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=900&q=80', 'Metallic fashion accessory detail', 0);

INSERT INTO product_variants (id, product_id, name, sku, price, inventory, attributes) VALUES
('var_cross_18', 'prd_cross_chain', '18 inch', 'AS-CHAIN-001-18', NULL, 18, '{"length":"18 inch"}'),
('var_cross_20', 'prd_cross_chain', '20 inch', 'AS-CHAIN-001-20', 3099, 12, '{"length":"20 inch"}'),
('var_rope_18', 'prd_rope_chain', '18 inch', 'AS-CHAIN-002-18', NULL, 20, '{"length":"18 inch"}'),
('var_rope_22', 'prd_rope_chain', '22 inch', 'AS-CHAIN-002-22', 3699, 10, '{"length":"22 inch"}'),
('var_box_default', 'prd_box_chain', 'Default', 'AS-CHAIN-003-STD', NULL, 16, '{}'),
('var_pearl_default', 'prd_pearl_necklace', 'Default', 'AS-NECK-001-STD', NULL, 14, '{}'),
('var_bar_gold', 'prd_bar_necklace', 'Gold tone', 'AS-NECK-002-GLD', NULL, 15, '{"finish":"gold tone"}'),
('var_bar_silver', 'prd_bar_necklace', 'Silver tone', 'AS-NECK-002-SLV', NULL, 15, '{"finish":"silver tone"}'),
('var_signet_7', 'prd_signet_ring', 'Size 7', 'AS-RING-001-7', NULL, 8, '{"size":"7"}'),
('var_signet_8', 'prd_signet_ring', 'Size 8', 'AS-RING-001-8', NULL, 9, '{"size":"8"}'),
('var_stack_default', 'prd_stacking_ring', 'Set of 3', 'AS-RING-002-SET3', NULL, 11, '{}'),
('var_cuff_default', 'prd_cuff_bracelet', 'Default', 'AS-BRAC-001-STD', NULL, 13, '{}'),
('var_flat_default', 'prd_chain_bracelet', 'Default', 'AS-BRAC-002-STD', NULL, 17, '{}'),
('var_clip_default', 'prd_claw_clip', 'Default', 'AS-ACC-001-STD', NULL, 25, '{}');

INSERT INTO discount_codes (id, code, percentage_discount, fixed_discount, minimum_order_value, expires_at, maximum_uses, active) VALUES
('disc_welcome', 'WELCOME10', 10, NULL, 2500, NULL, 500, 1);

INSERT INTO settings (key, value, public) VALUES
('shipping_policy', 'Orders usually require processing before shipment. Estimated delivery ranges vary by destination, supplier, carrier, and customs handling. Tracking is provided when available.', 1),
('returns_policy', 'Returns and refunds are reviewed under the store policy shown at purchase. Returned items may need to be unused and in original condition.', 1),
('privacy_policy', 'This store collects only information needed for checkout, fulfillment, support, security, and legal compliance. Payment card data is handled by Stripe.', 1),
('terms_policy', 'Product availability, prices, delivery estimates, and supplier fulfillment details may change. The store does not imply affiliation with third-party brands unless explicitly stated.', 1),
('product_disclosure', 'Some products may be sourced from third-party marketplaces or suppliers and fulfilled through external partners.', 1);
