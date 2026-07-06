-- Zenphire Collections — Database Schema and RLS Policies

-- Enable uuid-ossp if not already enabled
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------
-- 0. CUSTOM TYPES & ROLES
-- -------------------------------------------------------------
create type user_role as enum ('customer', 'admin');

-- -------------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- -------------------------------------------------------------

-- profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  phone text,
  dob date,
  gender text,
  role user_role not null default 'customer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  parent_category_id uuid references public.categories(id) on delete set null,
  size_guide_html text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- products
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  base_price numeric(10, 2) not null check (base_price >= 0),
  is_active boolean default true not null,
  size_guide_type text not null default 'category',
  custom_size_guide_html text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- product_variants
create table public.product_variants (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  size text not null, -- e.g., 'XS', 'S', 'M', 'L', 'XL'
  color text not null,
  stock_qty integer not null check (stock_qty >= 0),
  sku text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- product_images
create table public.product_images (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  url text not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- addresses
create table public.addresses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  recipient_name text not null,
  phone_primary text not null,
  phone_secondary text,
  line1 text not null,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- cart_items
create table public.cart_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  variant_id uuid references public.product_variants(id) on delete cascade not null,
  quantity integer not null check (quantity > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, variant_id)
);

-- wishlist_items
create table public.wishlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, product_id)
);

-- orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total numeric(10, 2) not null check (total >= 0),
  address_id uuid references public.addresses(id) on delete set null,
  tracking_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- order_items
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric(10, 2) not null check (price_at_purchase >= 0)
);

-- coupons
create table public.coupons (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  value numeric(10, 2) not null check (value >= 0),
  expiry timestamp with time zone not null,
  min_order_value numeric(10, 2) default 0.00 check (min_order_value >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- reviews
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- -------------------------------------------------------------
-- 2. INDEXES FOR PERFORMANCE
-- -------------------------------------------------------------
create index idx_products_category on public.products(category_id);
create index idx_product_variants_product on public.product_variants(product_id);
create index idx_product_images_product on public.product_images(product_id);
create index idx_cart_items_user on public.cart_items(user_id);
create index idx_wishlist_items_user on public.wishlist_items(user_id);
create index idx_orders_user on public.orders(user_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_reviews_product on public.reviews(product_id);


-- -------------------------------------------------------------
-- 3. TRIGGERS & FUNCTIONS
-- -------------------------------------------------------------

-- Trigger function to automatically create a profile for a new auth user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Trigger function to ensure only one address is set as default per user
create or replace function public.handle_default_address()
returns trigger as $$
begin
  if new.is_default = true then
    update public.addresses
    set is_default = false
    where user_id = new.user_id and id <> new.id;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create or replace trigger on_address_default_changed
  before insert or update of is_default on public.addresses
  for each row execute procedure public.handle_default_address();


-- -------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------

-- Helper function to check if the current user is an admin
-- Defined as SECURITY DEFINER to query the profiles table bypassing RLS (prevents circular recursion)
create or replace function public.is_admin()
returns boolean as $$
begin
  return coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
end;
$$ language plpgsql security definer set search_path = public;


-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;
alter table public.reviews enable row level security;


-- Profiles policies
create policy "Allow users to read own profile or admin to read all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Allow users to update own profile or admin to update all"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

create policy "Allow admin full access to profiles"
  on public.profiles for all
  using (public.is_admin());


-- Categories policies (Everyone read; Admin write)
create policy "Allow public read access to categories"
  on public.categories for select
  using (true);

create policy "Allow admin full access to categories"
  on public.categories for all
  using (public.is_admin());


-- Products policies (Everyone read active; Admin write)
create policy "Allow public read access to active products"
  on public.products for select
  using (is_active = true or public.is_admin());

create policy "Allow admin full access to products"
  on public.products for all
  using (public.is_admin());


-- Product Variants policies (Everyone read if parent active; Admin write)
create policy "Allow public read access to variants of active products"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products
      where products.id = product_variants.product_id
      and (products.is_active = true or public.is_admin())
    )
  );

create policy "Allow admin full access to product variants"
  on public.product_variants for all
  using (public.is_admin());


-- Product Images policies (Everyone read if parent active; Admin write)
create policy "Allow public read access to images of active products"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
      and (products.is_active = true or public.is_admin())
    )
  );

create policy "Allow admin full access to product images"
  on public.product_images for all
  using (public.is_admin());


-- Addresses policies (User read/write own; Admin full access)
create policy "Allow users to read own addresses"
  on public.addresses for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Allow users to insert own addresses"
  on public.addresses for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update own addresses"
  on public.addresses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow users to delete own addresses"
  on public.addresses for delete
  using (auth.uid() = user_id);


-- Cart Items policies (User read/write own; Admin full access)
create policy "Allow users to read own cart items"
  on public.cart_items for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Allow users to insert own cart items"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update own cart items"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow users to delete own cart items"
  on public.cart_items for delete
  using (auth.uid() = user_id);


-- Wishlist Items policies (User read/write own; Admin full access)
create policy "Allow users to read own wishlist items"
  on public.wishlist_items for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Allow users to insert own wishlist items"
  on public.wishlist_items for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update own wishlist items"
  on public.wishlist_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow users to delete own wishlist items"
  on public.wishlist_items for delete
  using (auth.uid() = user_id);


-- Orders policies (User read own/insert own; Admin full access)
create policy "Allow users to read own orders"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Allow users to place own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Allow admin full access to orders"
  on public.orders for all
  using (public.is_admin());


-- Order Items policies (User read own items/insert own items; Admin full access)
create policy "Allow users to read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Allow users to insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

create policy "Allow admin full access to order items"
  on public.order_items for all
  using (public.is_admin());


-- Coupons policies (Everyone read if active; Admin full access)
create policy "Allow public read access to active coupons"
  on public.coupons for select
  using (expiry > now() or public.is_admin());

create policy "Allow admin full access to coupons"
  on public.coupons for all
  using (public.is_admin());


-- Reviews policies (Everyone read; Customer insert own; Customer/Admin delete/update)
create policy "Allow public read access to reviews"
  on public.reviews for select
  using (true);

create policy "Allow authenticated users to insert reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Allow users to update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "Allow users to delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id or public.is_admin());
