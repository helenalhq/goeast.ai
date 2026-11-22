-- Run only on a new, dedicated QA Supabase project. Not part of the main migration chain.
begin;
do $$
begin
  if to_regclass('public.subscriptions') is not null or to_regclass('public.consult_results') is not null then
    raise exception 'Decision-report migration refuses an existing GoEast app database';
  end if;
end $$;

create table public.decision_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  cast_hash text not null check (cast_hash ~ '^[a-f0-9]{64}$'),
  capture jsonb not null,
  mode text not null check (mode in ('mock','test')),
  product_id text not null,
  amount integer not null default 199 check (amount = 199),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending' check (status in ('pending','paid','generating','delivered','refunded')),
  checkout_id text,
  checkout_url text,
  provider_order_id text,
  transaction_id text,
  generation_token uuid,
  generation_expires timestamptz,
  report_id uuid unique,
  report jsonb,
  action_note text check (length(action_note) <= 500),
  created_at timestamptz not null default now(),
  unique (owner_id, cast_hash, mode),
  unique (mode, checkout_id),
  unique (mode, provider_order_id),
  unique (mode, transaction_id)
);
create index decision_orders_owner_recent on public.decision_orders(owner_id, mode, created_at desc);

create table public.decision_refund_tombstones (
  mode text not null check (mode in ('mock','test')),
  provider_order_id text not null,
  transaction_id text not null,
  recorded_at timestamptz not null default now(),
  primary key (mode, provider_order_id),
  unique (mode, transaction_id)
);

alter table public.decision_orders enable row level security;
alter table public.decision_refund_tombstones enable row level security;
revoke all on public.decision_orders, public.decision_refund_tombstones from PUBLIC, anon, authenticated, service_role;
grant select, insert, update on public.decision_orders to service_role;

create function public.decision_record_payment(p_id uuid, p_mode text, p_product text, p_checkout text, p_order text, p_tx text)
returns text language plpgsql security definer set search_path='' as $$
declare
  r public.decision_orders;
  t public.decision_refund_tombstones;
begin
  -- Both refund and payment serialize by mode + provider order, even when the
  -- refund reaches us before the checkout can link its provider order ID.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_order, 0));
  select * into r from public.decision_orders where id=p_id for update;
  if not found or r.mode <> p_mode or r.product_id <> p_product or r.checkout_id is distinct from p_checkout then
    return 'invalid';
  end if;
  if r.status <> 'pending' then
    return case when r.provider_order_id=p_order and
      (p_tx is null or r.transaction_id is null or r.transaction_id=p_tx)
      then 'duplicate' else 'invalid' end;
  end if;
  select * into t from public.decision_refund_tombstones where mode=p_mode and provider_order_id=p_order;
  if found then
    if p_tx is not null and t.transaction_id <> p_tx then return 'invalid'; end if;
    update public.decision_orders set status='refunded', provider_order_id=p_order,
      transaction_id=t.transaction_id where id=p_id;
    return 'refund_precedes_payment';
  end if;
  update public.decision_orders set status='paid', provider_order_id=p_order, transaction_id=p_tx where id=p_id;
  return 'paid';
end $$;

create function public.decision_record_refund(p_mode text, p_order text, p_tx text)
returns text language plpgsql security definer set search_path='' as $$
declare
  r public.decision_orders;
  existing_tx text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_order, 0));
  select * into r from public.decision_orders where mode=p_mode and provider_order_id=p_order for update;
  if found and (r.transaction_id is not null and r.transaction_id <> p_tx) then return 'invalid'; end if;
  select transaction_id into existing_tx from public.decision_refund_tombstones
    where mode=p_mode and provider_order_id=p_order;
  if found then return case when existing_tx=p_tx then 'duplicate' else 'invalid' end; end if;
  insert into public.decision_refund_tombstones(mode,provider_order_id,transaction_id) values (p_mode,p_order,p_tx);
  if r.id is null then return 'recorded'; end if;
  update public.decision_orders set status='refunded', transaction_id=p_tx, report=null,
    action_note=null, generation_token=null, generation_expires=null where id=r.id;
  return 'refunded';
end $$;

create function public.decision_acquire_generation(p_id uuid, p_owner uuid, p_token uuid)
returns boolean language sql security invoker set search_path='' as $$
  with changed as (
    update public.decision_orders set status='generating', generation_token=p_token,
      generation_expires=now() + interval '90 seconds'
    where id=p_id and owner_id=p_owner and (status='paid' or
      (status='generating' and generation_expires < now()))
    returning id
  ) select exists(select 1 from changed);
$$;

create function public.decision_finish_generation(p_id uuid, p_owner uuid, p_token uuid, p_report jsonb)
returns boolean language sql security invoker set search_path='' as $$
  with changed as (
    update public.decision_orders
    set status=case when p_report is null then 'paid' else 'delivered' end,
      report_id=case when p_report is null then report_id else coalesce(report_id,gen_random_uuid()) end,
      report=p_report, generation_token=null, generation_expires=null
    where id=p_id and owner_id=p_owner and status='generating' and generation_token=p_token
    returning id
  ) select exists(select 1 from changed);
$$;

revoke all on function public.decision_record_payment(uuid,text,text,text,text,text),
  public.decision_record_refund(text,text,text), public.decision_acquire_generation(uuid,uuid,uuid),
  public.decision_finish_generation(uuid,uuid,uuid,jsonb) from PUBLIC, anon, authenticated;
grant execute on function public.decision_record_payment(uuid,text,text,text,text,text),
  public.decision_record_refund(text,text,text), public.decision_acquire_generation(uuid,uuid,uuid),
  public.decision_finish_generation(uuid,uuid,uuid,jsonb) to service_role;
commit;
