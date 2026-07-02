import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, ShoppingBag, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { mockProducts } from '../lib/mockData';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';

export default function ProductDetail() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const { id } = useParams(); // id is the slug
  const product = useMemo(() => mockProducts.find((p) => p.slug === id), [id]);

  const recommendations = useMemo(() => {
    if (!product) return [];
    return mockProducts
      .filter((p) => p.category_id === product.category_id && p.id !== product.id)
      .slice(0, 4);
  }, [product]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isAdded, setIsAdded] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  // Set default color if product exists
  useState(() => {
    if (product && product.product_variants.length > 0) {
      setSelectedColor(product.product_variants[0].color);
    }
  });

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-heading font-bold uppercase mb-2">Product Not Found</h2>
        <p className="text-text-secondary text-sm mb-6">The product you are looking for does not exist or has been removed.</p>
        <Link to="/shop" className="bg-accent text-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // Get unique sizes and colors for this product
  const availableVariantsForColor = product.product_variants.filter(v => v.color === selectedColor);
  const availableColors = Array.from(new Set(product.product_variants.map(v => v.color)));

  // Selected variant details
  const selectedVariant = product.product_variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );

  const isOutOfStock = selectedSize 
    ? (selectedVariant?.stock_qty === 0)
    : availableVariantsForColor.every((v) => v.stock_qty === 0);

  const handleAddToCart = () => {
    if (!selectedSize) {
      // Highlight size selection or alert
      alert('Please select a size first.');
      return;
    }

    if (selectedVariant) {
      addItem({
        id: `${product.id}-${selectedVariant.id}`,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: product.base_price,
        image: product.product_images[0]?.url || ''
      });

      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <div className="bg-bg min-h-screen">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary">
          <Link to="/" className="hover:text-text-primary">Home</Link>
          <ChevronRight size={10} />
          <Link to="/shop" className="hover:text-text-primary">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-text-primary font-bold truncate">{product.name}</span>
        </div>
      </div>

      {/* Main product detail section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pb-24 md:pb-16">
        
        {/* Left Side: Product Images */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-bg-subtle border border-border overflow-hidden relative">
            <img
              src={product.product_images[activeImageIdx]?.url}
              alt={`${product.name} active`}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Thumbnails Row */}
          {product.product_images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.product_images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 aspect-[3/4] bg-bg-subtle border flex-shrink-0 transition-colors ${
                    activeImageIdx === idx ? 'border-accent' : 'border-border'
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Configuration */}
        <div className="flex flex-col space-y-6 justify-start">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-text-secondary font-bold">Zenphire</span>
            <h1 className="text-2xl md:text-4xl font-heading font-black uppercase text-text-primary mt-1 mb-2">
              {product.name}
            </h1>
            <p className="text-xl font-bold text-text-primary">
              ${product.base_price.toFixed(2)}
            </p>
          </div>

          {/* Description */}
          <div className="text-sm text-text-secondary leading-relaxed border-b border-border pb-6">
            {product.description}
          </div>

          {/* Configuration Form */}
          <div className="space-y-6">
            
            {/* Color swatches */}
            {availableColors.length > 1 && (
              <div>
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-3">
                  Color: <span className="text-text-secondary font-normal">{selectedColor}</span>
                </h3>
                <div className="flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(''); // Reset size when changing color
                      }}
                      className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        selectedColor === color
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-white text-text-primary hover:border-accent'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                  Select Size
                </h3>
                <button className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-4">
                  Size Guide
                </button>
              </div>
              <div className="flex gap-2.5">
                {['S', 'M', 'L', 'XL'].map((size) => {
                  const variant = availableVariantsForColor.find((v) => v.size === size);
                  const isAvailable = variant ? variant.stock_qty > 0 : false;
                  
                  return (
                    <button
                      key={size}
                      disabled={!variant}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border text-xs font-semibold flex items-center justify-center transition-colors relative ${
                        !variant 
                          ? 'opacity-30 cursor-not-allowed border-dashed border-border'
                          : !isAvailable 
                            ? 'opacity-40 cursor-not-allowed bg-bg-subtle text-text-secondary line-through border-border'
                            : selectedSize === size
                              ? 'bg-accent border-accent text-white'
                              : 'bg-white border-border text-text-primary hover:border-accent'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Variant stock feedback */}
            {selectedSize && (
              <div className="flex items-center gap-2 text-xs">
                {isOutOfStock ? (
                  <div className="text-sale font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Sold Out in selected size
                  </div>
                ) : selectedVariant && selectedVariant.stock_qty <= 4 ? (
                  <div className="text-sale font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Only {selectedVariant.stock_qty} left in stock
                  </div>
                ) : (
                  <div className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <Check size={14} /> In Stock & Ready to ship
                  </div>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex-1 bg-accent text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-accent-hover transition-colors disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} />
                {isAdded ? 'Added' : isOutOfStock ? 'Sold Out' : selectedSize ? 'Add to Cart' : 'Select Size'}
              </button>
              
              <button 
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle Wishlist"
                className="px-5 border border-border bg-white text-text-primary hover:bg-bg-subtle transition-colors flex items-center justify-center"
              >
                <Heart 
                  size={18} 
                  className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} 
                />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border mb-12">
          <h2 className="text-xl font-heading font-black uppercase tracking-wider text-text-primary mb-8 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                to={`/product/${rec.slug}`}
                onClick={() => {
                  setSelectedSize('');
                  setActiveImageIdx(0);
                }}
                className="group"
              >
                <div className="aspect-[3/4] bg-bg-subtle overflow-hidden border border-border relative mb-4">
                  <img
                    src={rec.product_images[0]?.url}
                    alt={rec.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(rec.id);
                    }}
                    aria-label="Toggle Wishlist"
                    className="absolute top-3 right-3 p-1.5 bg-white/85 hover:bg-white text-text-primary border border-border shadow-sm rounded-full transition-colors z-10"
                  >
                    <Heart
                      size={14}
                      className={isWishlisted(rec.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'}
                    />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                    Zenphire
                  </p>
                  <h3 className="text-sm font-medium text-text-primary group-hover:underline truncate">
                    {rec.name}
                  </h3>
                  <p className="text-sm font-semibold text-text-primary">
                    ${rec.base_price.toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border p-4 flex items-center justify-between gap-4 md:hidden shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary">Price</span>
          <span className="text-base font-bold text-text-primary">${product.base_price.toFixed(2)}</span>
        </div>
        <button
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className="flex-grow bg-accent text-white py-3.5 px-4 font-bold uppercase text-xs tracking-wider hover:bg-accent-hover transition-colors disabled:bg-border disabled:text-text-secondary flex items-center justify-center gap-2"
        >
          <ShoppingBag size={14} />
          {isAdded ? 'Added' : isOutOfStock ? 'Sold Out' : selectedSize ? 'Add to Cart' : 'Select Size'}
        </button>
      </div>
    </div>
  );
}
