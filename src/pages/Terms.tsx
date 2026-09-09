import { Link } from "react-router-dom";
import { ChevronRight, Scale, CheckCircle2, AlertCircle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen ambient-green-gradient py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-white/50 mb-8">
          <Link to="/" className="hover:text-accent-gold transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-accent-gold">Terms of Service</span>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-heading font-normal uppercase tracking-[0.2em] text-accent-gold mb-3">
            Terms of Service
          </h1>
          <p className="text-white/70 max-w-lg mx-auto text-sm">
            Please read these terms carefully before placing an order with Zenphire Collections.
          </p>
        </div>

        {/* Policy Content */}
        <div className="glass-card p-6 md:p-8 rounded-xl border border-accent-gold/20 space-y-8 text-white/80 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale size={18} /> 1. Overview & Agreement
            </h2>
            <p>
              By visiting our website and purchasing products from Zenphire Collections, you agree to be bound by these Terms of Service. These terms apply to all users of the site, including browsers, customers, and merchants.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} /> 2. Product Availability & Pricing
            </h2>
            <p className="mb-2">
              All product prices are listed in INR (?) and include applicable taxes. We reserve the right to alter pricing, modify product descriptions, or discontinue items at any time without notice.
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/70 pl-2">
              <li>In the rare event of a pricing error or inventory discrepancy, we reserve the right to cancel affected orders with a full refund.</li>
              <li>Product colors shown online may vary slightly depending on display monitor settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} /> 3. Orders & Payment
            </h2>
            <p>
              When placing an order, you warrant that all information provided is true and accurate. Orders are subject to acceptance and stock availability. We accept Cash on Delivery (COD), major Credit/Debit Cards, UPI, and Net Banking. Order confirmation does not guarantee immediate stock allocation until payment validation or COD verification is complete.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} /> 4. Intellectural Property
            </h2>
            <p>
              All content on this site�including logos, product designs, imagery, text, code, and graphical layouts�is the exclusive intellectual property of Zenphire Collections. Unauthorized reproduction or commercial use without written permission is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle size={18} /> 5. Limitation of Liability
            </h2>
            <p>
              Zenphire Collections shall not be liable for indirect, incidental, or consequential damages resulting from the use of our services or delay in shipment caused by unforeseen third-party logistics events (force majeure).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale size={18} /> 6. Governing Law & Contact
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of India. For any disputes or questions regarding these Terms, please reach out to <a href="mailto:legal@zenphire.com" className="text-accent-gold hover:underline">legal@zenphire.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
