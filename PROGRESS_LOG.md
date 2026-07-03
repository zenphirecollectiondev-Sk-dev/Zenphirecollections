# Zenphire Collections — Progress Log

## How to use this file
- At the START of every session: read the latest entry to know exactly where things stand.
- At the END of every session (before committing): add a new entry below, newest on top.
- Never delete old entries — this is the permanent build history.

---

## [2026-07-03] — Session: Google OAuth & Onboarding
**What was done:**
- Integrated Supabase Google OAuth provider (`signInWithOAuth`) on `Login.tsx` and `Signup.tsx` pages.
- Added `dob` (date) and `gender` (text) columns to the `profiles` table in `supabase_schema.sql`.
- Updated the `handle_new_user()` trigger function in SQL schema to automatically capture the user's name from OAuth raw user metadata (`full_name` or `name`).
- Updated TypeScript database schema definitions in `src/types/database.ts` and auth state interface in `src/store/useAuthStore.ts`.
- Developed first-time user onboarding page (`src/pages/auth/Onboarding.tsx`) to collect Name, DOB, and Gender.
- Updated `ProtectedRoute.tsx` to automatically redirect logged-in users who have not completed onboarding to the `/onboarding` setup screen.

**Files touched:**
- `supabase_schema.sql`
- `src/types/database.ts`
- `src/store/useAuthStore.ts`
- `src/components/ProtectedRoute.tsx`
- `src/App.tsx`
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Signup.tsx`
- `src/pages/auth/Onboarding.tsx`

**Status:** ✅ Complete — Google sign-in and onboarding flow are fully integrated, build check compiles clean

**Next session should start with:** Phase 4 — Customer Account: Session 1 (Profile & Address management UI dashboard setup at `/account`)

---

## [2026-07-02] — Session: Refactored Categories to Gender Collections
**What was done:**
- Refactored storefront category architecture to display Gender Collections (Male, Female, Unisex) instead of generic clothing classifications.
- Generated a new premium female collection asset (`src/assets/category_female_fashion.png`) using image generator tool to represent the female category block.
- Updated category definitions and mapping items in `src/lib/mockData.ts` to assign products to Male, Female, and Unisex collections.
- Updated text layout labels and headers in `src/pages/Home.tsx` ("Gender Collections") and `src/pages/Shop.tsx` ("Collections", "All Collections").

**Files touched:**
- `src/lib/mockData.ts`
- `src/pages/Home.tsx`
- `src/pages/Shop.tsx`
- `src/assets/category_female_fashion.png`

**Status:** ✅ Complete — compile build is successful and gender collection filters are fully integrated

**Next session should start with:** Phase 4 — Customer Account (Profile management, saved addresses, password changes, and order history tracking)

---

## [2026-07-02] — Session: Phase 3 Complete (Cart & Checkout)
**What was done:**
- Created sliding `CartDrawer.tsx` component with clean custom transition animations and quantity controls.
- Integrated `CartDrawer` overlay into `App.tsx` navigation header, triggering on shopping bag clicks.
- Built the dedicated `Cart.tsx` page to display detailed cart listings, unit prices, quantity toggles, and total values.
- Implemented coupon validation utility in `src/lib/coupons.ts` supporting percentage and fixed discount types, expirations, and minimum order requirements.
- Developed the secure checkout flow at `src/pages/Checkout.tsx`, incorporating dynamic customer shipping address selections, new address inputs, coupon code validation interfaces, and final aggregates.
- Created a simulated Razorpay payment modal checkout flow.
- Added transaction write queries to Supabase `orders` and `order_items` tables upon payment authorization, with a robust local state fallback warning in case database keys are unset.
- Designed a post-purchase receipt page displaying order tracking IDs and summary tables.

**Files touched:**
- `src/components/CartDrawer.tsx`
- `src/pages/Cart.tsx`
- `src/lib/coupons.ts`
- `src/pages/Checkout.tsx`
- `src/App.tsx`

**Status:** ✅ Complete — Cart drawer, cart page, validation utilities, and simulated checkout flows are fully styled and compile cleanly

**Next session should start with:** Phase 4 — Customer Account (Profile management, saved addresses, password changes, and order history tracking)

---

## [2026-07-02] — Session: Phase 2 Complete (Storefront Core)
**What was done:**
- Generated premium minimalist visual assets for the editorial hero banner and clothing products (linen shirt, trousers, cropped jacket).
- Structured schema-compliant mock data in `src/lib/mockData.ts` to power the storefront immediately.
- Implemented the storefront Home Page (`Home.tsx`) featuring hero, categories, new arrivals, best sellers, and editorial, omitting the newsletter strip.
- Implemented the Catalog Listing Page (`Shop.tsx`) supporting category filtration (including query parameter syncing), size selections, price filtering, sorting logic, and mobile bottom drawer filter sheet.
- Implemented the Product Detail Page (`ProductDetail.tsx`) supporting image selection, size/color selector swatches with availability indicators, stock alerts, add-to-cart hooks, and a mobile-sticky selector panel.
- Built a Zustand Cart Store (`src/store/useCartStore.ts`) to enable cart actions.
- Built a Zustand Wishlist Store (`src/store/useWishlistStore.ts`) and linked wishlist heart toggles across all catalog tiles and detail sections, and implemented a dedicated Wishlist management page (`Wishlist.tsx`).
- Built a Header Search Overlay (`SearchOverlay.tsx`) supporting debounced instant results navigation.
- Integrated cart and wishlist counter badges on header navigation icons in `App.tsx`.
- Implemented a "Recommended Products" block at the bottom of the Product Detail view.

**Files touched:**
- `src/lib/mockData.ts`
- `src/pages/Home.tsx`
- `src/pages/Shop.tsx`
- `src/pages/ProductDetail.tsx`
- `src/pages/Wishlist.tsx`
- `src/store/useCartStore.ts`
- `src/store/useWishlistStore.ts`
- `src/components/SearchOverlay.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/assets/*`

**Status:** ✅ Complete — storefront core features are fully styled (white/grey minimal aesthetic) and compile cleanly

**Next session should start with:** Phase 3 — Cart & Checkout (Zustand cart drawer, coupon logic, checkout address forms, and Razorpay integration)

---

## [2026-07-02] — Session: Phase 1 Complete (Database + Auth)
**What was done:**
- Created complete Supabase schema SQL script (`supabase_schema.sql`) defining all 12 core tables, indexes, triggers (including profile auto-creation and single-default address constraint), and safe `is_admin()` helper.
- Set up secure Row Level Security (RLS) policies for all tables, guaranteeing customers can only read/write their own data while keeping products public.
- Built a custom Zustand state store (`src/store/useAuthStore.ts`) to manage auth session, profile, and loading state.
- Implemented `ProtectedRoute.tsx` wrapper for route guarding and role-based redirects.
- Crafted premium minimal white/grey auth screens: Sign In (`Login.tsx`), Create Account (`Signup.tsx`), and Reset Password (`ForgotPassword.tsx`).
- Created TypeScript type definitions matching the PostgreSQL schema (`src/types/database.ts`).
- Defined typed client query helper functions in `src/lib/supabase.ts` for common data operations (active products, cart, wishlist, addresses, and orders).

**Files touched:**
- `supabase_schema.sql`
- `src/store/useAuthStore.ts`
- `src/components/ProtectedRoute.tsx`
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Signup.tsx`
- `src/pages/auth/ForgotPassword.tsx`
- `src/types/database.ts`
- `src/lib/supabase.ts`
- `src/App.tsx`

**Status:** ✅ Complete — compiles successfully, database schema is defined, RLS policies are secure, and auth flow is fully implemented and routed

**Next session should start with:** Phase 2, Session 1 — Storefront Home page (hero, categories scroll, arrivals grid, newsletter)

---

## [2026-07-02] — Session: Project Setup & Phase 0 Complete
**What was done:**
- Scaffolded Vite + React + TypeScript project
- Installed routing (`react-router-dom`), icons (`lucide-react`), animation (`framer-motion`), state (`zustand`), Supabase client (`@supabase/supabase-js`), and fonts (`@fontsource/geist-sans`, `@fontsource/inter-tight`)
- Configured Tailwind CSS with custom minimalist white/grey design tokens and typography settings
- Initialized Supabase client wrapper at `src/lib/supabase.ts`
- Created core React Router routing setup with placeholder layouts and pages

**Files touched:**
- `package.json`
- `tailwind.config.js`
- `src/main.tsx`
- `src/index.css`
- `src/App.tsx`
- `src/lib/supabase.ts`
- `src/pages/*.tsx`

**Status:** ✅ Complete — project scaffolding compiles and runs with Tailwind styling

**Next session should start with:** Phase 1, Session 1 — Supabase schema + RLS SQL
