-- ============================================================================
-- SignalStack — Generic Seed Data
-- ============================================================================
-- Run AFTER applying 001_initial_template_schema.sql.
--
-- This data is safe to commit — no real PII, no niche or industry-specific
-- content. Replace with your own products and branding before going live.
-- ============================================================================

-- ── Products ──────────────────────────────────────────────────────────────────
INSERT INTO products (name, description, price_cents, currency, interval, is_active, sort_order)
VALUES
  ('Starter',
   'Core features to get started. Perfect for individuals.',
   2900, 'usd', 'monthly', TRUE, 1),
  ('Pro',
   'Full feature access for power users. Includes everything in Starter.',
   7900, 'usd', 'monthly', TRUE, 2),
  ('Lifetime',
   'All Pro features with a single one-time payment. No renewals.',
   49900, 'usd', 'lifetime', TRUE, 3)
ON CONFLICT DO NOTHING;

-- ── Customers ─────────────────────────────────────────────────────────────────
INSERT INTO customers (email, plan_name, status, subscribed_at)
VALUES
  ('demo.active@example.com',    'Pro',     'active',    NOW() - INTERVAL '14 days'),
  ('demo.cancelled@example.com', 'Starter', 'cancelled', NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- ── Access links ──────────────────────────────────────────────────────────────
INSERT INTO access_links (platform, label, invite_url, sort_order)
VALUES
  ('discord',  'Members Community', 'https://discord.gg/replace-me', 1),
  ('telegram', 'Updates Channel',   'https://t.me/replace-me',       2)
ON CONFLICT DO NOTHING;

-- ── Events (spread over 30 days — provides a realistic demo chart) ────────────
INSERT INTO events (event_type, product_name, actor, created_at)
VALUES
  ('product_view',    'Pro',      'anon',   NOW() - INTERVAL '29 days'),
  ('product_view',    'Starter',  'anon',   NOW() - INTERVAL '27 days'),
  ('purchase_click',  'Pro',      'anon',   NOW() - INTERVAL '25 days'),
  ('product_view',    'Pro',      'anon',   NOW() - INTERVAL '22 days'),
  ('member_join',     'Pro',      'system', NOW() - INTERVAL '20 days'),
  ('product_view',    'Starter',  'anon',   NOW() - INTERVAL '18 days'),
  ('purchase_click',  'Starter',  'anon',   NOW() - INTERVAL '15 days'),
  ('product_view',    'Lifetime', 'anon',   NOW() - INTERVAL '13 days'),
  ('product_view',    'Pro',      'anon',   NOW() - INTERVAL '10 days'),
  ('purchase_click',  'Pro',      'anon',   NOW() - INTERVAL '8 days'),
  ('product_publish', 'Starter',  'admin',  NOW() - INTERVAL '6 days'),
  ('member_join',     'Starter',  'system', NOW() - INTERVAL '4 days'),
  ('product_view',    'Pro',      'anon',   NOW() - INTERVAL '3 days'),
  ('purchase_click',  'Lifetime', 'anon',   NOW() - INTERVAL '1 day'),
  ('product_view',    'Starter',  'anon',   NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- ── Content block ─────────────────────────────────────────────────────────────
INSERT INTO content_blocks (title, body, type, is_published, published_at, sort_order)
VALUES (
  'Welcome to the community!',
  'Thanks for joining. Use the access links in your account to get started.',
  'announcement',
  TRUE,
  NOW() - INTERVAL '14 days',
  1
)
ON CONFLICT DO NOTHING;

-- ── Sample enquiry ────────────────────────────────────────────────────────────
INSERT INTO messages (email, name, subject, body, status)
VALUES (
  'demo.enquiry@example.com',
  'Demo User',
  'Question about the Pro plan',
  'Hi, I was wondering if the Pro plan includes access to all channels. Thanks!',
  'unread'
)
ON CONFLICT DO NOTHING;
