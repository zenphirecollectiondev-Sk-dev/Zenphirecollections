-- ==============================================================================
-- ZENPHIRE COLLECTIONS — PAYMENT SECURITY & RLS HARDENING MIGRATION
-- Run in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Ensure performance indexes exist for fast webhook & verification lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id
  ON public.orders(razorpay_payment_id);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

-- 2. Drop legacy loose insert policy that allowed clients to self-assign payment_status
DROP POLICY IF EXISTS "Allow users to place own orders" ON public.orders;

-- 3. Strict Insert Policy for authenticated users:
--    If an authenticated user places an order via client, payment_status MUST be 'unpaid'
--    and status MUST be 'pending'. Client can NEVER self-assign 'paid'.
CREATE POLICY "Allow users to place own orders with unpaid status only"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (payment_status IS NULL OR payment_status = 'unpaid')
    AND (status IS NULL OR status = 'pending')
  );

-- 4. Ensure users CANNOT update orders directly (only service_role and admin can update):
DROP POLICY IF EXISTS "Allow users to update own orders" ON public.orders;

-- 5. Users can only read their own orders (or admins):
DROP POLICY IF EXISTS "Allow users to read own orders" ON public.orders;
CREATE POLICY "Allow users to read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- 6. Full admin management access:
DROP POLICY IF EXISTS "Allow admin full access to orders" ON public.orders;
CREATE POLICY "Allow admin full access to orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- ==============================================================================
-- Verification Query:
-- SELECT polname, polcmd, polroles, polqual, polwithcheck 
-- FROM pg_policy 
-- WHERE polrelid = 'public.orders'::regclass;
-- ==============================================================================
