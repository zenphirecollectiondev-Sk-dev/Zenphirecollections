import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingBag, Heart, User, Search, Shield, LogOut, Menu, X } from 'lucide-react';
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

export default function App() {
  const { session, profile, initialize, signOut } = useAuthStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  
  const wishlistIds = useWishlistStore((state) => state.productIds);
  const wishlistCount = wishlistIds.length;

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans">
        {/* Sticky Minimal Navigation */}
        <header className="sticky top-0 z-50 bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left Nav (Desktop) / Hamburger (Mobile) */}
            <div className="flex items-center gap-6">
              <Link to="/shop" className="hidden md:block text-sm font-medium tracking-wide uppercase hover:text-accent-hover transition-colors">
                Shop
              </Link>
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-bg-subtle transition-colors rounded-full"
                aria-label="Toggle Menu"
              >
                <Menu size={20} className="stroke-[1.5]" />
              </button>
            </div>

            {/* Center Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <Link to="/" className="text-xl font-heading font-black tracking-[0.2em] uppercase select-none">
                Zenphire
              </Link>
            </div>

            {/* Right Icons (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search" 
                className="p-2 hover:bg-bg-subtle transition-colors rounded-full"
              >
                <Search size={20} className="stroke-[1.5]" />
              </button>
              
              <Link to="/wishlist" aria-label="Wishlist" className="p-2 hover:bg-bg-subtle transition-colors rounded-full relative">
                <Heart size={20} className="stroke-[1.5]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full scale-90">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button 
                onClick={() => setIsCartOpen(true)}
                aria-label="Cart" 
                className="p-2 hover:bg-bg-subtle transition-colors rounded-full relative"
              >
                <ShoppingBag size={20} className="stroke-[1.5]" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full scale-90">
                    {cartCount}
                  </span>
                )}
              </button>

              <Link to="/account" aria-label="Account" className="p-2 hover:bg-bg-subtle transition-colors rounded-full">
                <User size={20} className="stroke-[1.5]" />
              </Link>

              {profile?.role === 'admin' && (
                <Link to="/admin" aria-label="Admin Console" className="p-2 hover:bg-bg-subtle transition-colors rounded-full text-text-secondary hover:text-text-primary">
                  <Shield size={20} className="stroke-[1.5]" />
                </Link>
              )}

              {session && (
                <button
                  onClick={signOut}
                  aria-label="Sign Out"
                  className="p-2 hover:bg-bg-subtle transition-colors rounded-full text-text-secondary hover:text-sale"
                >
                  <LogOut size={20} className="stroke-[1.5]" />
                </button>
              )}
            </div>

            {/* Right Icons (Mobile) */}
            <div className="flex md:hidden items-center gap-2">
              <button 
                onClick={() => setIsCartOpen(true)}
                aria-label="Cart" 
                className="p-2 hover:bg-bg-subtle transition-colors rounded-full relative"
              >
                <ShoppingBag size={20} className="stroke-[1.5]" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-accent text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full scale-90">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              />
              
              {/* Menu Container */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r border-border p-6 shadow-2xl flex flex-col justify-between"
              >
                <div className="space-y-8">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-lg font-heading font-black tracking-[0.2em] uppercase">
                      Zenphire
                    </span>
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 hover:bg-bg-subtle rounded-full text-text-secondary hover:text-text-primary"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex flex-col gap-6 text-sm font-bold uppercase tracking-wider text-text-primary">
                    <Link 
                      to="/shop" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-accent transition-colors flex items-center gap-2"
                    >
                      Shop Collection
                    </Link>
                    
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsSearchOpen(true);
                      }}
                      className="text-left hover:text-accent transition-colors flex items-center gap-2 font-bold uppercase tracking-wider"
                    >
                      Search
                    </button>

                    <Link 
                      to="/wishlist" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-accent transition-colors flex items-center justify-between"
                    >
                      <span>Wishlist</span>
                      {wishlistCount > 0 && (
                        <span className="bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    <Link 
                      to="/account" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-accent transition-colors"
                    >
                      My Account
                    </Link>

                    {profile?.role === 'admin' && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-accent flex items-center gap-1.5"
                      >
                        <Shield size={14} /> Admin Console
                      </Link>
                    )}
                  </nav>
                </div>

                {/* Footer / Sign Out */}
                <div className="pt-6 border-t border-border">
                  {session ? (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 border border-sale text-sale py-3 text-xs font-bold uppercase tracking-widest hover:bg-sale/5 transition-colors"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  ) : (
                    <Link
                      to="/account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors text-center font-bold"
                    >
                      Sign In / Register
                    </Link>
                  )}
                </div>

              </motion.div>
            </div>
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

        {/* Footer */}
        <footer className="bg-bg-subtle border-t border-border py-12 px-4 mt-auto">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-heading font-bold uppercase tracking-wider text-sm mb-4">Zenphire Collections</h3>
              <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
                Premium modern apparel. Redefining minimal fashion for the everyday wardrobe.
              </p>
            </div>
            <div>
              <h3 className="font-heading font-bold uppercase tracking-wider text-sm mb-4">Customer Care</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link to="/shop" className="hover:text-text-primary">Help & FAQ</Link></li>
                <li><Link to="/shop" className="hover:text-text-primary">Shipping & Returns</Link></li>
                <li><Link to="/shop" className="hover:text-text-primary">Size Guide</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-heading font-bold uppercase tracking-wider text-sm mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link to="/shop" className="hover:text-text-primary">Privacy Policy</Link></li>
                <li><Link to="/shop" className="hover:text-text-primary">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} Zenphire Collections. All rights reserved.
            </p>
            <p className="text-xs text-text-secondary font-heading font-bold tracking-widest uppercase">
              White & Grey Minimalist Edition
            </p>
          </div>
        </footer>
        <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      </div>
    </Router>
  );
}
