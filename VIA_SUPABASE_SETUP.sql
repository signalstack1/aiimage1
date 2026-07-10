-- ============================================================
-- VIA Secured — Supabase Database Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Enable UUID extension ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── businesses ────────────────────────────────────────────────────────────────
-- Each tradesperson's business record. VIA number assigned on approval.
CREATE TABLE IF NOT EXISTS businesses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  via_number        TEXT UNIQUE,                              -- e.g. VIA1001 — set on approval
  business_name     TEXT NOT NULL,
  trade_type        TEXT NOT NULL,
  location          TEXT NOT NULL DEFAULT '',
  website           TEXT,
  contact_phone     TEXT,
  contact_enabled   BOOLEAN NOT NULL DEFAULT FALSE,           -- whether phone shows on public profile
  description       TEXT,
  logo_url          TEXT,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- linked Supabase auth user (member dashboard)
  referral_code     TEXT UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── applications ──────────────────────────────────────────────────────────────
-- One application per business. Tracks verification lifecycle.
CREATE TABLE IF NOT EXISTS applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  applicant_name    TEXT NOT NULL,
  applicant_email   TEXT NOT NULL,
  applicant_phone   TEXT,
  message           TEXT,                                     -- optional applicant note
  status            TEXT NOT NULL DEFAULT 'pending'          -- pending | in_review | approved | rejected | expired
                      CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
  priority          BOOLEAN NOT NULL DEFAULT FALSE,           -- true = priority checking purchased
  assigned_checker  TEXT,                                     -- admin note: who is checking
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── verification_checks ───────────────────────────────────────────────────────
-- Six check results per application (one row per check type per application).
CREATE TABLE IF NOT EXISTS verification_checks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  check_type    TEXT NOT NULL                                 -- local_address | business_type | insurance | accreditations | digital_footprint | public_records
                  CHECK (check_type IN ('local_address', 'business_type', 'insurance', 'accreditations', 'digital_footprint', 'public_records')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'verified', 'unverified')),
  notes         TEXT,                                         -- admin internal note about this check
  checked_at    TIMESTAMPTZ,
  checked_by    TEXT,                                         -- admin identifier
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, check_type)
);

