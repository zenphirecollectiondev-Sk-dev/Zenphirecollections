import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { getActiveProducts } from '../lib/supabase';
import linenShirt from '../assets/product_linen_shirt.png';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load live active products
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

  // Use database products only
  const products = useMemo(() => dbProducts, [dbProducts]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
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
    }, 150); // Fast debounce for instant feedback

    return () => clearTimeout(timer);
  }, [query, products]);

  if (!isOpen) return null;

  const handleResultClick = (slug: string) => {
    navigate(`/product/${slug}`);
    onClose();
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex flex-col justify-start">
      {/* Top Search Bar */}
      <div className="bg-white border-b border-border w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-3xl">
            <Search size={22} className="text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Zenphire Collections..."
              className="w-full text-lg font-medium text-text-primary bg-transparent focus:outline-none placeholder-gray-400"
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="btn-icon p-2 hover:bg-bg-subtle rounded-full ml-4"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Results Container */}
      {query && (
        <div className="flex-1 w-full bg-white overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xs uppercase tracking-widest text-text-secondary font-bold mb-4">
              Search Results ({results.length})
            </h3>
            
            {results.length === 0 ? (
              <p className="text-sm text-text-secondary py-4">
                No items match your query. Try searching for "linen", "pants", or "jacket".
              </p>
            ) : (
              <div className="divide-y divide-border">
                {results.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleResultClick(product.slug)}
                    className="w-full py-4 flex items-center gap-4 hover:bg-bg-subtle text-left px-2 transition-colors"
                  >
                    <img
                      src={product.product_images && product.product_images[0]?.url || linenShirt}
                      alt={product.name}
                      className="w-12 aspect-[3/4] object-cover object-center bg-bg-subtle border border-border"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{product.name}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">₹{Number(product.base_price || 0).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
