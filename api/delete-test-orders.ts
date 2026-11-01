import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────
// POST /api/delete-test-orders
//
// Admin-only endpoint to wipe test orders and transaction records
// without affecting products, categories, or inventory catalog.
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass client-side RLS limits.
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

  // Handle 204 No Content
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order_id, all } = req.body as {
      order_id?: string;
      all?: boolean;
    };

    if (!order_id && !all) {
      return res.status(400).json({ error: 'Please provide order_id or set all: true' });
    }

    if (all) {
      // 1. Delete all order_items first to maintain referential integrity
      await dbFetch('order_items?id=neq.00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      // 2. Delete all orders
      const deletedOrders = await dbFetch('orders?id=neq.00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      });

      return res.status(200).json({
        success: true,
        message: 'All test orders and transaction records deleted successfully.',
        count: Array.isArray(deletedOrders) ? deletedOrders.length : 0,
      });
    }

    if (order_id) {
      // 1. Delete order_items for this specific order
      await dbFetch(`order_items?order_id=eq.${encodeURIComponent(order_id)}`, {
        method: 'DELETE',
      });

      // 2. Delete the order
      const deletedOrder = await dbFetch(`orders?id=eq.${encodeURIComponent(order_id)}`, {
        method: 'DELETE',
      });

      return res.status(200).json({
        success: true,
        message: `Order ${order_id} and associated transaction records deleted successfully.`,
        deleted: deletedOrder,
      });
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (err: any) {
    console.error('[delete-test-orders error]:', err);
    return res.status(500).json({
      error: err.message || 'Failed to delete orders and transactions.',
    });
  }
}

