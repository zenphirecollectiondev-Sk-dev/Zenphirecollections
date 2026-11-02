import { Link } from "react-router-dom";
import { ChevronRight, Mail, Phone, Clock, MapPin, MessageSquare } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE, INSTAGRAM_URL, INSTAGRAM_HANDLE, ADDRESS_LINES } from "../config/siteInfo";
import InstagramIcon from "../components/ui/InstagramIcon";

export default function ContactUs() {
  return (
    <div className="min-h-screen ambient-green-gradient py-12 px-4 sm:px-6 lg:px-8 text-white anim-fade-up">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-white/50 mb-8">
          <Link to="/" className="hover:text-accent-gold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">Home</Link>
          <ChevronRight size={12} />
          <span className="text-accent-gold">Contact Us</span>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent-gold font-bold block mb-2">Customer Support</span>
          <h1 className="text-3xl md:text-4xl font-heading font-normal uppercase tracking-[0.2em] text-accent-gold mb-3">
            Contact Us
          </h1>
          <p className="text-white/70 max-w-lg mx-auto text-sm leading-relaxed">
            Have questions regarding sizing, custom tailoring, orders, or styling guidance? Our customer support team is at your disposal.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="glass-card p-6 rounded-xl border border-accent-gold/20 flex flex-col items-center text-center">
            <Mail size={26} className="text-accent-gold mb-3 stroke-[1.5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent-gold mb-1">Email Support</h3>
            <p className="text-xs text-white/60 mb-3">Direct response within 24 business hours.</p>
            {SUPPORT_EMAIL ? (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs font-medium text-white hover:text-accent-gold transition-colors break-all">
                {SUPPORT_EMAIL}
              </a>
            ) : (
              <span className="inline-block px-2.5 py-1 rounded bg-accent-gold/20 text-accent-gold text-[11px] font-mono border border-accent-gold/40">
                [Support Email to be added]
              </span>
            )}
          </div>

          <div className="glass-card p-6 rounded-xl border border-accent-gold/20 flex flex-col items-center text-center">
            <InstagramIcon size={26} className="text-accent-gold mb-3 stroke-[1.5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent-gold mb-1">Instagram</h3>
            <p className="text-xs text-white/60 mb-3">Official collection updates &amp; styling.</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Zenphire on Instagram"
              className="text-xs font-medium text-white hover:text-accent-gold transition-colors"
            >
              {INSTAGRAM_HANDLE}
            </a>
          </div>

          <div className="glass-card p-6 rounded-xl border border-accent-gold/20 flex flex-col items-center text-center">
            <Phone size={26} className="text-accent-gold mb-3 stroke-[1.5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent-gold mb-1">Direct Line</h3>
            <p className="text-xs text-white/60 mb-3">Mon – Sat, 10:00 AM – 7:00 PM IST</p>
            <a href={`tel:+91${SUPPORT_PHONE}`} className="text-xs font-medium text-white hover:text-accent-gold transition-colors">
              +91 {SUPPORT_PHONE}
            </a>
          </div>

          <div className="glass-card p-6 rounded-xl border border-accent-gold/20 flex flex-col items-center text-center">
            <Clock size={26} className="text-accent-gold mb-3 stroke-[1.5]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent-gold mb-1">Operating Hours</h3>
            <p className="text-xs text-white/60 mb-1">Monday through Saturday</p>
            <span className="text-xs font-medium text-white">10:00 AM – 7:00 PM IST</span>
          </div>
        </div>

        {/* Operational Address & Details Box */}
        <div className="glass-card p-6 md:p-8 rounded-xl border border-accent-gold/20 space-y-6 text-white/80 leading-relaxed text-sm">
          <div className="flex items-start gap-4">
            <MapPin size={22} className="text-accent-gold flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-sm font-heading text-accent-gold uppercase tracking-wider mb-2">
                Registered &amp; Operational Office
              </h2>
              <address className="text-xs text-white/70 leading-relaxed not-italic space-y-0.5">
                {ADDRESS_LINES.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </address>
            </div>
          </div>

          <div className="border-t border-accent-gold/15 pt-6 flex items-start gap-4">
            <MessageSquare size={22} className="text-accent-gold flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-sm font-heading text-accent-gold uppercase tracking-wider mb-1">
                Order Inquiries &amp; Policy Notice
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Free shipping on all products across India. We follow a strict <strong>No Returns, No Exchanges</strong> policy. All sales are final. For questions regarding tracking or sizing, please mention your <strong>Order Reference ID</strong> (e.g. <code>#ZEN-ORD-...</code>) in all communications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
