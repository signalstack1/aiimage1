-- ============================================================================
-- SignalStack — White-label Subscription SaaS
-- Migration 001: Initial Template Schema
-- ============================================================================
-- Fully idempotent — safe to re-run on an existing database.
-- Uses IF NOT EXISTS on every CREATE and ADD COLUMN IF NOT EXISTS on ALTER TABLE.
-- Policies are wrapped in DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$.
--
-- Access model:
--   service_role key (server-side API) → bypasses RLS entirely
--   anon key (frontend)                → subject to the policies below
--
-- Admin authentication uses ADMIN_PASSWORD env var, NOT Supabase Auth.
--
-- Payment model:
--   External payment URLs only (Stripe payment links, Whop, Gumroad, etc.)
--   No webhooks. Customers are managed manually via the admin panel.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. products
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT        NOT NULL,
  description      TEXT,
  price_cents      INTEGER     NOT NULL CHECK (price_cents > 0),
  currency         TEXT        NOT NULL DEFAULT 'usd',
  interval         TEXT        NOT NULL CHECK (interval IN ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime')),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  payment_provider TEXT,
  payment_url      TEXT,
  button_label     TEXT,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS products_active_idx ON products (is_active);

DO $$ BEGIN
  CREATE POLICY "anon_read_active_products" ON products FOR SELECT TO anon USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. customers
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
-- 3. payments  (manual log — not populated by webhooks)
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

-- Add image_url to products if missing (idempotent)
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add columns that may be missing if the table was created by an older schema
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS plan_id      UUID REFERENCES products(id)  ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_ref TEXT;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payments_email_idx        ON payments (email);
CREATE INDEX IF NOT EXISTS payments_provider_ref_idx ON payments (provider_ref);

DO $$ BEGIN
  CREATE POLICY "auth_read_own_payments" ON payments FOR SELECT TO authenticated USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 4. access_links
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_links (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform   TEXT        NOT NULL,
  label      TEXT        NOT NULL,
  invite_url TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add sort_order if the table was created without it
ALTER TABLE access_links ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE access_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "anon_read_access_links" ON access_links FOR SELECT TO anon, authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 5. events
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
-- 6. content_blocks
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
-- 7. messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT        NOT NULL,
  name       TEXT        NOT NULL DEFAULT '',
  subject    TEXT        NOT NULL DEFAULT '',
  body       TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'unread'
               CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_status_idx     ON messages (status);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 8. team_members
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
-- 9. app_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL DEFAULT '',
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Schema patches (safe to re-run)
-- ============================================================================

-- Expand products.interval to include one-time and weekly
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_interval_check;
ALTER TABLE products ADD CONSTRAINT products_interval_check
  CHECK (interval IN ('one-time', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime'));

-- Add image_url column if not present
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
