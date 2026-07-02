# Zenphire Collections — Build Roadmap
**Credit-Efficient Execution Plan**

---

## 0. Ground Rules for Credit-Limited AI Coding

1. **Never let the AI "explore."** Every session starts with you pasting the exact schema/types/file structure it needs.
2. **One session = one deliverable that compiles and runs.** Never split a single component/page across sessions.
3. **Write specs in a local `.md` file first**, before opening any paid AI coding tool — only implementation should burn credits.
4. **Commit to git after every single session**, even tiny ones.
5. **Split work by scope, not tool:** hand multi-file, whole-page builds to your AI assistant in one big focused prompt; keep single-file logic (a query function, a schema, a utility, an RLS policy) as separate, tightly scoped prompts so nothing sprawls.
6. **Pre-write your Supabase schema and TypeScript types before any implementation session.**
7. **Batch similar work** — do all CRUD screens in one focused session, not five scattered ones.
8. **Log progress after every session** — see Section 1. This is what replaces chat history when you switch tools mid-project.

---

## 1. The Progress Log System (solves the "no history when I switch tools" problem)

Different AI coding assistants don't share memory — and none of them carry context from this chat. The fix is a **single source of truth file that lives in your repo**, not in any AI tool's memory. Every session, the AI reads it first and updates it last.

### Create this file once, at project root: `PROGRESS_LOG.md`

```markdown
# Zenphire Collections — Progress Log

## How to use this file
- At the START of every session: read the latest entry to know exactly where things stand.
- At the END of every session (before committing): add a new entry below, newest on top.
- Never delete old entries — this is the permanent build history.

---

## [2026-07-02] — Session: Project Setup
**What was done:**
- Vite + React + TS scaffolded
- Tailwind configured with white/grey design tokens
- Supabase client initialized in src/lib/supabase.ts
- Routing structure set up (React Router)

**Files touched:** src/main.tsx, src/lib/supabase.ts, tailwind.config.ts, src/App.tsx

**Status:** ✅ Complete — app boots, connects to Supabase, routes resolve

**Next session should start with:** Phase 1, Session 1 — Supabase schema + RLS SQL
```

### The rule
Every prompt you give your AI assistant should **start** with:
> "Read PROGRESS_LOG.md before doing anything. Continue from the 'Next session should start with' line."

And **end** with:
> "Before finishing, append a new entry to PROGRESS_LOG.md following the existing format: date, what was done, files touched, status, and what the next session should start with."

This means even if you switch tools mid-project, or your credits run out and you resume three days later, the very first thing the AI reads tells it exactly what exists and what's next — no need for you to re-explain anything, and no wasted credits on the AI re-discovering your own codebase.

### Optional: also keep a lightweight commit convention
```
git commit -m "[Phase 2.3] Product detail page - gallery, size/color select, stock display"
```
Phase-tagged commits let you `git log --oneline` for a fast visual timeline alongside PROGRESS_LOG.md.

---

## 2. Design Direction — White/Grey, Minimal, Mobile-First (Souled Store inspired)

Souled Store's site works because it gets out of the way of the product photography — reduced navigation, generous white space, grid-based product tiles, bold but restrained typography, and a mobile experience that isn't a shrunk desktop layout but designed thumb-first. That's the direction for Zenphire Collections, translated into a white/grey palette.

### Color tokens
```
--color-bg: #FFFFFF
--color-bg-subtle: #F5F5F5      /* section backgrounds, cards */
--color-border: #E5E5E5
--color-text-primary: #1A1A1A
--color-text-secondary: #6B6B6B
--color-accent: #2B2B2B          /* buttons, active states — near-black, not colorful */
--color-accent-hover: #000000
--color-sale: #C0392B            /* used sparingly — only for discounts/sale tags */
```

### Typography — new, minimal, clean pairing

Skip the overused Inter-everywhere look. For a fashion-forward minimal store, use a font with more personality in the geometry while staying clean:

