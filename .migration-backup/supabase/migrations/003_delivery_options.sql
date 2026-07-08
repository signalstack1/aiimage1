-- Migration 003: Delivery options
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS free_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faster_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faster_delivery_payment_link TEXT;

NOTIFY pgrst, 'reload schema';
