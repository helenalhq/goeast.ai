-- Manual additive Live migration, outside the regular migration chain.
-- Apply only after reviewed authorization and a clean read-only preflight.
-- No LOGIN, passwords, provider config, customer rows or existing ACL changes.
begin;
create role p1_live_app nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 8;
create role p1_live_callback nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 4;
create role p1_live_owner_rpc nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role p1_live_payment_rpc nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create schema goeast_p1_live;
revoke all on schema goeast_p1_live from public,anon,authenticated,authenticator,service_role;
grant usage on schema goeast_p1_live to p1_live_app,p1_live_callback,p1_live_owner_rpc,p1_live_payment_rpc;

-- Invoker only. Check all four roles' effective rights, including additive
-- PUBLIC grants. Allow only non-access governance memberships of schema owner.
create function goeast_p1_live.catalog_isolated() returns boolean language sql security invoker
set search_path=pg_catalog as $$
  with lane as (
    select oid,rolname,rolsuper,rolinherit,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolcanlogin
    from pg_roles where rolname in ('p1_live_app','p1_live_callback','p1_live_owner_rpc','p1_live_payment_rpc')
  ), lane_schema as (select oid,nspowner,nspacl from pg_namespace where nspname='goeast_p1_live')
  select current_database()='postgres' and (select count(*) from lane)=4 and exists(select from lane_schema)
    and not exists (
      select from lane r where r.rolsuper or r.rolinherit or r.rolcreatedb or r.rolcreaterole or r.rolreplication or r.rolbypassrls
        or (r.rolname in ('p1_live_owner_rpc','p1_live_payment_rpc') and r.rolcanlogin)
        or has_database_privilege(r.oid,current_database(),'CREATE')
        or exists (select from pg_database d where d.datallowconn and not d.datistemplate
          and d.datname<>current_database() and has_database_privilege(r.oid,d.oid,'CONNECT'))
        or exists (select from pg_namespace n where has_schema_privilege(r.oid,n.oid,'CREATE'))
        or exists (
          select from pg_auth_members m cross join lane_schema s where m.member=r.oid or (
            m.roleid=r.oid and not (m.member=s.nspowner and m.admin_option
              and (to_jsonb(m)->>'set_option')::boolean is false
              and (to_jsonb(m)->>'inherit_option')::boolean is false)
          )
        )
        or exists (
          select from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname !~ '^pg_' and n.nspname not in ('information_schema','goeast_p1_live')
            and c.relkind in ('r','p','v','m','f','S') and has_schema_privilege(r.oid,n.oid,'USAGE')
            and case when c.relkind='S' then has_sequence_privilege(r.oid,c.oid,'SELECT,USAGE,UPDATE')
              else has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                or has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') end
        )
        or exists (
          select from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where p.prosecdef and n.nspname !~ '^pg_' and n.nspname not in ('information_schema','goeast_p1_live')
            and has_schema_privilege(r.oid,n.oid,'USAGE') and has_function_privilege(r.oid,p.oid,'EXECUTE')
        )
    ) and not exists (
      select from lane_schema n cross join lateral aclexplode(n.nspacl) a
      where a.grantee<>n.nspowner and (a.grantee not in(select oid from lane)
        or a.privilege_type<>'USAGE' or a.is_grantable)
    ) and not exists (
      select from pg_class c cross join lane_schema n cross join lane r
      where c.relnamespace=n.oid and c.relkind in ('r','p','v','m','f','S')
        and r.rolname in ('p1_live_app','p1_live_callback') and (
          case when c.relkind='S' then has_sequence_privilege(r.oid,c.oid,'SELECT,USAGE,UPDATE')
            else has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
              or has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') end
        )
    ) and not exists (
      select from pg_proc p cross join lane_schema n
      where p.pronamespace=n.oid and (p.prosecdef and (
        exists (select from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0)
        or (p.proowner<>(select oid from lane where rolname='p1_live_owner_rpc')
          and has_function_privilege('p1_live_app',p.oid,'EXECUTE'))
        or (p.proowner<>(select oid from lane where rolname='p1_live_payment_rpc')
          and has_function_privilege('p1_live_callback',p.oid,'EXECUTE'))
      ))
    );
