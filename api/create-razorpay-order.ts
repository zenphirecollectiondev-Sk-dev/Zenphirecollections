import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// POST /api/create-razorpay-order
//
// Called by Checkout.tsx when user clicks "Proceed to Payment".
// Validates coupon server-side, computes the verified total
// from live DB prices (never trusts frontend amounts), then
// creates a Razorpay order and returns the order ID + key.
//
// Domain-safe: works on vercel.app subdomain AND any custom
// domain (GoDaddy etc.) pointed to Vercel — zero code changes.
// ─────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper: query Supabase REST API using the service role key (bypasses RLS)
async function dbQuery(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB error: ${err}`);
  }
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart_items, coupon_code } = req.body as {
      cart_items: { variant_id: string; quantity: number }[];
      coupon_code?: string | null;
    };

    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // ── Step 1: Fetch live prices from DB (prevent price tampering) ──
    const variantIds = cart_items.map((i) => i.variant_id).join(',');
    const variants: any[] = await dbQuery(
      `product_variants?id=in.(${variantIds})&select=id,stock_qty,products(base_price)`,
    );

    if (!variants || variants.length === 0) {
      return res.status(400).json({ error: 'Could not fetch product prices.' });
    }

    // ── Step 2: Verify stock & compute subtotal from DB prices ──
    let subtotal = 0;
    for (const item of cart_items) {
      const variant = variants.find((v: any) => v.id === item.variant_id);
      if (!variant) return res.status(400).json({ error: `Product variant not found.` });
      if (variant.stock_qty < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for one of the items. Please update your cart.` });
      }
      subtotal += (variant.products as any).base_price * item.quantity;
    }

    // ── Step 3: Validate coupon server-side ──
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;

    if (coupon_code && coupon_code.trim()) {
      const normalizedCode = coupon_code.trim().toUpperCase();
      const coupons: any[] = await dbQuery(
        `coupons?code=eq.${encodeURIComponent(normalizedCode)}&is_active=eq.true&select=*`,
      );

      const coupon = coupons?.[0];
      if (!coupon) {
        return res.status(400).json({ error: `Coupon "${normalizedCode}" is invalid or has been deactivated.` });
      }
      if (new Date() > new Date(coupon.expiry)) {
        return res.status(400).json({ error: `Coupon "${normalizedCode}" has expired.` });
      }
      if (subtotal < (coupon.min_order_value || 0)) {
        return res.status(400).json({
          error: `Minimum order of ₹${coupon.min_order_value} required for this coupon.`,
        });
      }

      discountAmount =
        coupon.discount_type === 'percentage'
          ? Math.min((subtotal * coupon.value) / 100, subtotal)
          : Math.min(coupon.value, subtotal);

      validatedCouponCode = normalizedCode;
    }

    // ── Step 4: Compute shipping & final total ──
    const afterDiscount = subtotal - discountAmount;
    const shippingCost = afterDiscount > 0 && afterDiscount <= 1000 ? 150 : 0;
    const total = Math.max(0, afterDiscount + shippingCost);
    const totalPaise = Math.round(total * 100); // Razorpay uses paise

    // ── Step 5: Create Razorpay order (server-to-server) ──
    const rzpBasic = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${rzpBasic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: 'INR',
        receipt: `zp_${Date.now()}`,
      }),
    });

    if (!rzpRes.ok) {
      const rzpErr = await rzpRes.text();
      throw new Error(`Razorpay order creation failed: ${rzpErr}`);
    }

    const rzpOrder = await rzpRes.json();

    // ── Step 6: Return verified amounts to frontend ──
    return res.status(200).json({
      razorpay_order_id: rzpOrder.id,
      amount_paise: rzpOrder.amount,
      key_id: RAZORPAY_KEY_ID,
      verified_subtotal: subtotal,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      verified_total: total,
      coupon_code: validatedCouponCode,
    });
  } catch (err: any) {
    console.error('[create-razorpay-order]', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
