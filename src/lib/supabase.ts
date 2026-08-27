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
 * Fetch all active products with their variants and images in a single query.
 * Uses embedded joins (same pattern as getProductsByIds) so images and variants
 * are always returned together — no secondary IN-query that can silently fail.
 */
export async function getActiveProducts(): Promise<ProductWithDetails[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (*),
      product_variants (*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active products:', error);
    throw error;
  }

  // Ensure product_images are sorted by sort_order client-side
  return (data || []).map((p) => ({
    ...p,
    product_images: [...(p.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
  })) as ProductWithDetails[];
}

/**
 * Fetch a single product with variants and images by its slug or ID.
 * Uses separate queries so a product_images timeout doesn't block the product detail page.
 */
export async function getProductDetails(identifier: string, isSlug = true): Promise<ProductWithDetails | null> {
  // 1. Fetch the product core
  const query = supabase.from('products').select('*');
  const { data: product, error } = await (isSlug
    ? query.eq('slug', identifier).maybeSingle()
    : query.eq('id', identifier).maybeSingle());

  if (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
  if (!product) return null;

  // 2. Fetch variants and images in parallel (images are non-critical)
  const [variantsResult, imagesResult] = await Promise.allSettled([
    supabase.from('product_variants').select('*').eq('product_id', product.id),
    supabase.from('product_images').select('*').eq('product_id', product.id).order('sort_order', { ascending: true })
  ]);

  const variants = variantsResult.status === 'fulfilled' ? (variantsResult.value.data || []) : [];
  const images = imagesResult.status === 'fulfilled' ? (imagesResult.value.data || []) : [];

  return {
    ...product,
    product_variants: variants,
    product_images: images,
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
    console.error('Error fetching categories:', error);
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
    console.error('Error fetching user cart:', error);
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
    console.error('Error fetching user wishlist:', error);
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
    console.error('Error fetching user addresses:', error);
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
    console.error('Error fetching user orders:', error);
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
    console.error('Error fetching products by ids:', error);
    throw error;
  }
  return (data || []) as ProductWithDetails[];
}
