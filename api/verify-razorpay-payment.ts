import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// POST /api/verify-razorpay-payment
//
// THE MOST CRITICAL FUNCTION IN THE PAYMENT FLOW.
// Called after Razorpay returns a successful payment to the
// browser. Verifies the HMAC-SHA256 signature — if it doesn't
// match, the payment is forged and we reject it immediately.
// Only after verification do we write the order to the DB.
//
// Domain-safe: works on vercel.app and any custom domain.
// ─────────────────────────────────────────────────────────────

const RAZORPAY_KEY_SECRET  = process.env.RAZORPAY_KEY_SECRET!;
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper: query Supabase REST API with service role (bypasses RLS)
async function dbPost(table: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB insert error on ${table}: ${err}`);
  }
  return res.json();
}

async function dbRpc(fn: string, args: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`RPC error (${fn}): ${err}`);
  }
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    user_id,
    address_id,
    cart_items,
    coupon_code,
    subtotal,
    discount_amount,
    shipping_cost,
    total,
  } = req.body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    user_id: string;
    address_id: string | null;
    cart_items: { variant_id: string; quantity: number; price: number }[];
    coupon_code: string | null;
    subtotal: number;
    discount_amount: number;
    shipping_cost: number;
    total: number;
  };

  // ── STEP 1: HMAC-SHA256 Signature Verification ──────────────
  // This is the cryptographic proof the payment is real.
  // If a malicious user tampers with the payment IDs, their
  // signature will NOT match and we reject without creating an order.
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('[verify-payment] SIGNATURE MISMATCH — possible fraud attempt', {
      razorpay_order_id,
      razorpay_payment_id,
    });
    return res.status(400).json({
      success: false,
      error: 'Payment verification failed. Please contact support.',
    });
  }

  // ── STEP 2: Write order to DB ─────────────────────────────
  try {
    // Generate human-readable order reference
    const orderRef = `ZP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Insert orders row
    const orderRows: any[] = await dbPost('orders', {
      user_id,
      status: 'processing',
      payment_status: 'paid',
      subtotal,
      discount_amount: discount_amount ?? 0,
      coupon_code: coupon_code ?? null,
      shipping_cost: shipping_cost ?? 0,
      total,
      address_id: address_id ?? null,
      razorpay_order_id,
      razorpay_payment_id,
      tracking_id: orderRef,
    });

    const order = orderRows[0];
    if (!order) throw new Error('Order insert returned no data.');

    // ── STEP 3: Insert order_items with price snapshot ──────
    // price_at_purchase is locked at time of purchase — never changes
    // even if product prices change later.
    await dbPost(
      'order_items',
      cart_items.map((item) => ({
        order_id: order.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price_at_purchase: item.price,
      })),
    );

    // ── STEP 4: Atomic stock decrement via DB function ──────
    // Uses the decrement_stock() function created in stock_fix_migration.sql
    // which has WHERE stock_qty >= qty — prevents negative stock
    // even under simultaneous concurrent orders.
    for (const item of cart_items) {
      await dbRpc('decrement_stock', {
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
      });
    }

    // ── STEP 5: Return success ────────────────────────────
    return res.status(200).json({
      success: true,
      order_ref: orderRef,
      order_id: order.id,
    });

  } catch (err: any) {
    console.error('[verify-payment] DB write error after verified payment:', err.message);
    // IMPORTANT: Payment IS real (signature verified) but DB write failed.
    // Return the payment ID so user can contact support.
    return res.status(500).json({
      success: false,
      error: `Payment received (ID: ${razorpay_payment_id}) but order could not be saved. Please contact support with this payment ID.`,
      razorpay_payment_id,
    });
  }
}