$$;
revoke all on function goeast_p1_live.catalog_isolated() from public,anon,authenticated,authenticator,service_role;
grant execute on function goeast_p1_live.catalog_isolated() to p1_live_app,p1_live_callback,p1_live_owner_rpc,p1_live_payment_rpc;
create function goeast_p1_live.isolation_ok() returns boolean language sql security invoker
set search_path=pg_catalog as $$
  select session_user=current_user and current_user in ('p1_live_app','p1_live_callback')
    and (select goeast_p1_live.catalog_isolated());
$$;
revoke all on function goeast_p1_live.isolation_ok() from public,anon,authenticated,authenticator,service_role;
grant execute on function goeast_p1_live.isolation_ok() to p1_live_app,p1_live_callback;

create table goeast_p1_live.decision_orders (
  id uuid primary key,
  owner_id uuid not null,
  cast_hash text not null check(cast_hash ~ '^[a-f0-9]{64}$'),
  capture jsonb not null check(jsonb_typeof(capture)='object' and octet_length(capture::text)<=32768),
  product_id text not null check(length(product_id) between 1 and 160),
  base_amount integer not null check(base_amount=199),
  currency text not null check(currency='USD'),
  status text not null default 'pending' check(status in ('pending','paid','generating','delivered','refunded')),
  checkout_id text unique,
  checkout_url text,
  provider_order_id text unique,
  transaction_id text unique,
  tax_amount integer,
  gross_amount integer,
  generation_attempts integer not null default 0 check(generation_attempts between 0 and 3),
  generation_token uuid,
  generation_expires timestamptz,
  report_id uuid unique,
  report jsonb check(report is null or (jsonb_typeof(report)='object' and octet_length(report::text)<=65536)),
  action_note text check(length(action_note)<=500),
  created_at timestamptz not null default clock_timestamp(),
  unique(owner_id,cast_hash),
  check ((checkout_id is null)=(checkout_url is null)),
  check ((status='pending')=(provider_order_id is null)),
  check ((provider_order_id is null)=(transaction_id is null)),
  check ((provider_order_id is null)=(tax_amount is null)),
  check ((provider_order_id is null)=(gross_amount is null)),
  check (tax_amount is null or (tax_amount>=0 and gross_amount::bigint=base_amount::bigint+tax_amount)),
  check ((status='generating')=(generation_token is not null)),
  check ((generation_token is null)=(generation_expires is null)),
  check ((status='delivered')=(report is not null)),
  check ((report_id is null)=(report is null)),
  check (action_note is null or status='delivered')
);
create index decision_orders_owner_recent on goeast_p1_live.decision_orders(owner_id,created_at desc,id desc);
create table goeast_p1_live.refund_tombstones (
  provider_order_id text primary key, transaction_id text unique not null, checkout_id text unique not null,
  product_id text not null,gross_amount integer not null check(gross_amount>=199)
);
create table goeast_p1_live.settlement_events (
  event_id text primary key check(length(event_id) between 1 and 160),
  kind text not null check(kind in ('payment','refund')),
  fingerprint bytea not null check(octet_length(fingerprint)=32),
  created_at timestamptz not null default clock_timestamp()
);
create table goeast_p1_live.event_reconciliation (
  event_id text primary key check(length(event_id) between 1 and 160),
  kind text not null check(kind in ('payment','refund','dispute','checkout.completed','refund.created','dispute.created')),
  provider_order_id text check(length(provider_order_id) between 1 and 160),
  transaction_id text check(length(transaction_id) between 1 and 160),
  reason text not null check(reason ~ '^[a-z0-9_-]{1,80}$'),
  created_at timestamptz not null default clock_timestamp()
);
revoke all on all tables in schema goeast_p1_live from public,anon,authenticated,authenticator,service_role;
alter table goeast_p1_live.decision_orders enable row level security;
alter table goeast_p1_live.refund_tombstones enable row level security;
alter table goeast_p1_live.event_reconciliation enable row level security;
alter table goeast_p1_live.settlement_events enable row level security;
create policy owner_rpc on goeast_p1_live.decision_orders to p1_live_owner_rpc using(true) with check(true);
create policy payment_rpc on goeast_p1_live.decision_orders to p1_live_payment_rpc using(true) with check(true);
create policy payment_rpc on goeast_p1_live.refund_tombstones to p1_live_payment_rpc using(true) with check(true);
create policy payment_rpc on goeast_p1_live.event_reconciliation to p1_live_payment_rpc using(true) with check(true);
create policy payment_rpc on goeast_p1_live.settlement_events to p1_live_payment_rpc using(true) with check(true);
grant select on goeast_p1_live.decision_orders to p1_live_owner_rpc;
grant insert(id,owner_id,cast_hash,capture,product_id,base_amount,currency),
  update(checkout_id,checkout_url,status,generation_attempts,generation_token,generation_expires,report_id,report,action_note)
  on goeast_p1_live.decision_orders to p1_live_owner_rpc;
