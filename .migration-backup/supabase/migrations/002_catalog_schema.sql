-- ============================================================================
-- SignalStack — Migration 002: Categories, Tags, Variants, Stock, Status
-- ============================================================================
-- Fully idempotent — safe to re-run.
-- Run this in Supabase SQL Editor after 001_initial_template_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. categories  (parent_id = NULL → top-level; set = sub-category)
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
-- 3. product_tags  (junction)
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
-- 4. product_variants  (dropdown group, e.g. "Size", "Colour")
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
-- 5. product_variant_options  (e.g. "Small", "Medium", "Large")
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
-- 6. Extend products table
-- ============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id    UUID     REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER  NOT NULL DEFAULT -1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_stock     BOOLEAN  NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status         TEXT     NOT NULL DEFAULT 'active';

-- Apply / replace status constraint (safe to re-run)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'hidden'));

-- Sync existing rows: is_active=false → status='draft'
UPDATE products SET status = 'draft'
WHERE is_active = FALSE AND status = 'active';
