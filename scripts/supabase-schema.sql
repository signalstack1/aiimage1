-- ============================================================
-- TVC Secured — Full Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── businesses ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name     TEXT NOT NULL,
  trade_type        TEXT NOT NULL,
  location          TEXT NOT NULL DEFAULT '',
  website           TEXT,
  contact_phone     TEXT,
  contact_enabled   BOOLEAN NOT NULL DEFAULT false,
  description       TEXT,
  via_number        TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── applications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  applicant_name    TEXT NOT NULL,
  applicant_email   TEXT NOT NULL,
  applicant_phone   TEXT,
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending_payment'
                      CHECK (status IN ('pending_payment','pending','in_review','approved','rejected','expired')),
  priority          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  application_id    UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  document_type     TEXT NOT NULL DEFAULT 'general',
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  file_size_bytes   BIGINT,
  mime_type         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending_review',
  admin_notes       TEXT,
  expiry_date       DATE,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── verification_checks ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verification_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  check_type        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('verified','unverified','pending')),
  passed            BOOLEAN,
  checked_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, check_type)
);

-- ── notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id           UUID,
  recipient_type    TEXT NOT NULL DEFAULT 'member'
                      CHECK (recipient_type IN ('admin','member')),
  type              TEXT,
  title             TEXT NOT NULL,
  body              TEXT,
  link              TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admin_notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payment_links ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  label             TEXT NOT NULL,
  url               TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── leads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL DEFAULT '',
  business_name     TEXT,
  email             TEXT NOT NULL,
  phone             TEXT,
  location          TEXT,
  service_needed    TEXT,
  message           TEXT,
  stage             TEXT NOT NULL DEFAULT 'new',
  status            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── events (audit log) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        TEXT NOT NULL,
  actor             TEXT,
  meta              JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── access_links ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT NOT NULL,
  label             TEXT NOT NULL,
  invite_url        TEXT NOT NULL,
  sort_order        INT NOT NULL DEFAULT 0
);

-- ── next_via_number() function ───────────────────────────────
-- Race-safe sequential TVC number assignment
CREATE OR REPLACE FUNCTION public.next_via_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  max_num INT;
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(987654321);
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(via_number FROM 4) AS INT)), 1000
  ) INTO max_num
  FROM public.businesses
  WHERE via_number ~ '^TVC[0-9]+$';
  next_num := max_num + 1;
  RETURN 'TVC' || next_num;
END;
$$;

-- ── Seed: default payment link ────────────────────────────────
INSERT INTO public.payment_links (slug, label, url, is_active, sort_order)
VALUES
  ('via-membership',    'TVC Membership (£49/month)',      NULL, true, 0),
  ('priority-checking', 'Priority Checking (£49 one-off)', NULL, true, 1)
ON CONFLICT (slug) DO NOTHING;

-- ── Row Level Security (permissive for API server access) ────
-- The API server uses the service role key which bypasses RLS.
-- Enable RLS on tables but allow the service role full access.
ALTER TABLE public.businesses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_links       ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own business
CREATE POLICY "Members read own business"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to read their own application
CREATE POLICY "Members read own application"
  ON public.applications FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated users to read their own notifications
CREATE POLICY "Members read own notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_type = 'member' AND (
      user_id = auth.uid() OR
      business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    )
  );
