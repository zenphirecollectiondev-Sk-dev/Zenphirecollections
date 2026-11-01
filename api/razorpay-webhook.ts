import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// POST /api/razorpay-webhook
//
// Webhook endpoint for Razorpay real-time events.
// Serves as the critical safety net: if a user's browser closes,
// network drops, or tab is closed after payment is deducted,
// Razorpay sends payment.captured / order.paid here directly.
//
// Security & Idempotency:
// 1. Verifies X-Razorpay-Signature using RAZORPAY_WEBHOOK_SECRET.
// 2. Checks order status in DB before processing — if already 'paid',
//    exits safely without double-processing or double-decrementing stock.
// 3. Handles payment.captured, order.paid, and payment.failed.
// ─────────────────────────────────────────────────────────────

export const config = {
  api: {
    bodyParser: false, // Required for exact raw body HMAC verification
  },
};

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL            = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper: read raw request body as buffer/string
async function getRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Helper: Supabase REST query using service role key (bypasses RLS)
async function dbFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
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
    const errText = await res.text();
    throw new Error(`DB error (${endpoint}): ${errText}`);
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
    const errText = await res.text();
    throw new Error(`RPC error (${fn}): ${errText}`);
  }
  return res.json() as Promise<any>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('[razorpay-webhook] Error: RAZORPAY_WEBHOOK_SECRET is not configured in environment variables.');
    return res.status(500).json({ error: 'Webhook secret is not configured.' });
  }

  let rawBody = '';
  try {
    rawBody = await getRawBody(req);
  } catch (err: any) {
    console.error('[razorpay-webhook] Failed to read request body:', err);
    return res.status(400).json({ error: 'Could not read request body.' });
  }

  // ── Step 1: Signature Verification ───────────────────────────
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    console.warn('[razorpay-webhook] Missing X-Razorpay-Signature header.');
    return res.status(400).json({ error: 'Missing signature header.' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('[razorpay-webhook] Signature verification failed. Potential spoofed request.');
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  // ── Step 2: Parse Event Payload ──────────────────────────────
  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch (err) {
    console.error('[razorpay-webhook] Invalid JSON payload:', err);
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }

  const eventName: string = eventPayload.event;
  console.log(`[razorpay-webhook] Received verified event: ${eventName}`);

  try {
    // ── Event: payment.captured OR order.paid ───────────────────
    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const orderEntity   = eventPayload.payload?.order?.entity;

      const rzpOrderId: string | undefined = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId: string | undefined = paymentEntity?.id;

      if (!rzpOrderId) {
        console.warn('[razorpay-webhook] Event missing order_id. Skipping.');
        return res.status(200).json({ status: 'ignored', reason: 'no order_id' });
      }

      // 1. Look up existing order by razorpay_order_id
      const orders: any[] = await dbFetch(
        `orders?razorpay_order_id=eq.${encodeURIComponent(rzpOrderId)}&select=id,payment_status,order_number`
      );

      const existingOrder = orders?.[0];

      if (!existingOrder) {
        console.warn(`[razorpay-webhook] Order with razorpay_order_id "${rzpOrderId}" not found in DB yet.`);
        return res.status(200).json({ status: 'pending_order_not_found', razorpay_order_id: rzpOrderId });
      }

      // 2. Idempotency Check: if order is already marked 'paid', do not process again
      if (existingOrder.payment_status === 'paid') {
        console.log(`[razorpay-webhook] Order ${existingOrder.id} (${existingOrder.order_number}) is already marked 'paid'. Skipping.`);
        return res.status(200).json({ status: 'already_paid', order_id: existingOrder.id });
      }

      // 3. Update order status to 'paid' and 'processing'
      await dbFetch(
        `orders?id=eq.${existingOrder.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            payment_status: 'paid',
            status: 'processing',
            ...(rzpPaymentId ? { razorpay_payment_id: rzpPaymentId } : {}),
          }),
        }
      );

      // 4. Atomic stock decrement for order items
      try {
        const orderItems: any[] = await dbFetch(
          `order_items?order_id=eq.${existingOrder.id}&select=variant_id,quantity`
        );

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            try {
              await dbRpc('decrement_stock', {
                p_variant_id: item.variant_id,
                p_qty: item.quantity,
              });
            } catch (stockErr: any) {
              console.warn(`[razorpay-webhook] Warning during stock decrement for variant ${item.variant_id}:`, stockErr.message);
            }
          }
        }
      } catch (itemErr: any) {
        console.warn('[razorpay-webhook] Warning fetching order_items for stock decrement:', itemErr.message);
      }

      console.log(`[razorpay-webhook] Successfully marked order ${existingOrder.id} (${existingOrder.order_number}) as paid.`);
      return res.status(200).json({ status: 'success', order_id: existingOrder.id });
    }

    // ── Event: payment.failed ───────────────────────────────────
    if (eventName === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const rzpOrderId: string | undefined = paymentEntity?.order_id;
      const rzpPaymentId: string | undefined = paymentEntity?.id;

      if (rzpOrderId) {
        const orders: any[] = await dbFetch(
          `orders?razorpay_order_id=eq.${encodeURIComponent(rzpOrderId)}&select=id,payment_status`
        );
        const existingOrder = orders?.[0];

        // Only mark failed if not already paid
        if (existingOrder && existingOrder.payment_status !== 'paid') {
          await dbFetch(
            `orders?id=eq.${existingOrder.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                payment_status: 'failed',
                status: 'cancelled',
                ...(rzpPaymentId ? { razorpay_payment_id: rzpPaymentId } : {}),
              }),
            }
          );
          console.log(`[razorpay-webhook] Marked order ${existingOrder.id} as failed.`);
        }
      }
      return res.status(200).json({ status: 'failure_recorded' });
    }

    // Return 200 for any other events so Razorpay knows we received it
    return res.status(200).json({ status: 'ignored', event: eventName });
  } catch (err: any) {
    console.error(`[razorpay-webhook] Error processing event ${eventName}:`, err);
    // Return 500 so Razorpay retries if an unexpected system failure occurred
    return res.status(500).json({ error: 'Internal server error processing webhook.' });
  }
}
