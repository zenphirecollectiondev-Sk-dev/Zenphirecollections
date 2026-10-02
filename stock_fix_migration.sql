-- ============================================================
-- Zenphire Collections — Stock Management Fix Migration
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. ATOMIC STOCK DECREMENT FUNCTION
--    Replaces the client-side SELECT + calculate + UPDATE pattern.
--    Single SQL statement — race-condition-proof.
--    Throws an exception if insufficient stock → order is blocked, not silently skipped.
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_variant_id uuid,
  p_qty        integer
)
RETURNS void AS $$
BEGIN
  UPDATE public.product_variants
    SET stock_qty = stock_qty - p_qty
    WHERE id = p_variant_id
      AND stock_qty >= p_qty;   -- safety guard: only succeeds if enough stock exists

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. ADDITIVE STOCK INCREMENT FUNCTION (for Admin quick-add)
--    Used by the "+Add Stock" feature in Admin Inventory tab.
--    Additive (adds to existing), never overwrites.
CREATE OR REPLACE FUNCTION public.increment_stock(
  p_variant_id uuid,
  p_qty        integer
)
RETURNS integer AS $$
DECLARE
  new_qty integer;
BEGIN
  UPDATE public.product_variants
    SET stock_qty = stock_qty + p_qty
    WHERE id = p_variant_id
  RETURNING stock_qty INTO new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant % not found', p_variant_id;
  END IF;

  RETURN new_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. STOCK MOVEMENTS AUDIT LOG TABLE
--    Every stock change is recorded here — who, when, why, which order.
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id   uuid        REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
  change_qty   integer     NOT NULL,  -- negative = sold/removed, positive = restocked/added
  reason       text        NOT NULL   CHECK (reason IN ('order', 'admin_add', 'admin_set', 'admin_bulk')),
  order_id     uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  performed_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         text,
  created_at   timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast variant history lookups
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant
  ON public.stock_movements(variant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access to stock_movements"
  ON public.stock_movements FOR ALL
  USING (public.is_admin());

-- ============================================================
-- END OF MIGRATION — verify with:
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--   AND routine_name IN ('decrement_stock', 'increment_stock');
-- ============================================================
