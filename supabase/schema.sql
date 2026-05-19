-- GoEast.ai Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- Profiles table: one row per auth user
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Subscriptions table: linked to user profile
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creem_subscription_id text unique,
  creem_customer_id text,
  customer_email text,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'cancelled', 'expired', 'past_due')),
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_creem_id on public.subscriptions(creem_subscription_id);
create index idx_subscriptions_customer_email on public.subscriptions(customer_email);

-- ============================================
-- Row Level Security
-- ============================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ============================================
-- Triggers: auto-create profile + subscription on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status)
  values (new.id, 'inactive');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ============================================
-- Function: link orphaned subscriptions on login
-- ============================================
create or replace function public.link_orphaned_subscriptions()
returns trigger as $$
begin
  update public.subscriptions
  set user_id = new.id
  where customer_email = new.email
    and user_id is null;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_link_subs
  after insert on public.profiles
  for each row execute procedure public.link_orphaned_subscriptions();
