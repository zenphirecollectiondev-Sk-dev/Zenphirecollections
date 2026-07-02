import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search } from 'lucide-react';
import { mockProducts } from '../lib/mockData';
import type { MockProduct } from '../lib/mockData';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MockProduct[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      const filtered = mockProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerQuery) ||
          product.description.toLowerCase().includes(lowerQuery)
      );
      setResults(filtered);
    }, 150); // Fast debounce for instant feedback

    return () => clearTimeout(timer);
  }, [query]);

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
            className="p-2 hover:bg-bg-subtle transition-colors rounded-full ml-4"
          >
            <X size={24} />
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
                      src={product.product_images[0]?.url}
                      alt={product.name}
                      className="w-12 aspect-[3/4] object-cover object-center bg-bg-subtle border border-border"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">{product.name}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">${product.base_price.toFixed(2)}</p>
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
