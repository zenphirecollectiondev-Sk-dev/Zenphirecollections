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
  return res.json() as Promise<any>;
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
  return res.json() as Promise<any>;
}

async function dbPatch(path: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
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
    throw new Error(`DB patch error on ${path}: ${err}`);
  }
  return res.json() as Promise<any>;
}

async function dbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB get error on ${path}: ${err}`);
  }
  return res.json() as Promise<any>;
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
  // Cryptographic proof the payment was authorized by Razorpay with our Key Secret.
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('[verify-payment] SIGNATURE MISMATCH — rejected forged payment attempt', {
      razorpay_order_id,
      razorpay_payment_id,
    });
    return res.status(400).json({
      success: false,
      error: 'Payment verification failed. Invalid signature.',
    });
  }

  // ── STEP 2: Idempotent Order Resolution & Stock Decrement ───
  try {
    // 2A. Check if an order already exists for this razorpay_order_id
    const existingOrders: any[] = await dbGet(
      `orders?razorpay_order_id=eq.${encodeURIComponent(razorpay_order_id)}&select=id,order_number,payment_status`
    );

    const existing = existingOrders?.[0];

    // Case 1: Order exists and is ALREADY marked 'paid' (e.g. webhook resolved it first)
    if (existing && existing.payment_status === 'paid') {
      console.log(`[verify-payment] Order ${existing.id} (${existing.order_number}) is already marked 'paid'. Returning success idempotently.`);
      return res.status(200).json({
        success: true,
        order_ref: existing.order_number,
        order_id: existing.id,
        already_paid: true,
      });
    }

    // Case 2: Order was pre-created as pending/unpaid in create-razorpay-order
    if (existing) {
      await dbPatch(`orders?id=eq.${existing.id}`, {
        payment_status: 'paid',
        status: 'processing',
        razorpay_payment_id,
        ...(address_id ? { address_id } : {}),
      });

      // Atomic stock decrement
      if (cart_items && cart_items.length > 0) {
        for (const item of cart_items) {
          try {
            await dbRpc('decrement_stock', {
              p_variant_id: item.variant_id,
              p_qty: item.quantity,
            });
          } catch (stockErr: any) {
            console.warn('[verify-payment] Warning during decrement_stock RPC:', stockErr.message);
          }
        }
      }

      return res.status(200).json({
        success: true,
        order_ref: existing.order_number,
        order_id: existing.id,
      });
    }

    // Case 3 (Fallback): Order record was not pre-created — create from verified payment
    let orderNum = 1;
    try {
      const countRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id`, {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Range: '0-0',
          Prefer: 'count=exact',
        },
      });
      const contentRange = countRes.headers.get('content-range');
      if (contentRange) {
        const totalCount = parseInt(contentRange.split('/')[1] || '0', 10);
        if (!isNaN(totalCount)) {
          orderNum = totalCount + 1;
        }
      }
    } catch (countErr) {
      console.warn('[verify-payment] Warning reading order count, falling back:', countErr);
    }

    const orderRef = `ZPN-${String(orderNum).padStart(3, '0')}`;

    const orderPayload: any = {
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
      tracking_id: null,
      order_number: orderRef,
    };

    let orderRows: any[];
    try {
      orderRows = await dbPost('orders', orderPayload);
    } catch (insertErr: any) {
      const errStr = String(insertErr?.message || insertErr);
      if (errStr.includes('order_number') || errStr.includes('schema cache')) {
        delete orderPayload.order_number;
        orderRows = await dbPost('orders', orderPayload);
      } else {
        throw insertErr;
      }
    }

    const order = orderRows[0];
    if (!order) throw new Error('Order insert returned no data.');

    // Insert order_items
    if (cart_items && cart_items.length > 0) {
      await dbPost(
        'order_items',
        cart_items.map((item) => ({
          order_id: order.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price_at_purchase: item.price,
        })),
      );

      // Decrement stock
      for (const item of cart_items) {
        try {
          await dbRpc('decrement_stock', {
            p_variant_id: item.variant_id,
            p_qty: item.quantity,
          });
        } catch (stockErr: any) {
          console.warn('[verify-payment] Warning during decrement_stock RPC:', stockErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      order_ref: orderRef,
      order_id: order.id,
    });

  } catch (err: any) {
    console.error('[verify-payment] DB write error after verified payment:', err);
    return res.status(500).json({
      success: false,
      error: `Payment received (ID: ${razorpay_payment_id}) but order could not be saved: ${err.message || 'Database error'}. Please contact support with this payment ID.`,
      details: err.message || String(err),
      razorpay_payment_id,
    });
  }
}
