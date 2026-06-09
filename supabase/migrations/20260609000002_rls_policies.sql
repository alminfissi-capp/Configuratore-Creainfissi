-- Helper function: check if current user is admin — SECURITY DEFINER bypasses RLS
-- to avoid recursive policy evaluation on the profiles table itself.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.product_mappings enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- ── PROFILES ──
-- Users can read and update their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles (uses is_admin() to avoid recursive RLS on profiles)
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

-- ── PRODUCT MAPPINGS ──
-- Public read (anyone can see available products/templates)
create policy "product_mappings: public read"
  on public.product_mappings for select
  using (true);

-- Only admins can write
create policy "product_mappings: admin write"
  on public.product_mappings for all
  using (public.is_admin());

-- ── PRICING RULES ──
-- Public read (needed by frontend price calculator)
create policy "pricing_rules: public read"
  on public.pricing_rules for select
  using (true);

-- Only admins can write
create policy "pricing_rules: admin write"
  on public.pricing_rules for all
  using (public.is_admin());

-- ── QUOTES ──
-- Users can read their own quotes
create policy "quotes: own read"
  on public.quotes for select
  using (auth.uid() = user_id);

-- Users can create quotes for themselves
create policy "quotes: own insert"
  on public.quotes for insert
  with check (auth.uid() = user_id);

-- Users can update their own ACTIVE quotes
create policy "quotes: own update active"
  on public.quotes for update
  using (auth.uid() = user_id and status = 'ACTIVE');

-- Admins can read all quotes
create policy "quotes: admin read all"
  on public.quotes for select
  using (public.is_admin());

-- ── QUOTE ITEMS ──
-- Users can read items belonging to their quotes
create policy "quote_items: own read"
  on public.quote_items for select
  using (
    exists (
      select 1 from public.quotes
      where id = quote_id and user_id = auth.uid()
    )
  );

-- Users can insert items into their own quotes
create policy "quote_items: own insert"
  on public.quote_items for insert
  with check (
    exists (
      select 1 from public.quotes
      where id = quote_id and user_id = auth.uid() and status = 'ACTIVE'
    )
  );

-- Admins can read all quote items
create policy "quote_items: admin read all"
  on public.quote_items for select
  using (public.is_admin());
