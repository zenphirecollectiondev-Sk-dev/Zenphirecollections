import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Initialize a fully typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Typings shorthand
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
export type ProductVariantRow = Database['public']['Tables']['product_variants']['Row'];
export type CategoryRow = Database['public']['Tables']['categories']['Row'];
export type AddressRow = Database['public']['Tables']['addresses']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];

export interface ProductWithDetails extends ProductRow {
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
}

// -------------------------------------------------------------
// TYPED COMMON DATABASE QUERY HELPERS
// -------------------------------------------------------------

/**
 * Fetch active products for the home page listing.
 * Only selects the 6 fields the home page actually renders — no variants
 * (never used on home), narrowed image columns (url + sort_order only).
 * Capped at 100 rows: the home page shows ≤12 products, but 100 gives
 * the per-slug pre-cache enough breadth for instant ProductDetail renders.
 */
export async function getActiveProducts(): Promise<ProductWithDetails[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      base_price,
      created_at,
      category_id,
      product_images ( url, sort_order )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching active products.');
    throw error;
  }

  // Sort images by sort_order client-side, attach empty variants array so
  // the ProductWithDetails shape is satisfied (home page never reads variants)
  return (data || []).map((p) => ({
    ...p,
    product_variants: [],
    product_images: [...(p.product_images || [])].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
  })) as unknown as ProductWithDetails[];
}


/**
 * Fetch a single product with variants and images by its slug or ID.
 * Uses a single PostgREST embedded-join query so product core, variants,
 * and images all arrive in one HTTP round trip instead of three.
 */
export async function getProductDetails(identifier: string, isSlug = true): Promise<ProductWithDetails | null> {
  const query = supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)');

  const { data, error } = await (isSlug
    ? query.eq('slug', identifier).maybeSingle()
    : query.eq('id', identifier).maybeSingle());

  if (error) {
    console.error('Error fetching product details.');
    throw error;
  }
  if (!data) return null;

  // Sort images by sort_order client-side (same as getActiveProducts)
  return {
    ...data,
    product_images: [...(data.product_images || [])].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
  } as ProductWithDetails;
}


/**
 * Fetch all categories
 */
export async function getCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories.');
    throw error;
  }

  return data || [];
}

/**
 * Fetch user's cart items with variants and products
 */
export async function getUserCart(userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      user_id,
      variant_id,
      quantity,
      created_at,
      product_variants (
        id,
        size,
        color,
        stock_qty,
        sku,
        products (
          id,
          name,
          slug,
          base_price
        )
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user cart.');
    throw error;
  }

  return data || [];
}

/**
 * Fetch user's wishlist with products and their first image
 */
export async function getUserWishlist(userId: string) {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select(`
      id,
      product_id,
      products (
        id,
        name,
        slug,
        base_price,
        is_active,
        product_images (url)
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user wishlist.');
    throw error;
  }

  return data || [];
}

/**
 * Fetch default or all addresses for a user
 */
export async function getUserAddresses(userId: string): Promise<AddressRow[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error fetching user addresses.');
    throw error;
  }

  return data || [];
}

/**
 * Fetch orders for a user with items and variant info
 */
export async function getUserOrders(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      total,
      subtotal,
      discount_amount,
      coupon_code,
      shipping_cost,
      courier_name,
      courier_tracking_url,
      tracking_id,
      created_at,
      order_items (
        id,
        quantity,
        price_at_purchase,
        product_variants (
          size,
          color,
          products (
            name,
            slug,
            product_images (
              url
            )
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user orders.');
    throw error;
  }

  return data || [];
}

/**
 * Fetch multiple products with variants and images by their IDs
 */
export async function getProductsByIds(ids: string[]): Promise<ProductWithDetails[]> {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (*),
      product_variants (*)
    `)
    .in('id', ids);

  if (error) {
    console.error('Error fetching products by ids.');
    throw error;
  }
  return (data || []) as ProductWithDetails[];
}