grant select(id,owner_id,checkout_id,product_id,base_amount,currency,status,provider_order_id,transaction_id,tax_amount,gross_amount),
  update(status,provider_order_id,transaction_id,tax_amount,gross_amount,report_id,report,action_note,generation_token,generation_expires)
  on goeast_p1_live.decision_orders to p1_live_payment_rpc;
grant select,insert on goeast_p1_live.refund_tombstones,goeast_p1_live.event_reconciliation,goeast_p1_live.settlement_events to p1_live_payment_rpc;

-- User identity in these calls comes from trusted server-verified Supabase
-- Auth; parameter checks do not make the shared app credential tenant-bound.
create function goeast_p1_live.previous(p_owner uuid,p_hash text)
returns table(id uuid,status text,checkout_id text,checkout_url text)
language sql stable security definer set search_path=pg_catalog as $$
  select o.id,o.status,o.checkout_id,o.checkout_url from goeast_p1_live.decision_orders o
  where o.owner_id=p_owner and o.cast_hash=p_hash and (select goeast_p1_live.catalog_isolated());
$$;
create function goeast_p1_live.claim_checkout(p_owner uuid,p_id uuid,p_hash text,p_capture jsonb,p_product text,p_amount integer,p_currency text)
returns table(id uuid,status text,checkout_id text,checkout_url text,claimed boolean)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if not goeast_p1_live.catalog_isolated() then return; end if;
  return query insert into goeast_p1_live.decision_orders as o(id,owner_id,cast_hash,capture,product_id,base_amount,currency)
  values (p_id,p_owner,p_hash,p_capture,p_product,p_amount,p_currency)
  on conflict on constraint decision_orders_owner_id_cast_hash_key do nothing
  returning o.id,o.status,o.checkout_id,o.checkout_url,true;
  if found then return; end if;
  return query select o.id,o.status,o.checkout_id,o.checkout_url,false from goeast_p1_live.decision_orders o
    where o.owner_id=p_owner and o.cast_hash=p_hash and o.product_id=p_product and o.base_amount=p_amount and o.currency=p_currency;
end $$;
create function goeast_p1_live.attach_checkout(p_owner uuid,p_id uuid,p_checkout text,p_url text)
returns boolean language sql security definer set search_path=pg_catalog as $$
  with changed as (
    update goeast_p1_live.decision_orders o set checkout_id=p_checkout,checkout_url=p_url
    where o.owner_id=p_owner and o.id=p_id and o.status='pending' and o.checkout_id is null
      and length(p_checkout) between 1 and 160 and length(p_url)<=2048 and p_url like 'https://%'
      and (select goeast_p1_live.catalog_isolated()) returning 1
  ) select exists(select from changed);
