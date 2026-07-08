-- ============================================================================
--  FULL SUPABASE SETUP — Universal Business Template MASTER
-- ============================================================================
--  Run this once in a brand-new Supabase project via SQL Editor.
--  Combines migrations 001 + 002 + 003 + 004 in dependency order.
--  Fully idempotent — safe to re-run on an existing database.
--  No test data. No demo data. Only the business_profile seed row is
--  inserted because the app expects id = 'default' to always exist.
-- ============================================================================
--
--  ACCESS MODEL
--  ────────────
--  service_role key (server-side API) → bypasses RLS entirely
--  anon key (public frontend)         → subject to the policies below
--  Admin auth uses ADMIN_PASSWORD env var, NOT Supabase Auth.
--
--  AFTER RUNNING THIS FILE
--  ────────────────────────
--  Copy these values into Replit Secrets:
--    SUPABASE_URL              → Project Settings → API → Project URL
--    SUPABASE_SERVICE_ROLE_KEY → Project Settings → API → service_role (secret)
--    VITE_SUPABASE_URL         → same as SUPABASE_URL
--    VITE_SUPABASE_ANON_KEY    → Project Settings → API → anon (public)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. categories
--    Self-referential. Must be created before products (FK: category_id).
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  parent_id  UUID        REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_id);

DO $$ BEGIN
  CREATE POLICY "anon_read_categories" ON categories FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 2. tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_read_tags" ON tags FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 3. products
--    Includes all columns added across migrations 001, 002, and 003.
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                     TEXT        NOT NULL,
  description              TEXT,
  price_cents              INTEGER     NOT NULL CHECK (price_cents > 0),
  currency                 TEXT        NOT NULL DEFAULT 'usd',
  interval                 TEXT        NOT NULL
                                         CHECK (interval IN ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime')),
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  payment_provider         TEXT,
  payment_url              TEXT,
  button_label             TEXT,
  image_url                TEXT,
  sort_order               INTEGER     NOT NULL DEFAULT 0,
  -- 002: catalog fields
  category_id              UUID        REFERENCES categories(id) ON DELETE SET NULL,
  stock_quantity           INTEGER     NOT NULL DEFAULT -1,
  show_stock               BOOLEAN     NOT NULL DEFAULT FALSE,
  status                   TEXT        NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('draft', 'active', 'hidden')),
  -- 003: delivery options
  free_delivery_enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  faster_delivery_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  faster_delivery_payment_link TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS products_active_idx   ON products (is_active);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

