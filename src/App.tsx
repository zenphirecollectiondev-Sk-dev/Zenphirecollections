import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, NavLink } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Shield, LogOut, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useCartStore } from './store/useCartStore';
import { useWishlistStore } from './store/useWishlistStore';
import ProtectedRoute from './components/ProtectedRoute';
import SearchOverlay from './components/SearchOverlay';
import CartDrawer from './components/CartDrawer';
import { motion, AnimatePresence } from 'framer-motion';

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
      {/* Sticky Minimal Navigation with moving dark ambient gradient on customer-facing pages */}
      <header className={`sticky top-0 z-50 transition-all duration-300 relative shadow-md ${isCustomerPage ? 'ambient-green-gradient shadow-black/15' : 'bg-white border-b border-border shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left Nav (Desktop) / Hamburger (Mobile) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`btn-icon md:hidden p-2 rounded-full ${isCustomerPage ? 'hover:bg-white/10' : 'hover:bg-bg-subtle'}`}
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
            <Link to="/" className={`text-xl font-heading font-normal tracking-[0.2em] uppercase select-none transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:text-accent-gold' : 'text-text-primary hover:text-accent'}`}>
              Zenphire
            </Link>
          </div>

          {/* Right Icons (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className={`btn-icon p-2 rounded-full transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Search size={19} className="stroke-[1.5]" />
            </button>

            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className={`btn-icon p-2 rounded-full relative transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Heart size={19} className="stroke-[1.5]" />
              {wishlistCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-300 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className={`btn-icon p-2 rounded-full relative transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <ShoppingBag size={19} className="stroke-[1.5]" />
              {cartCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-300 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
                  {cartCount}
                </span>
              )}
            </button>

            <Link
              to="/account"
              aria-label="Account"
              className={`btn-icon p-2 rounded-full transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <User size={19} className="stroke-[1.5]" />
            </Link>

            {profile?.role === 'admin' && (
              <Link
                to="/admin"
                aria-label="Admin Console"
                className={`btn-icon p-2 rounded-full transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold/70 hover:bg-white/10 hover:text-accent-gold' : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'}`}
              >
                <Shield size={19} className="stroke-[1.5]" />
              </Link>
            )}

            {session && (
              <button
                onClick={signOut}
                aria-label="Sign Out"
                className={`btn-icon p-2 rounded-full transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold/70 hover:bg-white/10 hover:text-accent-gold' : 'text-text-secondary hover:bg-bg-subtle hover:text-sale'}`}
              >
                <LogOut size={19} className="stroke-[1.5]" />
              </button>
            )}
          </div>

          {/* Right Icons (Mobile) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className={`btn-icon p-2 rounded-full transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <Search size={19} className="stroke-[1.5]" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Cart"
              className={`btn-icon p-2 rounded-full relative transition-colors duration-200 ${isCustomerPage ? 'text-accent-gold hover:bg-white/10' : 'text-text-primary hover:bg-bg-subtle'}`}
            >
              <ShoppingBag size={19} className="stroke-[1.5]" />
              {cartCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all duration-300 ${isCustomerPage ? 'bg-white text-header-base' : 'bg-accent text-white'}`}>
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
        <footer className="relative ambient-green-gradient border-t border-white/10 py-12 px-4 mt-auto text-white/70 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-heading font-normal uppercase tracking-wider text-sm mb-4 text-accent-gold">Zenphire Collections</h3>
              <p className="text-white/70 text-sm max-w-xs leading-relaxed">
                Premium modern apparel. Redefining minimal fashion for the everyday wardrobe.
              </p>
            </div>
            <div>
              <h3 className="font-heading font-normal uppercase tracking-wider text-sm mb-4 text-accent-gold">Customer Care</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/shop" className="hover:text-accent-gold transition-colors">Help & FAQ</Link></li>
                <li><Link to="/shop" className="hover:text-accent-gold transition-colors">Shipping & Returns</Link></li>
                <li><Link to="/shop" className="hover:text-accent-gold transition-colors">Size Guide</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-heading font-normal uppercase tracking-wider text-sm mb-4 text-accent-gold">Legal</h3>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link to="/shop" className="hover:text-accent-gold transition-colors">Privacy Policy</Link></li>
                <li><Link to="/shop" className="hover:text-accent-gold transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/10 flex justify-center items-center">
            <p className="text-xs text-white/50 text-center">
              &copy; {new Date().getFullYear()} Zenphire Collections. All rights reserved.
            </p>
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

  const navSections = [
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
      items: [
        { name: 'Dresses', to: '/shop?category=dresses&gender=female' },
        { name: 'Co-ords', to: '/shop?category=co-ords&gender=female' },
        { name: 'Crop Tops', to: '/shop?category=crop-tops&gender=female' },
        { name: 'Trousers', to: '/shop?category=pants&gender=female' },
        { name: 'Jackets', to: '/shop?category=jackets&gender=female' },
        { name: 'Shirts', to: '/shop?category=shirts&gender=female' },
        { name: 'T-Shirt & Tops', to: '/shop?category=t-shirts&gender=female' },
      ],
    },
    {
      key: 'men',
      label: 'Men',
      items: [
        { name: 'Shirts', to: '/shop?category=shirts&gender=male' },
        { name: 'T-Shirts', to: '/shop?category=t-shirts&gender=male' },
        { name: 'Trousers', to: '/shop?category=pants&gender=male' },
        { name: 'Hoodies', to: '/shop?category=hoodies&gender=male' },
        { name: 'Sweatshirts', to: '/shop?category=sweatshirts&gender=male' },
      ],
    },
    {
      key: 'unisex',
      label: 'Unisex',
      items: [
        { name: 'Cargo', to: '/shop?category=cargo&gender=unisex' },
        { name: 'Jeans', to: '/shop?category=jeans&gender=unisex' },
        { name: 'Shirts', to: '/shop?category=shirts&gender=unisex' },
        { name: 'T-Shirts', to: '/shop?category=t-shirts&gender=unisex' },
        { name: 'Hoodies', to: '/shop?category=hoodies&gender=unisex' },
        { name: 'Sweatshirts', to: '/shop?category=sweatshirts&gender=unisex' },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm md:hidden"
      />

      {/* Drawer Panel */}
      <motion.div
        key="drawer"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#B8975A]/70 hover:text-[#B8975A] hover:bg-white/8 transition-all duration-200"
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
            className="group flex items-center justify-between w-full px-3 py-3.5 mb-2 rounded-lg text-[#E4C783] hover:bg-white/6 transition-all duration-200"
          >
            <span className="text-[13px] font-heading tracking-[0.18em] uppercase font-medium">Shop Collection</span>
            <ArrowRight size={14} className="text-[#B8975A]/50 group-hover:text-[#B8975A] group-hover:translate-x-0.5 transition-all duration-200" />
          </Link>

          {/* Gold divider */}
          <div className="mx-3 mb-4" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(184,151,90,0.35), transparent)' }} />

          {/* Category Sections */}
          {navSections.map((section) => (
            <div key={section.key} className="mb-1">
              <button
                onClick={() => toggleSection(section.key)}
                className="group w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/6 transition-all duration-200"
              >
                <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium text-[#B8975A]/85 group-hover:text-[#B8975A] transition-colors">
                  {section.label}
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.8}
                  className={`text-[#B8975A]/50 transition-transform duration-300 ${openSections[section.key] ? 'rotate-180 text-[#B8975A]' : ''}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openSections[section.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 pl-4 pb-2 pt-1">
                      {section.items.map((item, i) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.18 }}
                        >
                          <Link
                            to={item.to}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-sans tracking-[0.14em] uppercase font-medium text-white/50 hover:text-[#E4C783] hover:bg-white/5 transition-all duration-180"
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
            className="group flex items-center justify-between w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-200"
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
            className="group flex items-center gap-2.5 w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-200"
          >
            <User size={14} strokeWidth={1.5} />
            <span className="text-[12px] font-heading tracking-[0.18em] uppercase font-medium">My Account</span>
          </Link>

          {/* Admin Console */}
          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={onClose}
              className="group flex items-center gap-2.5 w-full px-3 py-3 mb-1 rounded-lg text-[#B8975A]/80 hover:text-[#E4C783] hover:bg-white/6 transition-all duration-200"
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-200 text-red-400/80 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 hover:bg-red-400/5"
            >
              <LogOut size={13} strokeWidth={1.8} />
              Sign Out
            </button>
          ) : (
            <Link
              to="/account"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-200 text-[#00221A]"
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
