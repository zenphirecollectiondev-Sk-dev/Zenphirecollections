import React from 'react';
import { Clock, ShieldCheck, Truck } from 'lucide-react';

export type PaymentDispatchNoticeVariant = 'compact' | 'detailed' | 'account';

interface PaymentDispatchNoticeProps {
  variant?: PaymentDispatchNoticeVariant;
  className?: string;
}

/**
 * PaymentDispatchNotice
 * Displays Zenphire's payment settlement and dispatch policy notice:
 * "Payments take up to 2 business days to reflect in our account.
 * Your order will be dispatched once the payment is received.
 * We'll notify you as soon as it ships."
 */
export const PaymentDispatchNotice: React.FC<PaymentDispatchNoticeProps> = ({
  variant = 'compact',
  className = '',
}) => {
  if (variant === 'compact') {
    return (
      <aside
        aria-label="Payment settlement and dispatch notice"
        className={`p-3 sm:p-3.5 rounded-xl border border-[#B8975A]/25 bg-[#FAF8F5] text-text-primary text-xs leading-relaxed ${className}`}
      >
        <div className="flex items-start gap-2.5">
          <Clock
            size={15}
            className="text-[#B8975A] flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#00221A] block">
              Payment Settlement &amp; Dispatch
            </span>
            <p className="text-[11px] sm:text-xs text-text-secondary leading-normal">
              Payments take up to <strong>2 business days</strong> to reflect in our account.
              Your order will be dispatched once the payment is received. We&apos;ll notify you as soon as it ships.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  if (variant === 'account') {
    return (
      <aside
        aria-label="Order settlement and dispatch status"
        className={`p-3 sm:p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 text-amber-950 text-xs leading-relaxed ${className}`}
      >
        <div className="flex items-start gap-2.5">
          <Clock
            size={14}
            className="text-amber-700 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-amber-900 leading-normal">
              <strong className="font-semibold">Dispatch Policy:</strong> Online payments take up to 2 business days to settle in our account. Your order is queued and will be dispatched once payment is received. We will send full tracking details the moment it ships.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // Detailed variant (used on Order Success page and Shipping & Payment Policy page)
  return (
    <section
      aria-label="Payment Settlement & Dispatch Policy"
      className={`p-5 sm:p-6 rounded-2xl border border-[#B8975A]/30 bg-gradient-to-br from-[#FAF8F5] to-[#F4EFE6]/60 text-left relative overflow-hidden shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#B8975A]/20">
        <div className="w-7 h-7 rounded-full bg-[#00221A] text-[#B8975A] flex items-center justify-center flex-shrink-0">
          <Clock size={14} aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-heading font-semibold uppercase tracking-wider text-[#00221A]">
            Payment Settlement &amp; Dispatch Policy
          </h4>
          <span className="text-[10px] uppercase tracking-widest text-[#B8975A] font-bold block">
            Transparent Fulfillment Timelines
          </span>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
        Payments take up to <strong>2 business days</strong> to reflect in our account. Your order will be dispatched once the payment is received. We&apos;ll notify you as soon as it ships.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-3 bg-white/80 rounded-xl border border-[#B8975A]/15 space-y-1">
          <div className="flex items-center gap-1.5 text-[#00221A] font-semibold text-[11px] uppercase tracking-wider">
            <ShieldCheck size={13} className="text-[#B8975A]" />
            <span>1. Verification</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Razorpay processes your payment instantly. Bank settlement completes within 2 business days.
          </p>
        </div>

        <div className="p-3 bg-white/80 rounded-xl border border-[#B8975A]/15 space-y-1">
          <div className="flex items-center gap-1.5 text-[#00221A] font-semibold text-[11px] uppercase tracking-wider">
            <Clock size={13} className="text-[#B8975A]" />
            <span>2. Account Receipt</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Once funds reflect in our account, your minimal pieces are prepared and dispatched immediately.
          </p>
        </div>

        <div className="p-3 bg-white/80 rounded-xl border border-[#B8975A]/15 space-y-1">
          <div className="flex items-center gap-1.5 text-[#00221A] font-semibold text-[11px] uppercase tracking-wider">
            <Truck size={13} className="text-[#B8975A]" />
            <span>3. Live Tracking</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            You will receive SMS and tracking updates the instant your package leaves our facility.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PaymentDispatchNotice;