$$;
create function goeast_p1_live.history(p_owner uuid,p_before_at timestamptz,p_before_id uuid,p_limit integer)
returns table(id uuid,status text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog as $$
  select o.id,o.status,o.created_at from goeast_p1_live.decision_orders o where o.owner_id=p_owner
    and (select goeast_p1_live.catalog_isolated()) and ((p_before_at is null and p_before_id is null) or (o.created_at,o.id)<(p_before_at,p_before_id))
  order by o.created_at desc,o.id desc limit greatest(1,least(100,coalesce(p_limit,50)));
$$;
create function goeast_p1_live.get_owned(p_owner uuid,p_id uuid)
returns table(id uuid,status text,created_at timestamptz,capture jsonb,report_id uuid,report jsonb,action_note text,generation_expires timestamptz,generation_attempts integer)
language sql stable security definer set search_path=pg_catalog as $$
  select o.id,o.status,o.created_at,o.capture,o.report_id,o.report,o.action_note,o.generation_expires,o.generation_attempts
  from goeast_p1_live.decision_orders o where o.owner_id=p_owner and o.id=p_id and (select goeast_p1_live.catalog_isolated());
$$;
create function goeast_p1_live.save_note(p_owner uuid,p_id uuid,p_note text)
returns boolean language sql security definer set search_path=pg_catalog as $$
  with changed as (
    update goeast_p1_live.decision_orders o set action_note=nullif(btrim(p_note),'')
    where o.owner_id=p_owner and o.id=p_id and o.status='delivered' and (p_note is null or length(p_note)<=500)
      and (select goeast_p1_live.catalog_isolated()) returning 1
  ) select exists(select from changed);
$$;
create function goeast_p1_live.acquire_generation(p_owner uuid,p_id uuid,p_token uuid)
returns boolean language sql security definer set search_path=pg_catalog as $$
  with changed as (
    update goeast_p1_live.decision_orders o set status='generating',generation_attempts=o.generation_attempts+1,generation_token=p_token,generation_expires=clock_timestamp()+interval '90 seconds'
    where o.id=p_id and o.owner_id=p_owner and p_token is not null and o.generation_attempts<3
      and (o.status='paid' or (o.status='generating' and o.generation_expires<clock_timestamp()))
      and (select goeast_p1_live.catalog_isolated()) returning 1
  ) select exists(select from changed);
$$;
create function goeast_p1_live.finish_generation(p_owner uuid,p_id uuid,p_token uuid,p_report jsonb)
returns boolean language sql security definer set search_path=pg_catalog as $$
  with changed as (
    update goeast_p1_live.decision_orders o set status=case when p_report is null then 'paid' else 'delivered' end,
      report_id=case when p_report is null then null else gen_random_uuid() end,report=p_report,generation_token=null,generation_expires=null
    where o.id=p_id and o.owner_id=p_owner and o.status='generating' and o.generation_token=p_token and o.generation_expires>=clock_timestamp()
      and (p_report is null or (jsonb_typeof(p_report)='object' and octet_length(p_report::text)<=65536))
      and (select goeast_p1_live.catalog_isolated()) returning 1
  ) select exists(select from changed);
$$;
create function goeast_p1_live.enqueue_event(p_event text,p_kind text,p_order text,p_tx text,p_reason text)
returns text language plpgsql security definer set search_path=pg_catalog as $$
begin
  if not goeast_p1_live.catalog_isolated() then return 'reconcile'; end if;
  if p_event is null or p_event !~ '^[A-Za-z0-9_-]{1,160}$'
    or p_kind is null or p_kind not in('payment','refund','dispute','checkout.completed','refund.created','dispute.created')
    or p_reason is null or p_reason !~ '^[a-z0-9_-]{1,80}$' then return 'reconcile'; end if;
  insert into goeast_p1_live.event_reconciliation(event_id,kind,provider_order_id,transaction_id,reason)
  values(p_event,p_kind,case when p_order ~ '^[A-Za-z0-9_-]{1,160}$' then p_order end,
    case when p_tx ~ '^[A-Za-z0-9_-]{1,160}$' then p_tx end,p_reason)
  on conflict(event_id) do nothing;
  return case when found then 'queued' else 'duplicate' end;
end $$;
create function goeast_p1_live.get_linked_payment(p_order text,p_tx text)
returns table(id uuid,owner_id uuid,checkout_id text,product_id text,mode text,status text,
  provider_order_id text,transaction_id text,gross_amount integer)
language sql stable security definer set search_path=pg_catalog as $$
  select o.id,o.owner_id,o.checkout_id,o.product_id,'live'::text,o.status,o.provider_order_id,o.transaction_id,o.gross_amount
  from goeast_p1_live.decision_orders o where o.provider_order_id=p_order and o.transaction_id=p_tx
    and (select goeast_p1_live.catalog_isolated());
$$;
create function goeast_p1_live.record_payment(p_id uuid,p_checkout text,p_product text,p_amount integer,p_currency text,
  p_order text,p_tx text,p_event text,p_tax integer,p_gross integer)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare r record; t goeast_p1_live.refund_tombstones; outcome text; v_fingerprint bytea;
begin
  if not goeast_p1_live.catalog_isolated() then return 'reconcile'; end if;
  if p_id is null or coalesce(p_checkout,'') !~ '^[A-Za-z0-9_-]{1,160}$'
    or coalesce(p_product,'') !~ '^[A-Za-z0-9_-]{1,160}$' or p_amount is distinct from 199 or p_currency is distinct from 'USD'
    or coalesce(p_order,'') !~ '^[A-Za-z0-9_-]{1,160}$' or coalesce(p_tx,'') !~ '^[A-Za-z0-9_-]{1,160}$'
    or coalesce(p_event,'') !~ '^[A-Za-z0-9_-]{1,160}$'
    or p_tax is null or p_tax<0 or p_gross is null or p_gross::bigint<>p_amount::bigint+p_tax
    then
      perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'payment_terms');
      return 'reconcile';
  end if;
  v_fingerprint:=sha256(convert_to(jsonb_build_array(p_id,p_checkout,p_product,p_amount,p_currency,p_order,p_tx,p_tax,p_gross)::text,'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended('goeast-p1-live:event:'||p_event,0));
  insert into goeast_p1_live.settlement_events(event_id,kind,fingerprint)
    values(p_event,'payment',v_fingerprint) on conflict(event_id) do nothing;
  if not exists(select from goeast_p1_live.settlement_events e
    where e.event_id=p_event and e.kind='payment' and e.fingerprint=v_fingerprint) then
      perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'event_identity_conflict');
      return 'reconcile';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('goeast-p1-live:order:'||p_order,0));
  select o.id,o.checkout_id,o.product_id,o.base_amount,o.currency,o.status,o.provider_order_id,o.transaction_id,
    o.tax_amount,o.gross_amount into r from goeast_p1_live.decision_orders o where o.id=p_id for update;
  if not found or r.checkout_id is distinct from p_checkout or r.product_id is distinct from p_product
    or r.base_amount is distinct from p_amount or r.currency is distinct from p_currency then
      perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'unbound_checkout');
      return 'reconcile';
  end if;
  if r.status<>'pending' then
    if r.provider_order_id=p_order and r.transaction_id=p_tx and r.tax_amount=p_tax and r.gross_amount=p_gross then
      return 'duplicate';
    end if;
    perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'inconsistent_payment');
    return 'reconcile';
  end if;
  select * into t from goeast_p1_live.refund_tombstones x
    where x.provider_order_id=p_order or x.checkout_id=p_checkout or x.transaction_id=p_tx
    order by (x.provider_order_id<>p_order or x.checkout_id<>p_checkout or x.transaction_id<>p_tx) desc limit 1;
  if found and (t.provider_order_id<>p_order or t.transaction_id<>p_tx or t.checkout_id<>p_checkout or t.product_id<>p_product or t.gross_amount<>p_gross) then
    perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'refund_conflict');
    return 'reconcile';
  end if;
  outcome:=case when t.provider_order_id is null then 'paid' else 'refund_precedes_payment' end;
  begin
    update goeast_p1_live.decision_orders o set status=case when outcome='paid' then 'paid' else 'refunded' end,
      provider_order_id=p_order,transaction_id=p_tx,tax_amount=p_tax,gross_amount=p_gross where o.id=p_id;
  exception when unique_violation then
    perform goeast_p1_live.enqueue_event(p_event,'payment',p_order,p_tx,'transaction_conflict');
    return 'reconcile';
  end;
  return outcome;