DO $$ BEGIN
  CREATE POLICY "anon_read_active_products" ON products FOR SELECT TO anon USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 4. product_tags  (junction: products ↔ tags)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_tags (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_read_product_tags" ON product_tags FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 5. product_variants  (dropdown groups, e.g. "Size", "Colour")
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants (product_id);

DO $$ BEGIN
  CREATE POLICY "anon_read_product_variants" ON product_variants FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 6. product_variant_options  (e.g. "Small", "Medium", "Large")
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variant_options (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID        NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  value      TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS pvo_variant_idx ON product_variant_options (variant_id);

DO $$ BEGIN
  CREATE POLICY "anon_read_product_variant_options" ON product_variant_options FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 7. customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT        NOT NULL,
  plan_id       UUID        REFERENCES products(id) ON DELETE SET NULL,
  plan_name     TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS customers_email_idx  ON customers (email);
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);

DO $$ BEGIN
  CREATE POLICY "auth_read_own_customer" ON customers FOR SELECT TO authenticated USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 8. payments  (manual log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID        REFERENCES customers(id) ON DELETE SET NULL,
  plan_id      UUID        REFERENCES products(id)  ON DELETE SET NULL,
  email        TEXT        NOT NULL,
  amount_cents INTEGER     NOT NULL,
  currency     TEXT        NOT NULL DEFAULT 'usd',
  provider     TEXT        NOT NULL DEFAULT 'manual',
  provider_ref TEXT,
  status       TEXT        NOT NULL DEFAULT 'completed'
                              CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payments_email_idx        ON payments (email);
CREATE INDEX IF NOT EXISTS payments_provider_ref_idx ON payments (provider_ref);

DO $$ BEGIN
  CREATE POLICY "auth_read_own_payments" ON payments FOR SELECT TO authenticated USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 9. access_links
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_links (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform   TEXT        NOT NULL,
  label      TEXT        NOT NULL,
  invite_url TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE access_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_read_access_links" ON access_links FOR SELECT TO anon, authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 10. events  (analytics / activity feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type   TEXT        NOT NULL,
  product_id   UUID,
  product_name TEXT,
  actor        TEXT        NOT NULL DEFAULT 'anon'
                             CHECK (actor IN ('anon', 'admin', 'system')),
  meta         JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS events_type_idx    ON events (event_type);
CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_product_idx ON events (product_id);

DO $$ BEGIN
  CREATE POLICY "anon_insert_events" ON events FOR INSERT TO anon WITH CHECK (actor = 'anon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 11. content_blocks
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL DEFAULT '',
  type         TEXT        NOT NULL DEFAULT 'announcement'
                             CHECK (type IN ('announcement', 'post', 'faq', 'page')),
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS content_blocks_published_idx ON content_blocks (is_published, published_at DESC);

DO $$ BEGIN
  CREATE POLICY "public_read_published_content" ON content_blocks FOR SELECT TO anon, authenticated USING (is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 12. messages  (contact form inbox)
--     Includes admin_notes column added in migration 004.
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT        NOT NULL,
  name        TEXT        NOT NULL DEFAULT '',
  subject     TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'unread'
                            CHECK (status IN ('unread', 'read', 'archived')),
  admin_notes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_status_idx     ON messages (status);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 13. team_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT        NOT NULL UNIQUE,
  display_name TEXT        NOT NULL DEFAULT '',
  role         TEXT        NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('owner', 'admin', 'viewer')),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "auth_read_own_team_member" ON team_members FOR SELECT TO authenticated USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 14. app_settings  (key/value store for runtime config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 15. business_profile  (singleton — always one row with id = 'default')
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_profile (
  id              TEXT        PRIMARY KEY DEFAULT 'default',
  business_name   TEXT        NOT NULL DEFAULT '',
  logo_url        TEXT,
  phone           TEXT,
  email           TEXT,
  whatsapp_link   TEXT,
  address         TEXT,
  opening_hours   TEXT,
  service_areas   TEXT,
  facebook_url    TEXT,
  instagram_url   TEXT,
  tiktok_url      TEXT,
  linkedin_url    TEXT,
  cta_label       TEXT,
  cta_link        TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_read_business_profile" ON business_profile FOR SELECT TO anon USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Required seed: app expects this row to always exist.
INSERT INTO business_profile (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 16. services
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  description    TEXT,
  image_url      TEXT,
  category       TEXT,
  starting_price TEXT,
  cta_type       TEXT        NOT NULL DEFAULT 'quote'
                               CHECK (cta_type IN ('book', 'quote', 'call', 'whatsapp')),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS services_active_idx ON services (is_active);

DO $$ BEGIN
  CREATE POLICY "anon_read_active_services" ON services FOR SELECT TO anon USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 17. leads  (quote / enquiry requests from the public)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL DEFAULT '',
  email          TEXT,
  phone          TEXT,
  location       TEXT,
  service_needed TEXT,
  message        TEXT,
  status         TEXT        NOT NULL DEFAULT 'new'
                               CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS leads_status_idx  ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_leads" ON leads FOR INSERT TO anon WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 18. bookings  (appointment requests from the public)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name  TEXT        NOT NULL DEFAULT '',
  email          TEXT,
  phone          TEXT,
  service        TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  message        TEXT,
  status         TEXT        NOT NULL DEFAULT 'requested'
                               CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS bookings_status_idx  ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 19. orders  (manual order tracker — takeaway, e-commerce, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT        NOT NULL DEFAULT '',
  email         TEXT,
  phone         TEXT,
  items_summary TEXT,
  total_amount  TEXT,
  delivery_type TEXT        NOT NULL DEFAULT 'delivery'
                              CHECK (delivery_type IN ('delivery', 'collection')),
  address       TEXT,
  status        TEXT        NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS orders_status_idx  ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);


-- ============================================================================
-- 20. reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT        NOT NULL DEFAULT '',
  rating        INTEGER     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text   TEXT,
  source        TEXT,
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reviews_published_idx ON reviews (is_published);

DO $$ BEGIN
  CREATE POLICY "anon_read_published_reviews" ON reviews FOR SELECT TO anon USING (is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 21. gallery
-- ============================================================================
CREATE TABLE IF NOT EXISTS gallery (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT        NOT NULL DEFAULT '',
  image_url    TEXT,
  category     TEXT,
  description  TEXT,
  is_featured  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS gallery_published_idx ON gallery (is_published);

DO $$ BEGIN
  CREATE POLICY "anon_read_published_gallery" ON gallery FOR SELECT TO anon USING (is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