-- ── documents ─────────────────────────────────────────────────────────────────
-- Files uploaded by members (insurance certs, accreditations, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  application_id  UUID REFERENCES applications(id) ON DELETE SET NULL,
  document_type   TEXT NOT NULL DEFAULT 'general'
                    CHECK (document_type IN ('general', 'insurance', 'accreditation', 'proof_of_address', 'other')),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,                             -- Supabase Storage path (private bucket)
  file_size_bytes BIGINT,
  mime_type       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired')),
  admin_notes     TEXT,                                      -- rejection reason or admin comment
  expiry_date     DATE,                                      -- for insurance/accreditation expiry
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,                                      -- admin username who reviewed
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── applications migration (for existing databases) ───────────────────────────
-- Run these if the DB was set up before the TVC plans update:
ALTER TABLE applications ADD COLUMN IF NOT EXISTS plan_code TEXT
  CHECK (plan_code IN ('tvc_basic', 'tvc_plus'));
ALTER TABLE applications ADD COLUMN IF NOT EXISTS plan_price_pence INTEGER;

-- ── sticker_orders ─────────────────────────────────────────────────────────────
-- Van sticker pack orders linked to applications.
CREATE TABLE IF NOT EXISTS sticker_orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sticker_size          TEXT NOT NULL CHECK (sticker_size IN ('small', 'medium')),
  van_count             INTEGER NOT NULL CHECK (van_count >= 1),
  price_per_van_pence   INTEGER,                        -- e.g. 3000 = £30
  expected_total_pence  INTEGER,                        -- van_count × price_per_van_pence
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  fulfilment_status     TEXT NOT NULL DEFAULT 'awaiting_payment'
                          CHECK (fulfilment_status IN ('not_ordered', 'awaiting_payment', 'paid', 'preparing', 'dispatched', 'completed', 'cancelled', 'refunded')),
  payment_ref           TEXT,
  delivery_details      TEXT,
  admin_notes           TEXT,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at               TIMESTAMPTZ,
  dispatched_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sticker_orders_application ON sticker_orders(application_id);
CREATE INDEX IF NOT EXISTS idx_sticker_orders_business    ON sticker_orders(business_id);

-- RLS for sticker_orders
ALTER TABLE sticker_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "service_role_all" ON sticker_orders';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "service_role_all" ON sticker_orders FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- updated_at trigger for sticker_orders
DO $$
BEGIN
  DROP TRIGGER IF EXISTS set_sticker_orders_updated_at ON sticker_orders;
  CREATE TRIGGER set_sticker_orders_updated_at
    BEFORE UPDATE ON sticker_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── documents migration (for existing databases) ──────────────────────────────
-- Run these if you set up the DB before this schema update:
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
-- Expand document_type CHECK constraint (drop old, add new):
DO $$ BEGIN
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
  ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
    CHECK (document_type IN ('general', 'insurance', 'accreditation', 'proof_of_address', 'other'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- Expand status CHECK constraint:
DO $$ BEGIN
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
  ALTER TABLE documents ADD CONSTRAINT documents_status_check
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── payment_links ─────────────────────────────────────────────────────────────
-- Admin-configurable payment redirect URLs. No Stripe logic — URL only.
CREATE TABLE IF NOT EXISTS payment_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,                          -- e.g. 'via-membership', 'priority-checking'
  label       TEXT NOT NULL,                                 -- e.g. 'VIA Membership (£20/month)'
  url         TEXT,                                          -- redirect URL (null = not configured)
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default payment link slots
INSERT INTO payment_links (slug, label, url, is_active, sort_order) VALUES
  ('via-membership',    'VIA Membership (legacy — £20/month)',  NULL, TRUE, 0),
  ('priority-checking', 'Priority Checking (legacy — £49)',     NULL, TRUE, 5),
  ('tvc-basic',         'TVC Basic (£15/month)',                NULL, TRUE, 1),
  ('tvc-plus',          'TVC Plus (£30/month)',                 NULL, TRUE, 2),
  ('sticker-small',     'TVC Van Sticker — Small (£30/van)',   NULL, TRUE, 3),
  ('sticker-medium',    'TVC Van Sticker — Medium (£50/van)',  NULL, TRUE, 4)
ON CONFLICT (slug) DO NOTHING;

-- ── referrals ─────────────────────────────────────────────────────────────────
-- Member referral tracking.
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  referred_email  TEXT NOT NULL,
  referred_id     UUID REFERENCES businesses(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'            -- pending | converted
                    CHECK (status IN ('pending', 'converted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── leads ─────────────────────────────────────────────────────────────────────
-- Admin lead pipeline. Extends existing leads table pattern.
-- If leads table already exists from template, add VIA columns:
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new'
  CHECK (stage IN ('new', 'contacted', 'replied', 'interested', 'converted', 'dead'));
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS trade TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS town TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE IF EXISTS leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- If leads table does not exist, create it:
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL DEFAULT '',
  email             TEXT,
  phone             TEXT,
  location          TEXT,
  service_needed    TEXT,
  message           TEXT,
  -- VIA-specific fields
  business_name     TEXT,
  trade             TEXT,
  town              TEXT,
  website           TEXT,
  stage             TEXT NOT NULL DEFAULT 'new'
                      CHECK (stage IN ('new', 'contacted', 'replied', 'interested', 'converted', 'dead')),
  last_contacted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admin_notes ───────────────────────────────────────────────────────────────
-- Internal admin notes on applications / members.
CREATE TABLE IF NOT EXISTS admin_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID REFERENCES applications(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  author          TEXT NOT NULL DEFAULT 'admin',
  body            TEXT NOT NULL,
  is_visible_to_member BOOLEAN NOT NULL DEFAULT FALSE,       -- if true, member can see this note
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── notifications ─────────────────────────────────────────────────────────────
-- In-app notifications for members and admins.
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type  TEXT NOT NULL CHECK (recipient_type IN ('member', 'admin')),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  link            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VIA number sequence helper ────────────────────────────────────────────────
-- Generates the next unique VIA number (e.g. VIA1042).
-- Uses an advisory lock so concurrent approvals cannot race and produce duplicates.
CREATE OR REPLACE FUNCTION next_via_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  -- Serialise concurrent calls with a session-level advisory lock (key = 'via_number_seq' hash)
  PERFORM pg_advisory_xact_lock(hashtext('via_number_seq'));

  SELECT COALESCE(MAX(CAST(REPLACE(via_number, 'VIA', '') AS INT)), 1000) + 1
  INTO next_num
  FROM businesses
  WHERE via_number ~ '^VIA[0-9]+$';

  RETURN 'VIA' || next_num::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ── Auto-assign VIA number on application approval ────────────────────────────
-- Fires after an application row transitions to status = 'approved'.
-- If the linked business has no via_number yet, assigns the next one atomically.
CREATE OR REPLACE FUNCTION assign_via_number_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes TO 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Only assign if the business doesn't already have a VIA number
    UPDATE businesses
    SET    via_number = next_via_number(),
           updated_at = NOW()
    WHERE  id = NEW.business_id
      AND  via_number IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_via_number ON applications;
CREATE TRIGGER trg_assign_via_number
  AFTER UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION assign_via_number_on_approval();

-- ── Updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['businesses', 'applications', 'verification_checks', 'payment_links', 'leads']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_%I_updated_at ON %I;
      CREATE TRIGGER set_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all VIA tables
ALTER TABLE businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['businesses','applications','verification_checks','documents','payment_links','referrals','admin_notes','notifications']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "public_read_approved" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "member_own" ON %I', tbl);
  END LOOP;
END $$;

-- Service role (api-server uses service role key) — full access
CREATE POLICY "service_role_all" ON businesses         FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON applications       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON verification_checks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON documents          FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON payment_links      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON referrals          FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON admin_notes        FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all" ON notifications      FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Public: read approved businesses only (for VIA number search)
CREATE POLICY "public_read_approved" ON businesses
  FOR SELECT TO anon
  USING (
    via_number IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.business_id = businesses.id AND a.status = 'approved'
    )
  );

-- Public: read verification checks for approved businesses
CREATE POLICY "public_read_approved" ON verification_checks
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = verification_checks.application_id AND a.status = 'approved'
    )
  );

-- Public: read active payment links
CREATE POLICY "public_read_approved" ON payment_links
  FOR SELECT TO anon
  USING (is_active = TRUE);

-- Authenticated members: own business data only
CREATE POLICY "member_own" ON businesses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_own" ON applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = applications.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "member_own" ON documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = documents.business_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = documents.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "member_own" ON notifications
  FOR ALL TO authenticated
  USING (
    recipient_type = 'member' AND
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = notifications.business_id AND b.user_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_businesses_via_number   ON businesses(via_number);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id      ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_business   ON applications(business_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON applications(status);
CREATE INDEX IF NOT EXISTS idx_checks_application      ON verification_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_checks_business         ON verification_checks(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_business      ON documents(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_business  ON notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage             ON leads(stage);

-- ============================================================
-- Task #42: TVC Plus — portfolio, intro, social links, testimonials
-- Run these ALTER/CREATE statements in the Supabase SQL Editor
-- ============================================================

-- ── business_intro column ─────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_intro TEXT;

-- ── portfolio_images ──────────────────────────────────────────────────────────
-- Plus-member work photos. Deletion does NOT restore monthly upload quota.
CREATE TABLE IF NOT EXISTS portfolio_images (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  description   TEXT,
  upload_month  TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_business ON portfolio_images(business_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_month    ON portfolio_images(business_id, upload_month);
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "service_role_all" ON portfolio_images'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "service_role_all" ON portfolio_images FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "member_own" ON portfolio_images'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "member_own" ON portfolio_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = portfolio_images.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = portfolio_images.business_id AND b.user_id = auth.uid()));
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "public_read" ON portfolio_images'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "public_read" ON portfolio_images FOR SELECT TO anon USING (public_url IS NOT NULL);

-- ── social_links ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok','youtube','x','other')),
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_social_links_business ON social_links(business_id);
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "service_role_all" ON social_links'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "service_role_all" ON social_links FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "member_own" ON social_links'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "member_own" ON social_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = social_links.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = social_links.business_id AND b.user_id = auth.uid()));
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "public_read" ON social_links'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "public_read" ON social_links FOR SELECT TO anon USING (TRUE);
DO $$ BEGIN DROP TRIGGER IF EXISTS set_social_links_updated_at ON social_links; CREATE TRIGGER set_social_links_updated_at BEFORE UPDATE ON social_links FOR EACH ROW EXECUTE FUNCTION set_updated_at(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ── testimonials ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name     TEXT NOT NULL,
  testimonial_text  TEXT NOT NULL,
  customer_email    TEXT,
  service_received  TEXT,
  work_date         DATE,
  approval_status   TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  moderation_notes  TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_testimonials_business ON testimonials(business_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status   ON testimonials(business_id, approval_status);
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "service_role_all" ON testimonials'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "service_role_all" ON testimonials FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "member_own" ON testimonials'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE POLICY "member_own" ON testimonials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = testimonials.business_id AND b.user_id = auth.uid()));
-- Anon SELECT/INSERT removed from testimonials table — all public access goes through
-- our API (service_role) which controls column exposure (customer_email never exposed publicly).
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "public_read_approved" ON testimonials'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'DROP POLICY IF EXISTS "public_insert" ON testimonials'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Safe read-only view for any direct PostgREST access: excludes PII (customer_email)
CREATE OR REPLACE VIEW public_testimonials AS
  SELECT id, business_id, customer_name, testimonial_text, service_received, work_date, approval_status, submitted_at
  FROM testimonials WHERE approval_status = 'approved';
GRANT SELECT ON public_testimonials TO anon;

-- ── Storage: portfolio-images bucket (public) ─────────────────────────────────
-- If this fails, create the bucket manually in Supabase Dashboard → Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('portfolio-images', 'portfolio-images', true, 10485760,
          ARRAY['image/jpeg','image/png','image/webp','image/jpg'])
  ON CONFLICT (id) DO NOTHING;
