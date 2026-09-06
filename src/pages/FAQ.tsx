import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 5–7 business days across India. Express delivery (2–3 business days) is available for select pin codes.' },
      { q: 'Do you offer free shipping?', a: 'Yes! Orders above ?1,000 qualify for free standard shipping. Orders below ?1,000 carry a flat ?150 shipping fee.' },
      { q: 'Can I track my order?', a: 'Once your order is dispatched, you will receive a tracking ID in your Account dashboard under "My Orders".' },
      { q: 'Do you ship internationally?', a: 'Currently, Zenphire ships within India only. International shipping is planned for a future update.' },
    ],
  },
  {
    category: 'Returns & Exchanges',
    items: [
      { q: 'What is your return policy?', a: 'We accept returns within 7 days of delivery for unworn, unwashed items with original tags attached. Items on sale are not eligible for return.' },
      { q: 'How do I initiate a return?', a: 'Contact us via the Account page with your order ID. Our team will arrange a pickup within 2 business days.' },
      { q: 'When will I receive my refund?', a: 'Refunds are processed to the original payment method within 5–7 business days after we receive and inspect the item.' },
      { q: 'Can I exchange for a different size?', a: 'Yes, size exchanges are available subject to stock. Raise an exchange request from your Account page.' },
    ],
  },
  {
    category: 'Products & Sizing',
    items: [
      { q: 'How do I find my size?', a: 'Each product page has a Size Guide button with measurements in inches. Measure over a light base layer for best accuracy.' },
      { q: 'Are product colors accurate?', a: 'We represent colors as accurately as possible. Minor variations may occur due to screen calibration.' },
      { q: 'How do I care for my garments?', a: 'Care instructions are on each garment tag. Generally, gentle machine wash in cold water and air drying is recommended.' },
    ],
  },
  {
    category: 'Payments & Security',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major UPI apps, net banking, credit/debit cards, and wallet payments via our secure payment gateway.' },
      { q: 'Is my payment information safe?', a: 'Yes. All payments are processed through encrypted, PCI-compliant gateways. We never store card details on our servers.' },
      { q: 'Can I use a coupon code?', a: 'Yes! Enter your coupon code at the Review & Pay step during checkout. Valid codes are applied instantly.' },
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
        <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">{q}</span>
        <ChevronDown size={15} className={`flex-shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-4">
          <p className="text-sm text-text-secondary leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[70vh]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary mb-8">
        <Link to="/" className="hover:text-text-primary transition-colors">Home</Link>
        <ChevronRight size={10} />
        <span className="text-text-primary font-bold">Help & FAQ</span>
      </div>
      <div className="border-b border-border pb-8 mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">Support</span>
        <h1 className="text-3xl font-heading font-black uppercase mt-1 mb-3">Help & FAQ</h1>
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
      <div className="mt-14 p-8 bg-bg-subtle border border-border text-center">
        <h3 className="text-sm font-heading font-bold uppercase tracking-wider mb-2">Still have questions?</h3>
        <p className="text-sm text-text-secondary mb-4">Reach out via your Account page and we will respond within 24 hours.</p>
        <Link to="/account" className="btn btn-primary px-6 py-3 text-xs font-bold uppercase tracking-widest inline-block">Contact Support</Link>
      </div>
    </div>
  );
}
