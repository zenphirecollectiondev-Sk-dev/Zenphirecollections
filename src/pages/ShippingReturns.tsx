import { Link } from "react-router-dom";
import { ChevronRight, Truck, Shield, Clock, XCircle } from "lucide-react";
import PaymentDispatchNotice from "../components/PaymentDispatchNotice";
import { SUPPORT_EMAIL } from "../config/siteInfo";

export default function ShippingReturns() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh] anim-fade-up">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary mb-8">
        <Link to="/" className="hover:text-text-primary transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">Home</Link>
        <ChevronRight size={10} />
        <span className="text-text-primary font-bold">Shipping &amp; Policies</span>
      </div>
      <div className="border-b border-border pb-8 mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Policies</span>
        <h1 className="text-3xl font-heading font-black uppercase mt-1 mb-3">Shipping &amp; Payment Policy</h1>
        <p className="text-sm text-text-secondary">Complimentary free shipping on all products • No Returns, No Exchanges. All sales are final.</p>
      </div>

      {/* Prominent Payment Settlement & Dispatch Policy Banner */}
      <div className="mb-10">
        <PaymentDispatchNotice variant="detailed" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          { icon: Truck, title: "Free Shipping", desc: "Complimentary standard shipping on all products across India. No minimum order required." },
          { icon: Clock, title: "Delivery Time", desc: "Standard: 5–7 business days across India following account payment settlement." },
          { icon: XCircle, title: "No Returns, No Exchanges", desc: "All sales are final. Please review sizing guides and garment measurements before ordering." },
          { icon: Shield, title: "Secure Packaging", desc: "Every order is inspected and packed with care to ensure your pieces arrive in pristine condition." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-6 border border-border bg-bg-subtle flex gap-4">
            <Icon size={20} className="flex-shrink-0 text-accent mt-0.5 stroke-[1.5]" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-1">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Payment Settlement &amp; Dispatch Policy</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p><strong>Settlement Timeline:</strong> When you complete payment via Razorpay, funds take up to <strong>2 business days</strong> to reflect in our bank account.</p>
            <p><strong>Dispatch Protocol:</strong> To ensure high fulfillment integrity, your order is prepared, carefully inspected, and dispatched immediately upon receipt of payment in our account.</p>
            <p><strong>Real-time Tracking:</strong> Once your package is handed over to our courier partner, you will receive an automated tracking notification with your Air Waybill (AWB) number and direct carrier tracking link.</p>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Shipping Policy</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p><strong>Free Shipping:</strong> We provide complimentary free standard shipping on all products with no minimum order value.</p>
            <p>Orders are dispatched within 1–2 business days of payment confirmation. You will receive an email and SMS with your tracking number once your order is dispatched.</p>
            <p>We ship pan-India via trusted courier partners. Delivery timelines may vary during sale periods or public holidays.</p>
            <p>COD (Cash on Delivery) is currently not available. We accept all digital payment methods.</p>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">No Returns, No Exchanges Policy</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p><strong>All sales are final.</strong> Zenphire operates under a strict <strong>No Returns, No Exchanges</strong> policy.</p>
            <p>Due to the exclusive and made-to-order nature of our collection, we do not accept returns, exchanges, or refund requests once an order is placed and processed.</p>
            <p>Please consult the comprehensive size guide and product specifications on each product page prior to purchasing. If you have questions regarding sizing or fit, our support team is always available via our Contact page or at {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent underline">{SUPPORT_EMAIL}</a> : <span className="px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent font-mono text-xs border border-accent/30">[Support Email]</span>}.</p>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Damaged or Defective Items</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>In the highly unlikely event that your garment arrives damaged during transit or contains a verified manufacturing defect, please reach out within 24 hours of delivery.</p>
            <p>Please share your Order Reference ID along with unboxing photographs or video documentation to our support team at {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent underline">{SUPPORT_EMAIL}</a> : <span className="px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent font-mono text-xs border border-accent/30">[Support Email]</span>} for prompt verification.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
