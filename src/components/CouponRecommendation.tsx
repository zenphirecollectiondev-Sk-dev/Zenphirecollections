import React, { useEffect, useState, useMemo } from 'react';
import { Tag, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export interface CouponItem {
  id?: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  min_order_value?: number | null;
  expiry?: string | null;
  is_active?: boolean;
}

export interface CouponRecommendationProps {
  subtotal: number;
  availableCoupons?: CouponItem[];
  appliedCoupon?: { code: string; discountType?: string; value?: number } | null;
  currentDiscount?: number;
  onApplyCoupon?: (code: string) => void | Promise<void>;
  compact?: boolean;
  className?: string;
}

/**
 * Calculates how much a coupon saves for a given order value
 */
function calculateSavings(coupon: CouponItem, orderAmount: number): number {
  if (!coupon || !coupon.value || coupon.value <= 0) return 0;
  let savings = 0;
  if (coupon.discount_type === 'percentage') {
    savings = (orderAmount * coupon.value) / 100;
  } else {
    savings = coupon.value;
  }
  return Math.min(savings, orderAmount);
}

export const CouponRecommendation: React.FC<CouponRecommendationProps> = ({
  subtotal,
  availableCoupons: propCoupons,
  appliedCoupon = null,
  currentDiscount = 0,
  onApplyCoupon,
  compact = false,
  className = '',
}) => {
  const [internalCoupons, setInternalCoupons] = useState<CouponItem[]>([]);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  // If coupons are not passed as props, fetch active unexpired coupons from Supabase silently
  useEffect(() => {
    if (propCoupons && propCoupons.length > 0) return;

    let isMounted = true;
    async function loadActiveCoupons() {
      try {
        const { data, error } = await supabase
          .from('coupons' as any)
          .select('id, code, discount_type, value, min_order_value, expiry, is_active')
          .eq('is_active', true);

        if (error || !isMounted || !data) return;

        const now = new Date();
        const valid = (data as unknown as CouponItem[]).filter(
          (c) => !c.expiry || new Date(c.expiry) > now
        );
        if (isMounted) {
          setInternalCoupons(valid);
        }
      } catch {
        // Fail silently without breaking checkout
      }
    }

    loadActiveCoupons();
    return () => {
      isMounted = false;
    };
  }, [propCoupons]);

  // Use props if provided, otherwise fallback to internal fetch
  const allCoupons = useMemo(() => {
    const list = propCoupons && propCoupons.length > 0 ? propCoupons : internalCoupons;
    const now = new Date();
    return list.filter((c) => {
      if (!c.code || c.value <= 0) return false;
      if (c.expiry && new Date(c.expiry) <= now) return false;
      return true;
    });
  }, [propCoupons, internalCoupons]);

  // Derive eligibility & recommendations live
  const recommendations = useMemo(() => {
    if (allCoupons.length === 0 || subtotal <= 0) {
      return null;
    }

    const appliedCodeUpper = appliedCoupon?.code?.toUpperCase() || null;

    // 1. Partition into eligible and unlockable
    const eligibleList: Array<{ coupon: CouponItem; saving: number }> = [];
    const unlockableList: Array<{
      coupon: CouponItem;
      minOrder: number;
      amountNeeded: number;
      savingAtThreshold: number;
      progressPct: number;
    }> = [];

    for (const coupon of allCoupons) {
      const minOrder = Number(coupon.min_order_value) || 0;
      if (subtotal >= minOrder) {
        eligibleList.push({
          coupon,
          saving: calculateSavings(coupon, subtotal),
        });
      } else {
        const amountNeeded = minOrder - subtotal;
        const savingAtThreshold = calculateSavings(coupon, minOrder);
        const progressPct = Math.min(100, Math.max(0, (subtotal / minOrder) * 100));
        unlockableList.push({
          coupon,
          minOrder,
          amountNeeded,
          savingAtThreshold,
          progressPct,
        });
      }
    }

    // Sort eligible coupons by savings descending
    eligibleList.sort((a, b) => b.saving - a.saving);

    // Sort unlockable coupons by amount needed ascending (nearest threshold first)
    unlockableList.sort((a, b) => a.amountNeeded - b.amountNeeded);

    const bestEligible = eligibleList[0] || null;
    const isBestAlreadyApplied =
      Boolean(bestEligible && appliedCodeUpper && bestEligible.coupon.code.toUpperCase() === appliedCodeUpper);

    // 2. Nearest unlockable coupon (for "Almost there" upsell)
    const nearestUnlockable = unlockableList[0] || null;

    // 3. If a coupon is already applied, look for unlockable coupons that yield higher savings at their threshold
    let betterUnlockable: {
      coupon: CouponItem;
      minOrder: number;
      amountNeeded: number;
      extraSaving: number;
      progressPct: number;
    } | null = null;

    if (appliedCoupon && currentDiscount > 0) {
      for (const item of unlockableList) {
        const extraSaving = item.savingAtThreshold - currentDiscount;
        if (extraSaving > 0) {
          betterUnlockable = {
            coupon: item.coupon,
            minOrder: item.minOrder,
            amountNeeded: item.amountNeeded,
            extraSaving,
            progressPct: item.progressPct,
          };
          break; // Since unlockableList is sorted by nearest amountNeeded
        }
      }
    }

    return {
      bestEligible,
      isBestAlreadyApplied,
      nearestUnlockable,
      betterUnlockable,
    };
  }, [allCoupons, subtotal, appliedCoupon, currentDiscount]);

  if (!recommendations) {
    return null;
  }

  const { bestEligible, isBestAlreadyApplied, nearestUnlockable, betterUnlockable } = recommendations;

  // If no recommendations can be made, render nothing silently
  if (!bestEligible && !nearestUnlockable && !betterUnlockable) {
    return null;
  }

  const handleApplyClick = async (code: string) => {
    if (!onApplyCoupon) return;
    try {
      setApplyingCode(code);
      await onApplyCoupon(code);
    } finally {
      setApplyingCode(null);
    }
  };

  // Compact Variant (e.g. For Cart Drawer or Cart Page)
  if (compact) {
    return (
      <div className={`space-y-2 text-xs ${className}`}>
        {/* Nudge if close to unlocking a coupon */}
        {nearestUnlockable && (!appliedCoupon || betterUnlockable) && (
          <div className="p-2.5 rounded-lg border border-[#B8975A]/30 bg-[#FAF8F5] text-text-primary">
            <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
              <span className="text-[#00221A] flex items-center gap-1">
                <Sparkles size={11} className="text-[#B8975A]" />
                {betterUnlockable ? (
                  <>Add ₹{betterUnlockable.amountNeeded.toFixed(0)} more to switch to <strong>{betterUnlockable.coupon.code}</strong> and save ₹{betterUnlockable.extraSaving.toFixed(0)} more</>
                ) : (
                  <>Add ₹{nearestUnlockable.amountNeeded.toFixed(0)} more to unlock <strong>{nearestUnlockable.coupon.code}</strong> (save ₹{nearestUnlockable.savingAtThreshold.toFixed(0)})</>
                )}
              </span>
            </div>
            <div
              className="w-full bg-[#00221A]/10 rounded-full h-1.5 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(betterUnlockable?.progressPct || nearestUnlockable.progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward coupon unlock threshold"
            >
              <motion.div
                className="bg-[#B8975A] h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${betterUnlockable?.progressPct || nearestUnlockable.progressPct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Best eligible offer if not applied */}
        {bestEligible && !isBestAlreadyApplied && onApplyCoupon && (
          <div className="p-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Best Offer Available
              </span>
              <p className="text-xs font-semibold text-emerald-950 truncate">
                Save ₹{bestEligible.saving.toFixed(0)} with {bestEligible.coupon.code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleApplyClick(bestEligible.coupon.code)}
              disabled={applyingCode === bestEligible.coupon.code}
              className="px-2.5 py-1 bg-[#00221A] text-white text-[11px] font-semibold uppercase tracking-wider rounded hover:bg-[#063A2C] transition-colors flex-shrink-0 cursor-pointer"
            >
              {applyingCode === bestEligible.coupon.code ? 'Applying...' : 'Apply'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full / Default Variant (For Checkout Page)
  return (
    <div className={`space-y-2.5 pt-1 ${className}`}>
      <AnimatePresence>
        {/* 1. BEST ELIGIBLE OFFER RECOMMENDATION (when not yet applied) */}
        {bestEligible && !isBestAlreadyApplied && (
          <motion.div
            key="best-eligible-card"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-3 sm:p-3.5 rounded-xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 to-emerald-50/40 text-emerald-950 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shadow-2xs"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Tag size={13} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    <Sparkles size={10} />
                    Best Offer
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-900">
                    {bestEligible.coupon.code}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-950 mt-1">
                  Save ₹{bestEligible.saving.toFixed(0)} with {bestEligible.coupon.code}
                </p>
                <p className="text-[11px] text-emerald-800/80">
                  {bestEligible.coupon.discount_type === 'percentage'
                    ? `${bestEligible.coupon.value}% instant discount on this order`
                    : `Flat ₹${bestEligible.coupon.value} instant off on this order`}
                </p>
              </div>
            </div>

            {onApplyCoupon && (
              <button
                type="button"
                onClick={() => handleApplyClick(bestEligible.coupon.code)}
                disabled={applyingCode === bestEligible.coupon.code}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#00221A] text-white hover:bg-[#063A2C] text-xs font-semibold uppercase tracking-wider transition-all duration-150 shadow-2xs flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-60"
              >
                {applyingCode === bestEligible.coupon.code ? (
                  <span>Applying...</span>
                ) : (
                  <>
                    <span>Apply</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}

        {/* 2. BETTER-COUPON SUGGESTION (when a coupon is already applied and a higher coupon is unlockable) */}
        {appliedCoupon && betterUnlockable && (
          <motion.div
            key="better-coupon-nudge"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-3 sm:p-3.5 rounded-xl border border-[#B8975A]/40 bg-[#FAF8F5] text-text-primary space-y-2 shadow-2xs"
          >
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-[#B8975A] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#B8975A] block">
                  Unlock Higher Savings
                </span>
                <p className="text-xs sm:text-[13px] text-text-primary font-medium leading-snug mt-0.5">
                  Add <strong>₹{betterUnlockable.amountNeeded.toFixed(0)}</strong> more to switch to{' '}
                  <span className="font-mono font-bold text-[#00221A]">{betterUnlockable.coupon.code}</span> and save{' '}
                  <strong className="text-emerald-700">₹{betterUnlockable.extraSaving.toFixed(0)} more</strong>.
                </p>
              </div>
            </div>

            {/* Accessible Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-text-secondary font-medium">
                <span>Cart: ₹{subtotal.toFixed(0)}</span>
                <span>Threshold: ₹{betterUnlockable.minOrder.toFixed(0)}</span>
              </div>
              <div
                className="w-full bg-[#00221A]/10 rounded-full h-1.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(betterUnlockable.progressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress toward unlocking coupon ${betterUnlockable.coupon.code}`}
              >
                <motion.div
                  className="bg-gradient-to-r from-[#B8975A] to-emerald-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${betterUnlockable.progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. "ALMOST THERE" UPSELL NUDGE (when no coupon applied, cart is below coupon threshold) */}
        {!appliedCoupon && nearestUnlockable && (
          <motion.div
            key="almost-there-nudge"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-3 sm:p-3.5 rounded-xl border border-dashed border-[#B8975A]/45 bg-[#FAF8F5]/70 text-text-primary space-y-2"
          >
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-[#B8975A] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#B8975A] block">
                  Almost There
                </span>
                <p className="text-xs sm:text-[13px] text-text-primary font-medium leading-snug mt-0.5">
                  Add <strong>₹{nearestUnlockable.amountNeeded.toFixed(0)}</strong> more to unlock{' '}
                  <span className="font-mono font-bold text-[#00221A]">{nearestUnlockable.coupon.code}</span> and save{' '}
                  <strong className="text-emerald-700">₹{nearestUnlockable.savingAtThreshold.toFixed(0)}</strong>.
                </p>
              </div>
            </div>

            {/* Accessible Progress Bar */}
            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between text-[10px] text-text-secondary font-medium">
                <span>₹{subtotal.toFixed(0)}</span>
                <span>₹{nearestUnlockable.minOrder.toFixed(0)}</span>
              </div>
              <div
                className="w-full bg-[#00221A]/10 rounded-full h-1.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(nearestUnlockable.progressPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress toward unlocking coupon ${nearestUnlockable.coupon.code}`}
              >
                <motion.div
                  className="bg-[#B8975A] h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${nearestUnlockable.progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CouponRecommendation;
