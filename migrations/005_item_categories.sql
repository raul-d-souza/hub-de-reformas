-- ============================================================
-- Migration 005: Item Categories + Payment-Item enrichment
-- Adds category to items for consistent categorization across
-- items and payments, and an index for payment→item lookups.
-- ============================================================

-- 1. Add category column to items (reuses payment category values)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'material';

-- Valid values: 'material', 'labor', 'service', 'other'
-- We use TEXT instead of ENUM to stay consistent with payments.category

-- 2. Index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);

-- 3. Index for reverse lookup: find all payments for a given item
CREATE INDEX IF NOT EXISTS idx_payments_item ON public.payments(item_id)
  WHERE item_id IS NOT NULL;