- **Headings / Product names / Prices:** **Geist** (Vercel's variable font — very current, extremely clean geometric sans, free via Google Fonts/Fontshare). Alternative if you want slightly warmer: **General Sans** (Fontshare, free).
- **Body / UI labels / Nav:** **Geist** at a lighter weight, or pair with **Inter Tight** for a touch of contrast between headline and body without breaking the minimal feel.
- **Optional accent for collection titles / sale banners:** a tighter tracked-out uppercase treatment of the same heading font rather than introducing a second typeface — keeps things minimal instead of "designed by committee."

Avoid: Poppins, Montserrat, Playfair — all overused in Indian D2C fashion sites right now and will read generic.

Font sourcing: both Geist and General Sans are free and self-hostable — no licensing cost, which matters for a client project.

### Layout principles
- **Nav:** 4–6 items max, logo centered or left, cart/search/account icons right. Sticky on scroll.
- **Homepage:** full-bleed hero banner → horizontal-scroll "shop by category" tiles → grid of new arrivals → editorial/seasonal collection banner → best-sellers grid → newsletter strip.
- **Product grid:** 2 columns on mobile, 3–4 on desktop. White background product shots, minimal card chrome (name, price, maybe a color swatch row) — let the image lead.
- **Product detail:** large swipeable image gallery on mobile (not thumbnails-first like desktop), sticky "Add to Cart" bar pinned to bottom on mobile.
- **Micro-interactions:** Framer Motion for cart drawer slide-in, page transitions, image hover-swap on product cards (desktop) / swipe on mobile — kept subtle, never flashy.

### Mobile-centric non-negotiables
- Bottom sticky "Add to Cart" / "Checkout" bar on relevant pages (thumb-reachable).
- Filters open as a bottom sheet, not a sidebar, on mobile.
- Tap targets minimum 44px.
- Cart as a slide-in drawer on both mobile and desktop for consistency.
- Test every phase at 375px width before considering it done.

---

## 3. Recommended Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS (tokens above) |
| Fonts | Geist (headings/UI) + Inter Tight (body) |
| Animation | Framer Motion |
| State | Zustand (cart/wishlist) + TanStack Query |
| Backend/DB/Auth | Supabase (Postgres + Auth + Storage + RLS) |
| Payments | Razorpay *(assumption — swap to Stripe if international)* |
| Forms/Validation | React Hook Form + Zod |
| Deployment | Vercel + Supabase |

---

## 4. Supabase Schema (design before any AI session — this is the reference every prompt below points to)

**Core tables:** `profiles`, `categories`, `products`, `product_variants`, `product_images`, `addresses`, `cart_items`, `wishlist_items`, `orders`, `order_items`, `coupons`, `reviews`

**RLS plan:** customers read own data only + all active products; admin role full read/write; public reads active products/categories only.

---

## 5. Ready-to-Execute AI Prompts, by Phase

Paste these directly into whichever AI coding assistant you're using that session. Each one already includes the PROGRESS_LOG instruction so continuity is automatic regardless of which tool picks it up next. Fill in the `[...]` placeholders with your actual schema/types once Phase 1 Session 1 is done.

---

### Phase 0 — Project Setup *(1 session)*

```
Read PROGRESS_LOG.md if it exists; if not, this is session 1.

TASK: Scaffold a new React + TypeScript + Vite project for "Zenphire Collections", 
an e-commerce clothing store.

Requirements:
- Tailwind CSS configured with this design token set (add to tailwind.config):
  bg: #FFFFFF, bg-subtle: #F5F5F5, border: #E5E5E5, text-primary: #1A1A1A,
  text-secondary: #6B6B6B, accent: #2B2B2B, accent-hover: #000000, sale: #C0392B
- Fonts: Geist for headings/UI, Inter Tight for body text — self-hosted via 
  @fontsource or similar, not Google Fonts CDN
- React Router set up with placeholder routes: /, /shop, /product/:id, /cart, 
  /checkout, /account, /wishlist, /admin
- Supabase client initialized in src/lib/supabase.ts using env vars 
  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Folder structure: src/components, src/pages, src/lib, src/hooks, src/store, src/types
- Mobile-first: verify layout works at 375px width

Do not build any page content yet — this is scaffolding only.

ACCEPTANCE CRITERIA:
- App boots with `npm run dev`
- Supabase client connects without error
- All routes render an empty placeholder page
- Tailwind tokens and both fonts render correctly (test with one styled div)

Before finishing, create PROGRESS_LOG.md and add the first entry following this format:
date, what was done, files touched, status, what next session should start with.
```

---

### Phase 1 — Database + Auth *(3 sessions)*

**Session 1:**
```
Read PROGRESS_LOG.md — continue from where it left off.

TASK: Write complete Supabase SQL for Zenphire Collections' schema and RLS policies.

Tables needed: profiles (extends auth.users: name, phone, role enum customer/admin),
categories (id, name, slug, parent_category_id), 
products (id, name, slug, description, category_id, base_price, is_active),
product_variants (id, product_id, size, color, stock_qty, sku),
product_images (id, product_id, url, sort_order),
addresses (id, user_id, line1, city, state, pincode, is_default),
cart_items (id, user_id, variant_id, quantity),
wishlist_items (id, user_id, product_id),
orders (id, user_id, status, total, address_id, tracking_id, created_at),
order_items (id, order_id, variant_id, quantity, price_at_purchase),
coupons (id, code, discount_type, value, expiry, min_order_value),
reviews (id, product_id, user_id, rating, comment)

RLS policies:
- Customers: read/write own profile, cart, wishlist, addresses, orders only
- Everyone (incl. unauthenticated): read active products, categories, product_images, product_variants
- Admin role: full read/write on all tables

Output as a single .sql file ready to run in Supabase SQL editor.

ACCEPTANCE CRITERIA: Valid Postgres syntax, RLS enabled on every table, policies match the rules above.

Before finishing, update PROGRESS_LOG.md with a new entry.
```

**Session 2:**
```
Read PROGRESS_LOG.md — continue from where it left off.
Schema reference: [paste your finalized SQL schema here]

TASK: Build auth pages — signup, login, forgot password, and a ProtectedRoute 
wrapper component that redirects unauthenticated users to /login and redirects 
based on profile.role (customer -> /, admin -> /admin).

Style: white/grey minimal design per design tokens and fonts, mobile-first single column forms.

Do not touch anything outside src/pages/auth and src/components/ProtectedRoute.tsx.

ACCEPTANCE CRITERIA: signup creates a profile row, login redirects correctly by role,
protected routes block unauthenticated access.

Before finishing, update PROGRESS_LOG.md.
```

**Session 3:**
```
Read PROGRESS_LOG.md — continue from where it left off.

TASK: Generate a complete src/types/database.ts matching the schema from Session 1, 
and a typed Supabase client wrapper in src/lib/supabase.ts.

ACCEPTANCE CRITERIA: All table types match schema exactly, client exports 
typed helper functions for common queries (getActiveProducts, getUserCart, etc.)

Before finishing, update PROGRESS_LOG.md.
```

---

### Phase 2 — Storefront Core *(5 sessions)*

Use this same template for each — swap the TASK line only:

```
Read PROGRESS_LOG.md — continue from where it left off.
Types reference: src/types/database.ts (already generated)
Design tokens and fonts: [paste from Section 2 above]

TASK: [ONE of the following per session]
1. Home page — hero banner, horizontal shop-by-category scroll, new arrivals grid, 
   editorial collection banner, best-sellers grid, newsletter signup strip
2. Category navigation + product listing page with filter bottom-sheet (mobile) / 
   sidebar (desktop), sort dropdown
3. Product detail page — swipeable image gallery (mobile), size/color selection, 
   stock display, sticky bottom "Add to Cart" bar on mobile
4. Wishlist toggle button (heart icon on product cards) + dedicated wishlist page
5. Global search with debounced query + product recommendations block on product detail

Mobile-first: build and verify at 375px width first, then scale up to desktop.
Do not modify files outside the scope of this task.

ACCEPTANCE CRITERIA: [specific to task — e.g., "grid shows 2 cols mobile, 4 cols desktop, 
filters open as bottom sheet under 768px"]

Before finishing, update PROGRESS_LOG.md.
```

---

### Phase 3 — Cart & Checkout *(4 sessions)*

```
Read PROGRESS_LOG.md — continue from where it left off.

Session 1 — Cart drawer/page: add/remove/update quantity, price 
summary, slide-in drawer on both mobile and desktop, uses Zustand store.

Session 2 — Coupon validation function: pure logic, takes cart total + 
coupon code, returns discount or error. No UI.

Session 3 — Checkout flow: address selection/entry form, order 
review screen, mobile-first single-column layout.

Session 4 — Razorpay integration: create order, verify payment signature, 
write order + order_items to Supabase on success, generate order confirmation.

Before finishing each session, update PROGRESS_LOG.md.
```

---

### Phase 4 — Customer Account *(2 sessions)*
```
Session 1: Profile management, saved addresses (add/edit/delete/set default), password change.
Session 2: Order history list + order tracking detail page (status timeline + tracking ID).
Mobile-first, white/grey design tokens and fonts. Update PROGRESS_LOG.md after each.
```

---

### Phase 5 — Admin: Products & Inventory *(4 sessions)*
```
Session 1: Admin dashboard shell — nav, overview stat cards (revenue, orders, low stock count).
Session 2: Product CRUD — add/edit/delete, multi-image upload to Supabase Storage.
Session 3: Variant management — size/color/stock per SKU, inline editing table.
Session 4: Low-stock/out-of-stock alert logic + query functions.
Update PROGRESS_LOG.md after each.
```

---

### Phase 6 — Admin: Orders & Customers *(3 sessions)*
```
Session 1: Order list, status update dropdown, tracking ID assignment field.
Session 2: Cancellation/return handling flow.
Session 3: Customer database table + purchase history drill-down.
Update PROGRESS_LOG.md after each.
```

---

### Phase 7 — Sales Reports *(2 sessions)*
```
Session 1: SQL aggregation queries — daily/weekly/monthly/annual sales, 
product performance, category performance. Pure query functions, no UI.
Session 2: Report dashboard UI consuming those functions + CSV export.
Update PROGRESS_LOG.md after each.
```

---

### Phase 8 — Polish, SEO, Testing *(3 sessions)*
```
Session 1: Mobile responsiveness audit pass across all pages at 375px, 768px, 1440px.
Session 2: Basic SEO — meta tags, sitemap.xml, OG tags per product page.
Session 3: Cross-browser QA + bug fix pass (log bugs found in PROGRESS_LOG.md as a checklist first).
```

---

### Phase 9 — Deployment *(1 session)*
```
Vercel deploy config, production env vars, Supabase production RLS re-check, 
admin training doc. Final PROGRESS_LOG.md entry marks project complete.
```

---

## 6. Suggested Priority Order (if credits run out before everything's built)

1. Phase 0 → 1 → 2 — demoable storefront, even without checkout
2. Phase 5 (product CRUD) — real data instead of dummy data
3. Phase 3 — revenue-critical checkout path
4. Phase 4 → 6 → 7
5. Phase 8 → 9 last

---

**Prepared for:** Zenphire Collections
**Prepared by:** Saran Kathiravan, Freelance Web Developer
