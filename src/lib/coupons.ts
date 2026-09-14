export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  expiry: string; // ISO String
  minOrderValue: number;
}

export interface ValidationResult {
  isValid: boolean;
  discountAmount: number;
  error?: string;
  coupon?: Coupon;
}

/**
 * Coupon validation is performed server-side via the Supabase `coupons` table.
 * This stub is kept for type compatibility only and always returns invalid
 * to ensure no coupon discount can ever be applied without a valid DB record.
 */
export function validateCoupon(_code: string, _cartSubtotal: number): ValidationResult {
  return { isValid: false, discountAmount: 0, error: 'Invalid or expired coupon code.' };
}