end $$;
create function goeast_p1_live.record_full_refund(p_order text,p_tx text,p_event text,p_product text,p_checkout text,p_gross integer)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare r record; t goeast_p1_live.refund_tombstones; v_fingerprint bytea;
begin
  if not goeast_p1_live.catalog_isolated() then return 'reconcile'; end if;
  if coalesce(p_order,'') !~ '^[A-Za-z0-9_-]{1,160}$' or coalesce(p_tx,'') !~ '^[A-Za-z0-9_-]{1,160}$'
    or coalesce(p_event,'') !~ '^[A-Za-z0-9_-]{1,160}$' or coalesce(p_product,'') !~ '^[A-Za-z0-9_-]{1,160}$'
    or (p_checkout is not null and p_checkout !~ '^[A-Za-z0-9_-]{1,160}$') or p_gross is null or p_gross<199 then
      perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'refund_terms');
      return 'reconcile';
  end if;
  -- Checkout can legitimately be absent after the signed event is linked; bind
  -- the invariant paid transaction/terms and verify any supplied checkout below.
  v_fingerprint:=sha256(convert_to(jsonb_build_array(p_order,p_tx,p_product,p_gross)::text,'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended('goeast-p1-live:event:'||p_event,0));
  insert into goeast_p1_live.settlement_events(event_id,kind,fingerprint)
    values(p_event,'refund',v_fingerprint) on conflict(event_id) do nothing;
  if not exists(select from goeast_p1_live.settlement_events e
    where e.event_id=p_event and e.kind='refund' and e.fingerprint=v_fingerprint) then
      perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'event_identity_conflict');
      return 'reconcile';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('goeast-p1-live:order:'||p_order,0));
  select o.id,o.provider_order_id,o.checkout_id,o.product_id,o.transaction_id,o.gross_amount,o.status into r
    from goeast_p1_live.decision_orders o where o.provider_order_id=p_order for update;
  if found then
    if r.transaction_id is distinct from p_tx or r.product_id is distinct from p_product or r.gross_amount is distinct from p_gross
      or (p_checkout is not null and r.checkout_id is distinct from p_checkout) then
        perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'refund_conflict');
        return 'reconcile';
    end if;
    if r.status='refunded' then return 'duplicate'; end if;
    update goeast_p1_live.decision_orders o set status='refunded',report_id=null,report=null,action_note=null,
      generation_token=null,generation_expires=null where o.id=r.id;
    return 'refunded';
  end if;
  -- Early refund: exact authoritative checkout must match a local pending intent.
  select o.id,o.product_id,o.status into r from goeast_p1_live.decision_orders o
    where o.checkout_id=p_checkout for update;
  if not found or r.product_id is distinct from p_product or r.status<>'pending' then
    perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'refund_unbound');
    return 'reconcile';
  end if;
  select * into t from goeast_p1_live.refund_tombstones x where x.provider_order_id=p_order;
  if found then
    if t.transaction_id=p_tx and t.checkout_id=p_checkout and t.product_id=p_product and t.gross_amount=p_gross then return 'duplicate'; end if;
    perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'refund_conflict');
    return 'reconcile';
  end if;
  begin
    insert into goeast_p1_live.refund_tombstones(provider_order_id,transaction_id,checkout_id,product_id,gross_amount)
      values(p_order,p_tx,p_checkout,p_product,p_gross);
  exception when unique_violation then
    perform goeast_p1_live.enqueue_event(p_event,'refund',p_order,p_tx,'refund_identity_conflict');
    return 'reconcile';
  end;
  return 'refunded';
