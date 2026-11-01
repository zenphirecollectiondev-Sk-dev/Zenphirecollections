import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────
// POST /api/cancel-razorpay-order
//
// Called when a customer dismisses the Razorpay modal, cancels
// the transaction, or when a payment attempt fails.
// Ensures the pre-created order does NOT linger as 'pending'
// or get mistaken for 'processing', updating it explicitly
// to payment_status: 'failed' and status: 'cancelled'.
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function dbFetch(path: string, options?: RequestInit) {
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
  return res.json() as Promise<any>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, reason } = req.body as {
      razorpay_order_id?: string;
      reason?: string;
    };

    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing razorpay_order_id' });
    }

    // 1. Look up existing order by razorpay_order_id
    const orders: any[] = await dbFetch(
      `orders?razorpay_order_id=eq.${encodeURIComponent(razorpay_order_id)}&select=id,order_number,payment_status,status`
    );

    const existingOrder = orders?.[0];
    if (!existingOrder) {
      return res.status(200).json({ status: 'order_not_found', razorpay_order_id });
    }

    // Safety guard: Never cancel an order that was already verified and paid
    if (existingOrder.payment_status === 'paid') {
      return res.status(200).json({
        status: 'already_paid',
        order_number: existingOrder.order_number,
      });
    }

    // 2. Mark payment_status as 'failed' and status as 'cancelled'
    await dbFetch(`orders?id=eq.${existingOrder.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        payment_status: 'failed',
        status: 'cancelled',
      }),
    });

    console.log(
      `[cancel-razorpay-order] Marked order ${existingOrder.id} (${existingOrder.order_number}) as cancelled / failed (reason: ${reason || 'unspecified'}).`
    );

    return res.status(200).json({
      success: true,
      order_id: existingOrder.id,
      order_number: existingOrder.order_number,
      status: 'cancelled',
      payment_status: 'failed',
    });
  } catch (err: any) {
    console.error('[cancel-razorpay-order]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
