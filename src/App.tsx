import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, NavLink } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Shield, LogOut, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useCartStore } from './store/useCartStore';
import { useWishlistStore } from './store/useWishlistStore';
import { getCategories } from './lib/supabase';
import { dataCache } from './lib/dataCache';
import ProtectedRoute from './components/ProtectedRoute';
import SearchOverlay from './components/SearchOverlay';
import CartDrawer from './components/CartDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE, EASE_ENTER, DUR } from './lib/motion';

import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import { ErrorBoundary } from './components/ErrorBoundary';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import Wishlist from './pages/Wishlist';
import Admin from './pages/Admin';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import Onboarding from './pages/auth/Onboarding';
import AuthCallback from './pages/auth/AuthCallback';
import FAQ from './pages/FAQ';
import ShippingReturns from './pages/ShippingReturns';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const { session, profile, signOut } = useAuthStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    occasions: false,
    women: false,
    men: false,
    unisex: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const wishlistIds = useWishlistStore((state) => state.productIds);
  const wishlistCount = wishlistIds.length;

  const location = useLocation();

  // Scope: Customer-facing pages only. Avoid admin portal and logins.
  const isCustomerPage = !location.pathname.startsWith('/admin') && !['/login', '/signup', '/forgot-password'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans overflow-x-hidden w-full relative">
      {/* Offline Network Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-[11px] font-bold py-1.5 px-4 text-center tracking-wider uppercase z-[250]">
          You are currently offline. Pages and cart items are loaded from local cache.
        </div>
      )}
      {/* Sticky Minimal Navigation with moving dark ambient gradient on customer-facing pages */}
      <header className={`sticky top-0 z-50 transition-all duration-300 relative shadow-md ${isCustomerPage ? 'ambient-green-gradient shadow-black/15' : 'bg-white border-b border-border shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left Nav (Desktop) / Hamburger (Mobile) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`btn-icon md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full ${isCustomerPage ? 'hover:bg-white/10' : 'hover:bg-bg-subtle'}`}
              aria-label="Toggle Menu"
            >
              <Menu size={20} className={`stroke-[1.5] ${isCustomerPage ? 'text-accent-gold' : 'text-text-primary'}`} />
            </button>
            {isCustomerPage && (
              <nav className="hidden md:flex items-center gap-6">
                <NavLink
                  to="/shop"
                  className={({ isActive }) =>
                    `nav-item-header ${isActive ? 'active text-accent-gold' : 'text-accent-gold/70 hover:text-accent-gold'}`
                  }
                >
                  Shop
                </NavLink>
                <NavLink
                  to="/wishlist"
                  className={({ isActive }) =>
                    `nav-item-header ${isActive ? 'active text-accent-gold' : 'text-accent-gold/70 hover:text-accent-gold'}`
                  }
                >
                  Wishlist
                </NavLink>
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    `nav-item-header ${isActive ? 'active text-accent-gold' : 'text-accent-gold/70 hover:text-accent-gold'}`
                  }
                >
                  Account
                </NavLink>
              </nav>
            )}
          </div>

          {/* Center Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link to="/" className={`text-xl font-heading font-normal tracking-[0.2em] uppercase select-none transition-colors duration-150 ${isCustomerPage ? 'zenphire-title-animated hover:opacity-80' : 'text-text-primary hover:text-accent'}`}>
              Zenphire
            </Link>
          </div>

          {/* Right Icons (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className={`btn-icon p-2 rounded-full ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Search size={19} className="stroke-[1.5]" />
            </button>

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className={`btn-icon p-2 rounded-full relative ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Heart size={19} className="stroke-[1.5]" />
              {wishlistCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-150 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className={`btn-icon p-2 rounded-full relative ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <ShoppingBag size={19} className="stroke-[1.5]" />
              {cartCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-150 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
                  {cartCount}
                </span>
              )}
            </button>

            <Link
              to="/account"
              aria-label="Account"
              className={`btn-icon p-2 rounded-full ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <User size={19} className="stroke-[1.5]" />
            </Link>

            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                aria-label="Admin Console"
                className={`btn-icon p-2 rounded-full ${isCustomerPage ? 'text-accent-gold/70 hover:bg-white/10 hover:text-accent-gold' : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'}`}
              >
                <Shield size={19} className="stroke-[1.5]" />
              </Link>
            )}

            {session && (
              <button
                onClick={signOut}
                aria-label="Sign Out"
                className={`btn-icon p-2 rounded-full ${isCustomerPage ? 'text-accent-gold/70 hover:bg-white/10 hover:text-accent-gold' : 'text-text-secondary hover:bg-bg-subtle hover:text-sale'}`}
              >
                <LogOut size={19} className="stroke-[1.5]" />
              </button>
            )}
          </div>

          {/* Right Icons (Mobile) */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className={`btn-icon min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Search size={19} className="stroke-[1.5]" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className={`btn-icon min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full relative ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <ShoppingBag size={19} className="stroke-[1.5]" />
              {cartCount > 0 && (
                <span className={`absolute top-2 right-2 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-150 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu Drawer — Premium Dark Luxury */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenuDrawer
            onClose={() => setIsMobileMenuOpen(false)}
            openSections={openSections}
            toggleSection={toggleSection}
            wishlistCount={wishlistCount}
            session={session}
            profile={profile}
            signOut={signOut}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={
            <ErrorBoundary>
              <ProductDetail />
            </ErrorBoundary>
          } />
          <Route path="/cart" element={<Cart />} />

          {/* Protected Checkout & Account */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/wishlist" element={<Wishlist />} />

          {/* Static Informational Pages */}
          <Route path="/faq" element={<FAQ />} />
          <Route path="/shipping" element={<ShippingReturns />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Protected Admin Console */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </main>

      {/* Footer (Customer Pages Only) */}
      {isCustomerPage && (
        <footer className="relative ambient-green-gradient border-t border-white/10 mt-auto text-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Subtle gold line on top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] gold-accent-line opacity-70" />
          
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
              
              {/* Brand Section */}
              <div className="md:col-span-6 lg:col-span-5 space-y-6">
                <h3 className="font-heading text-2xl md:text-3xl tracking-[0.15em] text-accent-gold uppercase zenphire-title-animated" style={{ animationDuration: '8s' }}>
                  Zenphire
                </h3>
                <p className="text-white/70 text-sm max-w-sm leading-relaxed font-sans">
                  Premium modern apparel. Redefining minimal fashion for the everyday wardrobe with precision cuts and artisan craftsmanship.
                </p>
                <div className="pt-2">
                  <p className="text-[10px] md:text-xs uppercase tracking-widest text-white/40 font-semibold">Elevate your essentials.</p>
                </div>
              </div>
              
              {/* Spacer for large screens */}
              <div className="hidden lg:block lg:col-span-1"></div>

              {/* Links Sections */}
              <div className="md:col-span-3">
                <h4 className="font-heading text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 text-accent-gold">Customer Care</h4>
                <ul className="space-y-4 text-sm text-white/70 font-medium">
                  <li><Link to="/faq" className="inline-block hover:text-white transition-colors duration-200">Help & FAQ</Link></li>
                  <li><Link to="/shipping" className="inline-block hover:text-white transition-colors duration-200">Shipping & Returns</Link></li>
                </ul>
              </div>
              
              <div className="md:col-span-3">
                <h4 className="font-heading text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-6 text-accent-gold">Legal</h4>
                <ul className="space-y-4 text-sm text-white/70 font-medium">
                  <li><Link to="/privacy" className="inline-block hover:text-white transition-colors duration-200">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="inline-block hover:text-white transition-colors duration-200">Terms of Service</Link></li>
                </ul>
              </div>
              
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-white/5 bg-black/20">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">
                &copy; {new Date().getFullYear()} Zenphire Collections. All rights reserved.
              </p>
              <div className="flex items-center gap-4 text-white/30 text-[10px] font-semibold tracking-widest uppercase">
                <span>Crafted for the modern wardrobe</span>
              </div>
            </div>
          </div>
        </footer>
      )}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Mobile Menu Drawer — Premium Dark Luxury
// ─────────────────────────────────────────────────────────────────
interface MobileMenuDrawerProps {
  onClose: () => void;
  openSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  wishlistCount: number;
  session: any;
  profile: any;
  signOut: () => void;
}

function MobileMenuDrawer({ onClose, openSections, toggleSection, wishlistCount, session, profile, signOut }: MobileMenuDrawerProps) {
  // Lock body scroll while menu is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [categories, setCategories] = useState<any[]>(() => dataCache.get<any[]>('categories') ?? []);

  useEffect(() => {
    const cached = dataCache.get<any[]>('categories');
    if (cached && cached.length > 0) setCategories(cached);
    if (!cached || dataCache.isStale('categories')) {
      getCategories().then((cats) => {
        if (cats && cats.length > 0) {
          dataCache.set('categories', cats);
          setCategories(cats);
        }
      });
    }
  }, []);

  const formatTitleCase = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const navSections = useMemo(() => {
    const getGenderCategoryItems = (genderKey: 'male' | 'female' | 'unisex', allLabel: string) => {
      const parents = categories.filter((c: any) => !c.parent_category_id);
      const matchingParents = parents.filter((parent: any) => {
        return categories.some((c: any) =>
          c.parent_category_id === parent.id &&
          (c.name?.toLowerCase() === genderKey || c.slug?.toLowerCase().endsWith(`-${genderKey}`))
        );
      });

      const items: { name: string; to: string }[] = [
        { name: allLabel, to: `/shop?gender=${genderKey}` }
      ];

      matchingParents.forEach((p: any) => {
        items.push({
          name: formatTitleCase(p.name),
          to: `/shop?category=${p.slug}&gender=${genderKey}`
        });
      });

      return items;
    };

    return [
      {
        key: 'occasions',
        label: 'Occasions',
        items: [
          { name: 'Casuals', to: '/shop?occasion=casuals' },
          { name: 'Formal', to: '/shop?occasion=formal' },
          { name: 'Ethnic', to: '/shop?occasion=ethnic' },
          { name: 'Party Wear', to: '/shop?occasion=party-wear' },
        ],
      },
      {
        key: 'women',
        label: 'Women',
        items: getGenderCategoryItems('female', "All Women's"),
      },
      {
        key: 'men',
        label: 'Men',
        items: getGenderCategoryItems('male', "All Men's"),
      },
      {
        key: 'unisex',
        label: 'Unisex',
        items: getGenderCategoryItems('unisex', "All Unisex"),
      },
    ];
  }, [categories]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: DUR.base, ease: EASE }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
      />

      {/* Drawer Panel */}
      <motion.div
        key="drawer"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', duration: 0.32, ease: EASE_ENTER }}
        className="fixed top-0 left-0 bottom-0 z-[61] w-[300px] max-w-[88vw] md:hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #00221A 0%, #063A2C 45%, #001510 100%)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-5"
          style={{ borderBottom: '1px solid rgba(184,151,90,0.18)' }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] tracking-[0.25em] uppercase text-[#B8975A]/60 font-sans">
              Menu
            </span>
            <span className="text-xl font-heading font-normal tracking-[0.22em] uppercase text-[#B8975A]">
              Zenphire
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B8975A]/70 hover:text-[#B8975A] hover:bg-white/8 transition-all duration-150"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Scrollable Nav Area ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ scrollbarWidth: 'none' }}>

          {/* Shop All — top-level CTA */}
          <Link
            to="/shop"
            onClick={onClose}
            className="group flex items-center justify-between w-full px-3 py-3.5 mb-2 rounded-lg text-[#E4C783] hover:bg-white/6 transition-all duration-150"
          >
            <span className="text-[13px] font-heading tracking-[0.18em] uppercase font-medium">Shop Collection</span>
            <ArrowRight size={14} className="text-[#B8975A]/50 group-hover:text-[#B8975A] group-hover:translate-x-0.5 transition-all duration-150" />
          </Link>

          {/* Gold divider */}
          <div className="mx-3 mb-4" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,151,90,0.35), transparent)' }} />

          {/* Category Sections */}
          {navSections.map((section) => (
            <div key={section.key} className="mb-1">
              <button
                onClick={() => toggleSection(section.key)}
                className="group w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/6 transition-all duration-150"
              >
                <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium text-[#B8975A]/85 group-hover:text-[#B8975A] transition-colors duration-150">
                  {section.label}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.8}
                  className={`text-[#B8975A]/50 transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${openSections[section.key] ? 'rotate-180 text-[#B8975A]' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openSections[section.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DUR.fast, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 pl-4 pb-2 pt-1">
                      {section.items.map((item, i) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: DUR.fast, ease: EASE }}
                        >
                          <Link
                            to={item.to}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2.5 min-h-[40px] rounded-md text-[11px] font-sans tracking-[0.14em] uppercase font-medium text-white/50 hover:text-[#E4C783] hover:bg-white/5 transition-all duration-150"
                          >
                            <span className="w-1 h-1 rounded-full bg-[#B8975A]/35 flex-shrink-0" />
                            {item.name}
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Divider */}
          <div className="mx-3 my-4" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,151,90,0.25), transparent)' }} />

          {/* Wishlist */}
          <Link
            to="/wishlist"
            onClick={onClose}
            className="group flex items-center justify-between w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-150"
          >
            <div className="flex items-center gap-2.5">
              <Heart size={14} strokeWidth={1.5} />
              <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium">Wishlist</span>
            </div>
            {wishlistCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#00221A]"
                style={{ background: 'linear-gradient(135deg, #B8975A, #E4C783)' }}>
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* My Account */}
          <Link
            to="/account"
            onClick={onClose}
            className="group flex items-center gap-2.5 w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-150"
          >
            <User size={14} strokeWidth={1.5} />
            <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium">My Account</span>
          </Link>

          {/* Admin Console */}
          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={onClose}
              className="group flex items-center gap-2.5 w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-150"
            >
              <Shield size={14} strokeWidth={1.5} />
              <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium">Admin Console</span>
            </Link>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-5 py-5" style={{ borderTop: '1px solid rgba(184,151,90,0.18)' }}>
          {session ? (
            <button
              onClick={() => { onClose(); signOut(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-150 text-red-400/80 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 hover:bg-red-400/5"
            >
              <LogOut size={13} strokeWidth={1.8} />
              Sign Out
            </button>
          ) : (
            <Link
              to="/account"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-150 text-[#00221A]"
              style={{ background: 'linear-gradient(135deg, #B8975A 0%, #E4C783 60%, #B8975A 100%)' }}
            >
              Sign In / Register
            </Link>
          )}

          {/* Subtle brand tagline */}
          <p className="text-center text-[9px] tracking-[0.2em] uppercase text-white/20 mt-4 font-sans">
            Premium Modern Apparel
          </p>
        </div>
      </motion.div>
    </>
  );
}
