-- MarketForge demo seed (requirements §81). Idempotent: uses ON CONFLICT.
-- Passwords below are placeholders — real registration flow hashes with Argon2id.

INSERT INTO commerce.users (name, email, password_hash, role, status)
VALUES
  ('MarketForge Admin', 'admin@marketforge.local',
   '$argon2id$PLACEHOLDER-seed-admin', 'ADMIN', 'ACTIVE'),
  ('Demo Customer', 'customer@marketforge.local',
   '$argon2id$PLACEHOLDER-seed-customer', 'CUSTOMER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO commerce.categories (name, slug, parent_id, status)
VALUES
  ('Electronics', 'electronics', NULL, 'ACTIVE'),
  ('Laptop',      'laptop',      (SELECT id FROM commerce.categories WHERE slug = 'electronics'), 'ACTIVE'),
  ('Smartphone',  'smartphone',  (SELECT id FROM commerce.categories WHERE slug = 'electronics'), 'ACTIVE'),
  ('Accessories', 'accessories', (SELECT id FROM commerce.categories WHERE slug = 'electronics'), 'ACTIVE'),
  ('Fashion',     'fashion',     NULL, 'ACTIVE'),
  ('Home & Living','home-living', NULL, 'ACTIVE')
ON CONFLICT (slug) DO NOTHING;

-- 50+ products: generated electronics/fashion/home items with inventory.
INSERT INTO commerce.products (sku, slug, name, description, price, compare_at_price, category_id, status, weight_grams)
SELECT
  'SKU-' || LPAD(g::text, 4, '0'),
  'demo-product-' || g,
  'Demo Product ' || g ||
    CASE WHEN g % 3 = 0 THEN ' Pro' WHEN g % 3 = 1 THEN ' Classic' ELSE ' Lite' END,
  'Generated demo product for load/testing the marketplace.',
  50000 + (g * 13750) % 1500000,
  CASE WHEN g % 4 = 0 THEN 50000 + (g * 13750) % 1500000 + 100000 ELSE NULL END,
  (ARRAY[
    (SELECT id FROM commerce.categories WHERE slug = 'laptop'),
    (SELECT id FROM commerce.categories WHERE slug = 'smartphone'),
    (SELECT id FROM commerce.categories WHERE slug = 'accessories'),
    (SELECT id FROM commerce.categories WHERE slug = 'fashion'),
    (SELECT id FROM commerce.categories WHERE slug = 'home-living')
  ])[1 + (g % 5)],
  'ACTIVE',
  250 + (g * 37) % 5000
FROM generate_series(1, 56) AS g
ON CONFLICT (sku) DO NOTHING;

INSERT INTO commerce.inventory (product_id, available_quantity, reserved_quantity, sold_quantity)
SELECT p.id,
       25 + (row_number() OVER (ORDER BY p.sku)) % 40,
       0,
       0
FROM commerce.products p
WHERE p.sku LIKE 'SKU-%'
ON CONFLICT (product_id) DO NOTHING;

-- Default address for the demo customer.
INSERT INTO commerce.addresses
  (user_id, label, recipient_name, phone, address_line, city, province, postal_code, country, is_default)
SELECT u.id, 'Home', 'Demo Customer', '+62-812-0000-0001',
       'Jl. Demo No. 1', 'Jakarta Selatan', 'DKI Jakarta', '12190', 'ID', true
FROM commerce.users u
WHERE u.email = 'customer@marketforge.local'
  AND NOT EXISTS (SELECT 1 FROM commerce.addresses a WHERE a.user_id = u.id);
