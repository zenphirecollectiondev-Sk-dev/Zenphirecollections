import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Mail, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE } from '../lib/motion';
import { SUPPORT_EMAIL, SUPPORT_PHONE, ADDRESS_LINES } from '../config/siteInfo';

const faqs = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 5–7 business days across India following account payment settlement.' },
      { q: 'Do you offer free shipping?', a: 'Yes! We provide complimentary free standard shipping on all products across India with no minimum spend.' },
      { q: 'Can I track my order?', a: 'Once your order is dispatched, you will receive a tracking ID in your Account dashboard under "My Orders" as well as via SMS.' },
      { q: 'Do you ship internationally?', a: 'Currently, Zenphire ships within India only. International shipping is planned for a future update.' },
    ],
  },
  {
    category: 'No Returns & No Exchanges Policy',
    items: [
      { q: 'What is your return policy?', a: 'We have a strict "No Returns, No Exchanges" policy. All sales are final. Please review our sizing charts and product details carefully before placing your order.' },
      { q: 'Can I exchange for a different size or request a refund?', a: 'No. All sales are final. We do not provide exchanges, returns, or refunds once an order is confirmed.' },
      { q: 'What happens if my item arrives damaged or defective?', a: 'In the rare event of transit damage or a verified manufacturing defect, please reach out to our support team within 24 hours of delivery with photo/video documentation.' },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      { q: 'How do I find my size?', a: 'Each product page has a dedicated Size Guide with detailed measurements in inches. Measure over a light base layer for best accuracy.' },
      { q: 'Are product colors accurate?', a: 'We represent colors as accurately as possible. Minor variations may occur due to screen calibration.' },
      { q: 'How do I care for my garments?', a: 'Care instructions are on each garment tag. Generally, gentle machine wash in cold water and air drying is recommended.' },
    ],
  },
  {
    category: 'Payments & Security',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major UPI apps, net banking, credit/debit cards, and wallet payments via our secure payment gateway.' },
      { q: 'Is my payment information safe?', a: 'Yes. All payments are processed through encrypted, PCI-compliant gateways. We never store card details on our servers.' },
      { q: 'Can I use a coupon code?', a: 'Yes! Enter your coupon code at checkout or apply recommended offers directly with one click.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-4 text-left gap-4 group"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-text-primary group-hover:text-accent transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: DUR.base, ease: EASE }}>
          <ChevronDown size={14} className="text-text-secondary flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-secondary pb-4 leading-relaxed font-light">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh] anim-fade-up">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary mb-8">
        <Link to="/" className="hover:text-text-primary transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">Home</Link>
        <ChevronRight size={10} />
        <span className="text-text-primary font-bold">Help &amp; FAQ</span>
      </div>
      <div className="border-b border-border pb-8 mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Support</span>
        <h1 className="text-3xl font-heading font-black uppercase mt-1 mb-3">Help &amp; FAQ</h1>
        <p className="text-sm text-text-secondary max-w-xl">Find answers to the most common questions about your orders, products, and policies.</p>
      </div>
      <div className="space-y-10">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-accent mb-4 pb-2 border-b border-border">{section.category}</h2>
            <div>{section.items.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)}</div>
          </div>
        ))}
      </div>
      <div className="mt-14 p-8 bg-bg-subtle border border-border text-center space-y-4">
        <h3 className="text-sm font-heading font-bold uppercase tracking-wider">Still have questions?</h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Reach out to our team. We are glad to help.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-text-primary">
          <div className="flex items-center gap-1.5">
            <Mail size={14} className="text-accent" />
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium hover:underline">{SUPPORT_EMAIL}</a>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Phone size={14} className="text-accent" />
            <a href={`tel:+91${SUPPORT_PHONE}`} className="hover:underline hover:text-text-primary">+91 {SUPPORT_PHONE}</a>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <MapPin size={14} className="text-accent" />
            <span>{ADDRESS_LINES[ADDRESS_LINES.length - 1]}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link to="/contact" className="btn btn-primary px-6 py-3 text-xs font-bold uppercase tracking-widest inline-block">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
