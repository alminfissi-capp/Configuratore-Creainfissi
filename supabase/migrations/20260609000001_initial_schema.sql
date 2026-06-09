-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES: one row per authenticated user (created via trigger)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- PRODUCT MAPPINGS: maps Shopify product ID → React template + pricing config
create table public.product_mappings (
  shopify_product_id   text primary key,
  category_template    text not null,
  display_name         text not null,
  base_price_sqm       numeric(10,2) not null check (base_price_sqm > 0),
  allowed_options_json jsonb not null default '{}',
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);

-- PRICING RULES: modifiers applied on top of base price
create table public.pricing_rules (
  id                 uuid primary key default uuid_generate_v4(),
  category_template  text not null,
  attribute_key      text not null,   -- pattern: {attributeType}_{attributeValue}  e.g. "colore_grigio-antracite"
  price_modifier     numeric(10,2) not null,
  modifier_type      text not null default 'fixed' check (modifier_type in ('fixed', 'percentage')),
  created_at         timestamptz not null default now(),
  unique (category_template, attribute_key)
);

-- QUOTES: one quote groups multiple configured items
create table public.quotes (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  status                 text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRED', 'ORDERED')),
  total_price            numeric(10,2) not null default 0,
  expires_at             timestamptz not null default (now() + interval '5 days'),
  shopify_draft_order_id text,
  shopify_invoice_url    text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- QUOTE ITEMS: individual configured products inside a quote
create table public.quote_items (
  id                   uuid primary key default uuid_generate_v4(),
  quote_id             uuid not null references public.quotes(id) on delete cascade,
  shopify_product_id   text not null references public.product_mappings(shopify_product_id),
  category_template    text not null,
  configuration_json   jsonb not null,
  item_price           numeric(10,2) not null check (item_price >= 0),
  created_at           timestamptz not null default now()
);

-- TRIGGER: auto-create profile row when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Index for common query patterns
create index idx_quotes_user_status on public.quotes(user_id, status);
create index idx_quote_items_quote_id on public.quote_items(quote_id);
create index idx_pricing_rules_category on public.pricing_rules(category_template);
