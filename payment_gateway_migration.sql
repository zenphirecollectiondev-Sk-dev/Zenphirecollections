-- ============================================================
-- Zenphire Collections — Payment Gateway DB Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add Razorpay payment tracking columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text UNIQUE,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status      text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS subtotal            numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_amount     numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code         text,
  ADD COLUMN IF NOT EXISTS shipping_cost       numeric(12,2) DEFAULT 0;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders(razorpay_order_id);

-- 2. Add is_active column to coupons (admin-controlled enable/disable)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_coupons_is_active
  ON public.coupons(is_active);

-- 3. Add streamlined order reference number column (e.g. ZPN-001)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text;

CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders(order_number);

-- Populate sequential ZPN-001, ZPN-002... for existing orders if empty
WITH numbered AS (
  SELECT id, 'ZPN-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::text, 3, '0') as gen_ref
  FROM public.orders
)
UPDATE public.orders o
SET order_number = n.gen_ref
FROM numbered n
WHERE o.id = n.id AND (o.order_number IS NULL OR o.order_number = '');

-- ============================================================
-- Verify with:
-- SELECT id, order_number, payment_status, tracking_id, courier_name FROM public.orders;
-- ============================================================
