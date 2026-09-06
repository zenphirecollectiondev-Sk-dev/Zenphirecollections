import { Link } from "react-router-dom";
import { ChevronRight, Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen ambient-green-gradient py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-white/50 mb-8">
          <Link to="/" className="hover:text-accent-gold transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-accent-gold">Privacy Policy</span>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-heading font-normal uppercase tracking-[0.2em] text-accent-gold mb-3">
            Privacy Policy
          </h1>
          <p className="text-white/70 max-w-lg mx-auto text-sm">
            Your privacy is paramount. Learn how Zenphire Collections protects and handles your personal information.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="glass-card p-5 rounded-lg border border-accent-gold/20 flex flex-col items-center text-center">
            <Shield size={28} className="text-accent-gold mb-2" />
            <h3 className="text-sm font-semibold text-accent-gold uppercase tracking-wider mb-1">Data Encryption</h3>
            <p className="text-xs text-white/60">All customer data is encrypted in transit and at rest using SSL/TLS protocol.</p>
          </div>
          <div className="glass-card p-5 rounded-lg border border-accent-gold/20 flex flex-col items-center text-center">
            <Lock size={28} className="text-accent-gold mb-2" />
            <h3 className="text-sm font-semibold text-accent-gold uppercase tracking-wider mb-1">No Third-Party Sale</h3>
            <p className="text-xs text-white/60">We never sell, rent, or trade your personal details with third-party advertisers.</p>
          </div>
          <div className="glass-card p-5 rounded-lg border border-accent-gold/20 flex flex-col items-center text-center">
            <Eye size={28} className="text-accent-gold mb-2" />
            <h3 className="text-sm font-semibold text-accent-gold uppercase tracking-wider mb-1">Full Transparency</h3>
            <p className="text-xs text-white/60">You have complete control over your account data, orders, and preferences.</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="glass-card p-6 md:p-8 rounded-xl border border-accent-gold/20 space-y-8 text-white/80 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} /> 1. Information We Collect
            </h2>
            <p className="mb-2">We collect information you provide directly to us when placing an order, creating an account, or reaching out to support. This includes:</p>
            <ul className="list-disc list-inside space-y-1 text-white/70 pl-2">
              <li>Full name, email address, phone number, and delivery addresses.</li>
              <li>Order details, purchase history, and saved wishlist items.</li>
              <li>Payment verification details (processed securely through encrypted payment gateways).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} /> 2. How We Use Your Information
            </h2>
            <p className="mb-2">Your information is used strictly to fulfill your luxury shopping experience:</p>
            <ul className="list-disc list-inside space-y-1 text-white/70 pl-2">
              <li>Processing and dispatching your orders.</li>
              <li>Sending order status updates and shipping tracking notifications.</li>
              <li>Improving website performance, catalog user experience, and personalizing recommendations.</li>
              <li>Preventing fraudulent transactions and ensuring security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} /> 3. Data Protection & Security
            </h2>
            <p>
              We implement industry-standard security measures, including 256-bit SSL encryption, database row-level security (RLS), and secure payment tokenization. Access to sensitive customer data is strictly restricted to authorized staff handling fulfillment and support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} /> 4. Cookies & Analytics
            </h2>
            <p>
              We use cookies to maintain your login session, remember items in your shopping cart, and optimize website response times. You can disable non-essential cookies via your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-heading text-accent-gold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} /> 5. Your Rights & Contact
            </h2>
            <p>
              You have the right to request access to your personal data, request corrections, or request deletion of your account. For any privacy-related inquiries, please contact our support team at <a href="mailto:privacy@zenphire.com" className="text-accent-gold hover:underline">privacy@zenphire.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