end $$;

-- Only the migration operator can transfer function ownership. The transient
-- memberships and CREATE rights never survive the transaction. PG16+ role
-- governance has ADMIN without SET or INHERIT for a non-superuser creator.
do $roles$
declare n text;
begin
  foreach n in array array['p1_live_owner_rpc','p1_live_payment_rpc'] loop
    execute format('grant create on schema goeast_p1_live to %I',n);
    if not (select rolsuper from pg_roles where rolname=current_user) then
      if current_setting('server_version_num')::integer>=160000 then
        execute format('grant %I to %I with inherit false, set true',n,current_user);
      else
        execute format('grant %I to %I',n,current_user);
      end if;
    end if;
  end loop;
end
$roles$;
do $handoff$
declare p record; owner_role text; runtime_role text;
begin
  for p in select o.oid,o.proname,pg_get_function_identity_arguments(o.oid) as signature
    from pg_proc o join pg_namespace n on n.oid=o.pronamespace where n.nspname='goeast_p1_live' and o.prosecdef
  loop
    if p.proname in ('enqueue_event','get_linked_payment','record_payment','record_full_refund') then
      owner_role:='p1_live_payment_rpc'; runtime_role:='p1_live_callback';
    elsif p.proname in ('previous','claim_checkout','attach_checkout','history','get_owned','save_note','acquire_generation','finish_generation') then
      owner_role:='p1_live_owner_rpc'; runtime_role:='p1_live_app';
    else raise exception 'unknown storage RPC'; end if;
    execute format('revoke all on function goeast_p1_live.%I(%s) from public,anon,authenticated,authenticator,service_role,p1_live_app,p1_live_callback',p.proname,p.signature);
    execute format('grant execute on function goeast_p1_live.%I(%s) to %I',p.proname,p.signature,runtime_role);
    execute format('alter function goeast_p1_live.%I(%s) owner to %I',p.proname,p.signature,owner_role);
  end loop;
end
$handoff$;
revoke create on schema goeast_p1_live from p1_live_owner_rpc,p1_live_payment_rpc;
do $finish$
declare n text;
begin
  if not (select rolsuper from pg_roles where rolname=current_user) then
    foreach n in array array['p1_live_owner_rpc','p1_live_payment_rpc'] loop
      if current_setting('server_version_num')::integer>=160000 then
        execute format('revoke %I from %I granted by %I',n,current_user,current_user);
      else execute format('revoke %I from %I',n,current_user); end if;
    end loop;
  end if;
  if not goeast_p1_live.catalog_isolated() then raise exception 'GoEast P1 Live isolation check failed'; end if;
end
$finish$;
commit;
