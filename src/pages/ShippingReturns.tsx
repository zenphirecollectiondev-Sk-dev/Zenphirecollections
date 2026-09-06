import { Link } from "react-router-dom";
import { ChevronRight, Truck, RefreshCw, Shield, Clock } from "lucide-react";

export default function ShippingReturns() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary mb-8">
        <Link to="/" className="hover:text-text-primary transition-colors">Home</Link>
        <ChevronRight size={10} />
        <span className="text-text-primary font-bold">Shipping & Returns</span>
      </div>
      <div className="border-b border-border pb-8 mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Policies</span>
        <h1 className="text-3xl font-heading font-black uppercase mt-1 mb-3">Shipping & Returns</h1>
        <p className="text-sm text-text-secondary">Transparent policies, no surprises.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          { icon: Truck, title: "Free Shipping", desc: "On all orders above ?1,000. Orders below ?1,000 are charged a flat ?150." },
          { icon: Clock, title: "Delivery Time", desc: "Standard: 5–7 business days. Express (select pin codes): 2–3 business days." },
          { icon: RefreshCw, title: "7-Day Returns", desc: "Hassle-free returns within 7 days of delivery for unworn items with tags intact." },
          { icon: Shield, title: "Secure Packaging", desc: "Every order is carefully packed to ensure your garment arrives in perfect condition." },
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
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Shipping Policy</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>Orders are processed within 1–2 business days of payment confirmation. You will receive an email with your tracking number once your order is dispatched.</p>
            <p>We ship pan-India via trusted courier partners. Delivery timelines may vary during sale periods or public holidays.</p>
            <p>COD (Cash on Delivery) is currently not available. We accept all digital payment methods.</p>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Return Policy</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>Items must be returned within 7 days of the delivery date. All items must be unworn, unwashed, and returned in their original packaging with tags attached.</p>
            <p>To initiate a return, go to your Account page, select the order, and click "Request Return". Our team will schedule a free pickup within 2 business days.</p>
            <p>Sale items and customised orders are final sale and not eligible for return or exchange.</p>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Refund Timeline</h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>Once we receive and inspect your return, we will process the refund within 5–7 business days to your original payment method.</p>
            <p>UPI and wallet refunds may reflect immediately upon processing. Bank transfers can take an additional 3–5 business days depending on your bank.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
