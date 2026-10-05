import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ArrowRight, Sparkles, Image, CornerDownLeft } from 'lucide-react';
import { getActiveProducts, getCategories } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE, EASE_ENTER } from '../lib/motion';
import { dataCache } from '../lib/dataCache';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_TERMS = ['Linen Shirt', 'Cargo', 'Dresses', 'Hoodies', 'Ethnic'];

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Load products for search — use cache first for instant results
  useEffect(() => {
    const cached = dataCache.get<any[]>('products');
    if (cached && cached.length > 0) {
      setDbProducts(cached);
      if (!dataCache.isStale('products')) return;
    }
    async function loadSearchProducts() {
      try {
        const data = await getActiveProducts();
        dataCache.set('products', data || []);
        setDbProducts(data || []);
      } catch (err) {
        console.warn('Could not load products for search overlay:', err);
      }
    }
    loadSearchProducts();
  }, []);

  // Load category map from cache (or fetch) for badge display
  useEffect(() => {
    const buildMap = (cats: any[]) => {
      const map: Record<string, string> = {};
      cats.forEach((c) => {
        map[c.id] = c.name;
      });
      setCategoryMap(map);
    };
    const cached = dataCache.get<any[]>('categories');
    if (cached && cached.length > 0) {
      buildMap(cached);
      return;
    }
    getCategories()
      .then((cats) => {
        dataCache.set('categories', cats || []);
        buildMap(cats || []);
      })
      .catch(() => {});
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
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          (product.description || '').toLowerCase().includes(lowerQuery)
      );
      setResults(filtered);
      setIsSearching(false);
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
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Catalog"
        className="fixed inset-0 z-[200] flex flex-col justify-start sm:items-center overflow-y-auto"
      >
        {/* Soft, airy frosted backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.fast, ease: EASE }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* White-forward minimal search container */}
        <motion.div
          key="search-panel"
          initial={{ opacity: 0, y: -14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: DUR.base, ease: EASE_ENTER }}
          className="relative z-10 w-full sm:max-w-2xl lg:max-w-3xl sm:my-10 bg-white sm:rounded-2xl border border-neutral-200/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:max-h-[82vh]"
        >
          {/* ── Top Bar: Search Input Header ── */}
          <div className="flex-shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-neutral-100 bg-white">
            {/* Header label & close affordance */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.25em] uppercase font-sans font-semibold text-neutral-400">
                Search Catalog
              </span>
              <button
                onClick={onClose}
                aria-label="Close search"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors duration-150"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            {/* Input Row — clean white surface with restrained gold focus ring */}
            <div
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white ${
                isFocused
                  ? 'border-[#B8975A] ring-2 ring-[#B8975A]/20 shadow-[0_2px_12px_rgba(184,151,90,0.08)]'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <Search
                size={18}
                strokeWidth={1.75}
                className={`flex-shrink-0 transition-colors duration-150 ${
                  isFocused ? 'text-[#B8975A]' : 'text-neutral-400'
                }`}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose();
                  if (e.key === 'Enter' && results.length > 0) {
                    handleResultClick(results[0].slug);
                  }
                }}
                placeholder="Search collections, linen, jackets, cargo..."
                className="w-full bg-transparent text-sm sm:text-base font-normal text-neutral-900 focus:outline-none placeholder:text-neutral-400 placeholder:font-light"
                style={{ caretColor: '#B8975A' }}
              />

              {/* Clear button */}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors duration-150"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Suggestion Chips — light, subtle pill tags */}
            {!query && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-1">
                <span className="text-[11px] text-neutral-400 mr-1 select-none font-sans">
                  Suggested:
                </span>
                {SUGGESTED_TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSuggestion(term)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 hover:text-[#00221A] border border-neutral-200/80 hover:border-[#B8975A]/40 transition-all duration-150"
                  >
                    <Sparkles size={10} className="text-[#B8975A]/70" />
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Results / Content Area ── */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 bg-white">
            <AnimatePresence mode="wait">
              {/* State 1: Prompt before typing */}
              {!query ? (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-neutral-50 border border-neutral-150 text-neutral-400">
                    <Search size={20} strokeWidth={1.5} className="text-neutral-400" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-500 font-sans">
                    Search Zenphire Collections
                  </p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                    Type a keyword, product name, fabric, or occasion to discover styles.
                  </p>
                </motion.div>
              ) : isSearching ? (
                /* State 2: In-flight searching feedback */
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 py-2"
                >
                  <div className="h-3 w-20 bg-neutral-100 animate-pulse rounded" />
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3.5 p-3 rounded-xl border border-neutral-100 bg-neutral-50/50 animate-pulse"
                    >
                      <div className="w-12 h-16 bg-neutral-200/70 rounded-md flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/2 bg-neutral-200/80 rounded" />
                        <div className="h-3 w-1/4 bg-neutral-200/60 rounded" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : results.length === 0 ? (
                /* State 3: Clean 'No results found' state */
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                  className="flex flex-col items-center justify-center py-14 text-center"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-neutral-50 border border-neutral-200 text-neutral-400">
                    <Search size={18} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-neutral-800">
                    No results found for <span className="text-[#00221A] font-semibold">"{query}"</span>
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Try searching for general terms like Linen, Trousers, Dresses, or Shirts.
                  </p>
                </motion.div>
              ) : (
                /* State 4: Clean results cards list */
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-400">
                      {results.length} product{results.length !== 1 ? 's' : ''} found
                    </p>
                    <span className="text-[10px] text-neutral-400 font-sans hidden sm:inline">
                      Press <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[9px]">Enter ↵</kbd> for first match
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {results.map((product, i) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.2), duration: DUR.fast, ease: EASE }}
                        onClick={() => handleResultClick(product.slug)}
                        className="group w-full flex items-center gap-3.5 p-2.5 sm:p-3 rounded-xl text-left bg-white hover:bg-neutral-50/90 border border-neutral-150 hover:border-neutral-250 transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      >
                        {/* Product image thumbnail */}
                        <div className="flex-shrink-0 w-12 h-16 overflow-hidden rounded-md border border-neutral-200/90 bg-neutral-50">
                          {product.product_images?.[0]?.url ? (
                            <img
                              src={product.product_images[0].url}
                              alt={product.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                              <Image size={15} />
                            </div>
                          )}
                        </div>

                        {/* Product information */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium text-neutral-900 group-hover:text-[#00221A] truncate transition-colors duration-150">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-[#B8975A]">
                              ₹{Number(product.base_price || 0).toLocaleString('en-IN')}
                            </span>
                            {product.category_id && categoryMap[product.category_id] && (
                              <span className="inline-block text-[9px] tracking-wider uppercase font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/60">
                                {categoryMap[product.category_id]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct action affordance */}
                        <div className="flex-shrink-0 flex items-center gap-1 text-[#B8975A] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">
                          <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">
                            View
                          </span>
                          <ArrowRight size={14} strokeWidth={1.75} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom Bar: Clean Keyboard Shortcut Hints ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-3 border-t border-neutral-100 bg-neutral-50/80">
            <div className="flex items-center gap-4 text-[10px] tracking-wider uppercase text-neutral-400 font-sans">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono text-[9px] shadow-2xs">
                  Esc
                </kbd>
                to close
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono text-[9px] shadow-2xs">
                  <CornerDownLeft size={9} className="inline" />
                </kbd>
                to select
              </span>
            </div>
            <span className="text-[10px] font-sans tracking-widest uppercase text-neutral-300 font-medium">
              Zenphire
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
