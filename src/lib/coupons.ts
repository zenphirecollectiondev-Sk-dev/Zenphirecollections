export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  expiry: string; // ISO String
  minOrderValue: number;
}

export const mockCoupons: Coupon[] = [
  {
    code: 'ZENPHIRE10',
    discountType: 'percentage',
    value: 10, // 10%
    expiry: '2028-12-31T23:59:59Z', // far future
    minOrderValue: 0.00
  },
  {
    code: 'ZENPHIRE50',
    discountType: 'fixed',
    value: 50.00, // $50 off
    expiry: '2028-12-31T23:59:59Z',
    minOrderValue: 200.00
  },
  {
    code: 'MINIMAL25',
    discountType: 'percentage',
    value: 25, // 25%
    expiry: '2028-12-31T23:59:59Z',
    minOrderValue: 150.00
  },
  {
    code: 'EXPIRED10',
    discountType: 'percentage',
    value: 10,
    expiry: '2025-01-01T00:00:00Z', // already expired
    minOrderValue: 0.00
  }
];

export interface ValidationResult {
  isValid: boolean;
  discountAmount: number;
  error?: string;
  coupon?: Coupon;
}

/**
 * Validates a coupon code against the cart total amount.
 * Returns the calculated discount amount or error details.
 */
export function validateCoupon(code: string, cartSubtotal: number): ValidationResult {
  const normalizedCode = code.trim().toUpperCase();
  const coupon = mockCoupons.find((c) => c.code === normalizedCode);

  if (!coupon) {
    return { isValid: false, discountAmount: 0, error: 'Invalid coupon code.' };
  }

  // Check Expiration
  const now = new Date();
  const expiryDate = new Date(coupon.expiry);
  if (now > expiryDate) {
    return { isValid: false, discountAmount: 0, error: 'This coupon code has expired.' };
  }

  // Check Minimum Order Value
  if (cartSubtotal < coupon.minOrderValue) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `Minimum order value of $${coupon.minOrderValue.toFixed(2)} is required for this coupon.`
    };
  }

  // Calculate Discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartSubtotal * coupon.value) / 100;
  } else if (coupon.discountType === 'fixed') {
    discountAmount = coupon.value;
  }

  // Discount shouldn't exceed subtotal
  discountAmount = Math.min(discountAmount, cartSubtotal);

  return {
    isValid: true,
    discountAmount,
    coupon
  };
}
