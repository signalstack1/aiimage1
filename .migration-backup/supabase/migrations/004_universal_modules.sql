-- ============================================================================
-- Migration 004: Universal Business Modules
-- business_profile, services, leads, bookings, orders, reviews, gallery
-- ============================================================================
-- Fully idempotent — safe to re-run.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. business_profile  (singleton row, id = 'default')
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

-- Seed default row if not present
INSERT INTO business_profile (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. services
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
-- 3. leads  (quote requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL DEFAULT '',
  email           TEXT,
  phone           TEXT,
  location        TEXT,
  service_needed  TEXT,
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_leads" ON leads FOR INSERT TO anon WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 4. bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name   TEXT        NOT NULL DEFAULT '',
  email           TEXT,
  phone           TEXT,
  service         TEXT,
  preferred_date  TEXT,
  preferred_time  TEXT,
  message         TEXT,
  status          TEXT        NOT NULL DEFAULT 'requested'
                                CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);

DO $$ BEGIN
  CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT TO anon WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 5. orders  (manual order tracker)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name   TEXT        NOT NULL DEFAULT '',
  email           TEXT,
  phone           TEXT,
  items_summary   TEXT,
  total_amount    TEXT,
  delivery_type   TEXT        NOT NULL DEFAULT 'delivery'
                                CHECK (delivery_type IN ('delivery', 'collection')),
  address         TEXT,
  status          TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

-- ============================================================================
-- 6. reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name   TEXT        NOT NULL DEFAULT '',
  rating          INTEGER     NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT,
  source          TEXT,
  is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reviews_published_idx ON reviews (is_published);

DO $$ BEGIN
  CREATE POLICY "anon_read_published_reviews" ON reviews FOR SELECT TO anon USING (is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 7. gallery
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

-- Add admin_notes to messages if not present
ALTER TABLE messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;

NOTIFY pgrst, 'reload schema';
