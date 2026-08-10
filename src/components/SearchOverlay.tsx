import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ArrowRight, Sparkles } from 'lucide-react';
import { getActiveProducts } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import linenShirt from '../assets/product_linen_shirt.png';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_TERMS = ['Linen Shirt', 'Cargo', 'Dresses', 'Hoodies', 'Ethnic'];

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Load live active products once
  useEffect(() => {
    async function loadSearchProducts() {
      try {
        const data = await getActiveProducts();
        setDbProducts(data || []);
      } catch (err) {
        console.warn('Could not load products for search overlay:', err);
      }
    }
    loadSearchProducts();
  }, []);

  const products = useMemo(() => dbProducts, [dbProducts]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Reset query on close
  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          (product.description || '').toLowerCase().includes(lowerQuery)
      );
      setResults(filtered);
    }, 140);
    return () => clearTimeout(timer);
  }, [query, products]);

  if (!isOpen) return null;

  const handleResultClick = (slug: string) => {
    navigate(`/product/${slug}`);
    onClose();
    setQuery('');
  };

  const handleSuggestion = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="search-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[200] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, rgba(0,34,26,0.97) 0%, rgba(6,58,44,0.96) 50%, rgba(0,21,16,0.98) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* ── Search Bar ── */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-5"
          style={{ borderBottom: '1px solid rgba(184,151,90,0.2)' }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Branding label */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#B8975A]/50 font-sans">
                Search
              </span>
              <button
                onClick={onClose}
                aria-label="Close search"
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#B8975A]/60 hover:text-[#B8975A] hover:bg-white/8 transition-all duration-200"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Input row */}
            <div
              className="flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300"
              style={{
                background: isFocused
                  ? 'rgba(184,151,90,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: isFocused
                  ? '1px solid rgba(184,151,90,0.45)'
                  : '1px solid rgba(255,255,255,0.09)',
                boxShadow: isFocused ? '0 0 30px rgba(184,151,90,0.08)' : 'none',
              }}
            >
              <Search
                size={20}
                strokeWidth={1.5}
                className="flex-shrink-0 transition-colors duration-200"
                style={{ color: isFocused ? '#B8975A' : 'rgba(184,151,90,0.5)' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                placeholder="Search collections, categories..."
                className="w-full bg-transparent text-base font-medium focus:outline-none placeholder-white/20"
                style={{ color: '#E8EDE9', caretColor: '#B8975A' }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Suggestion chips */}
            {!query && (
              <div className="flex flex-wrap gap-2 mt-4">
                {SUGGESTED_TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSuggestion(term)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'rgba(184,151,90,0.08)',
                      border: '1px solid rgba(184,151,90,0.2)',
                      color: 'rgba(184,151,90,0.7)',
                    }}
                  >
                    <Sparkles size={9} />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Results Area ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {!query ? (
                /* Empty prompt */
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'rgba(184,151,90,0.08)', border: '1px solid rgba(184,151,90,0.15)' }}
                  >
                    <Search size={24} strokeWidth={1} style={{ color: 'rgba(184,151,90,0.5)' }} />
                  </div>
                  <p className="text-[11px] tracking-[0.25em] uppercase text-white/25 font-sans">
                    Start typing to explore
                  </p>
                </motion.div>
              ) : results.length === 0 ? (
                /* No results */
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <p className="text-[13px] text-white/40 mb-2">
                    No results for <span className="text-[#B8975A]">"{query}"</span>
                  </p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 font-sans">
                    Try linen, pants, or jacket
                  </p>
                </motion.div>
              ) : (
                /* Results list */
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-[#B8975A]/50 font-sans mb-4">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-col gap-1">
                    {results.map((product, i) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handleResultClick(product.slug)}
                        className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(184,151,90,0.07)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,151,90,0.18)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        }}
                      >
                        {/* Product image */}
                        <div
                          className="flex-shrink-0 w-12 h-16 overflow-hidden rounded-md"
                          style={{ border: '1px solid rgba(184,151,90,0.15)' }}
                        >
                          <img
                            src={product.product_images?.[0]?.url || linenShirt}
                            alt={product.name}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate" style={{ color: '#E8EDE9' }}>
                            {product.name}
                          </h4>
                          <p className="text-[11px] mt-0.5" style={{ color: '#B8975A' }}>
                            ₹{Number(product.base_price || 0).toLocaleString('en-IN')}
                          </p>
                          {product.category && (
                            <span
                              className="inline-block mt-1.5 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(184,151,90,0.1)', color: 'rgba(184,151,90,0.6)' }}
                            >
                              {product.category}
                            </span>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight
                          size={14}
                          strokeWidth={1.5}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
                          style={{ color: '#B8975A' }}
                        />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom hint ── */}
        <div
          className="flex-shrink-0 flex items-center justify-center gap-6 px-6 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-[9px] tracking-[0.2em] uppercase text-white/18 font-sans flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded text-white/25" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '9px' }}>Esc</kbd>
            to close
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
