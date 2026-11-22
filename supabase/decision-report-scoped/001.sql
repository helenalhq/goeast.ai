-- MANUAL, same-project Preview QA only. See docs/decision-report-preview.md.
-- Outside all migration chains. Read/run the local fixtures before review.
-- Replace the one marked placeholder with the verified designated auth UUID.
-- The resulting role deliberately has NOLOGIN; there is no password in SQL.
begin;
create role goeast_p1_qa nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 3;
create schema goeast_p1_qa;
revoke all on schema goeast_p1_qa from PUBLIC, anon, authenticated, service_role;
do $$
declare approved uuid := 'REPLACE_WITH_DESIGNATED_AUTH_UUID';
begin
  if not exists(select 1 from auth.users where id = approved) then
    raise exception 'Designated QA user not found';
  end if;
  -- PostgreSQL privileges inherited from PUBLIC are additive. A role-specific
  -- REVOKE does not cancel them. Abort rather than edit production objects.
  if exists (
    select 1 from pg_database d
    where d.datname <> current_database() and d.datallowconn and not d.datistemplate
      and has_database_privilege('goeast_p1_qa',d.oid,'CONNECT')
  ) then raise exception 'Outside-QA database connection privilege'; end if;
  if has_database_privilege('goeast_p1_qa',current_database(),'CREATE') or exists (
    select 1 from pg_namespace n
    where n.nspname <> 'goeast_p1_qa'
      and has_schema_privilege('goeast_p1_qa',n.oid,'CREATE')
  ) then raise exception 'Outside-QA object creation privilege'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname !~ '^pg_' and n.nspname not in ('information_schema','goeast_p1_qa')
    and c.relkind in ('r','p','v','m','f','S')
    and has_schema_privilege('goeast_p1_qa',n.oid,'USAGE') and (
      case when c.relkind='S' then has_sequence_privilege('goeast_p1_qa',c.oid,'SELECT,USAGE,UPDATE')
      else has_table_privilege('goeast_p1_qa',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege('goeast_p1_qa',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') end
    )
  ) then raise exception 'Outside-QA relation privileges'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prosecdef and n.nspname not in ('pg_catalog','information_schema','goeast_p1_qa')
    and has_schema_privilege('goeast_p1_qa',n.oid,'USAGE')
    and has_function_privilege('goeast_p1_qa',p.oid,'EXECUTE')
  ) then raise exception 'Outside-QA SECURITY DEFINER privilege'; end if;
  create table goeast_p1_qa.approved_owner (id uuid primary key);
  insert into goeast_p1_qa.approved_owner values (approved);
end $$;
create table goeast_p1_qa.decision_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references goeast_p1_qa.approved_owner(id),
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
create index decision_orders_owner_recent on goeast_p1_qa.decision_orders(owner_id, mode, created_at desc);

create table goeast_p1_qa.decision_refund_tombstones (
  mode text not null check (mode in ('mock','test')),
  provider_order_id text not null,
  transaction_id text not null,
  recorded_at timestamptz not null default now(),
  primary key (mode, provider_order_id),
  unique (mode, transaction_id)
);

alter table goeast_p1_qa.decision_orders enable row level security;
alter table goeast_p1_qa.decision_refund_tombstones enable row level security;
revoke all on goeast_p1_qa.decision_orders, goeast_p1_qa.decision_refund_tombstones from PUBLIC, anon, authenticated, service_role;
create policy qa_orders on goeast_p1_qa.decision_orders for all to goeast_p1_qa using (true) with check (true);
create policy qa_refunds on goeast_p1_qa.decision_refund_tombstones for all to goeast_p1_qa using (true) with check (true);
grant usage on schema goeast_p1_qa to goeast_p1_qa;
revoke all on goeast_p1_qa.approved_owner from PUBLIC, anon, authenticated, service_role;
grant select on goeast_p1_qa.approved_owner to goeast_p1_qa;
grant select, insert, update on goeast_p1_qa.decision_orders to goeast_p1_qa;
grant select, insert on goeast_p1_qa.decision_refund_tombstones to goeast_p1_qa;

create function goeast_p1_qa.decision_record_payment(p_id uuid, p_mode text, p_product text, p_checkout text, p_order text, p_tx text)
returns text language plpgsql security invoker set search_path='' as $$
declare
  r goeast_p1_qa.decision_orders;
  t goeast_p1_qa.decision_refund_tombstones;
begin
  -- Both refund and payment serialize by mode + provider order, even when the
  -- refund reaches us before the checkout can link its provider order ID.
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_order, 0));
  select * into r from goeast_p1_qa.decision_orders where id=p_id for update;
  if not found or r.mode <> p_mode or r.product_id <> p_product or r.checkout_id is distinct from p_checkout then
    return 'invalid';
  end if;
  if r.status <> 'pending' then
    return case when r.provider_order_id=p_order and
      (p_tx is null or r.transaction_id is null or r.transaction_id=p_tx)
      then 'duplicate' else 'invalid' end;
  end if;
  select * into t from goeast_p1_qa.decision_refund_tombstones where mode=p_mode and provider_order_id=p_order;
  if found then
    if p_tx is not null and t.transaction_id <> p_tx then return 'invalid'; end if;
    update goeast_p1_qa.decision_orders set status='refunded', provider_order_id=p_order,
      transaction_id=t.transaction_id where id=p_id;
    return 'refund_precedes_payment';
  end if;
  update goeast_p1_qa.decision_orders set status='paid', provider_order_id=p_order, transaction_id=p_tx where id=p_id;
  return 'paid';
end $$;

create function goeast_p1_qa.decision_record_refund(p_mode text, p_order text, p_tx text)
returns text language plpgsql security invoker set search_path='' as $$
declare
  r goeast_p1_qa.decision_orders;
  existing_tx text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_mode || ':' || p_order, 0));
  select * into r from goeast_p1_qa.decision_orders where mode=p_mode and provider_order_id=p_order for update;
  if found and (r.transaction_id is not null and r.transaction_id <> p_tx) then return 'invalid'; end if;
  select transaction_id into existing_tx from goeast_p1_qa.decision_refund_tombstones
    where mode=p_mode and provider_order_id=p_order;
  if found then return case when existing_tx=p_tx then 'duplicate' else 'invalid' end; end if;
  insert into goeast_p1_qa.decision_refund_tombstones(mode,provider_order_id,transaction_id) values (p_mode,p_order,p_tx);
  if r.id is null then return 'recorded'; end if;
  update goeast_p1_qa.decision_orders set status='refunded', transaction_id=p_tx, report=null,
    action_note=null, generation_token=null, generation_expires=null where id=r.id;
  return 'refunded';
end $$;

create function goeast_p1_qa.decision_acquire_generation(p_id uuid, p_owner uuid, p_token uuid)
returns boolean language sql security invoker set search_path='' as $$
  with changed as (
    update goeast_p1_qa.decision_orders set status='generating', generation_token=p_token,
      generation_expires=now() + interval '90 seconds'
    where id=p_id and owner_id=p_owner and (status='paid' or
      (status='generating' and generation_expires < now()))
    returning id
  ) select exists(select 1 from changed);
$$;

create function goeast_p1_qa.decision_finish_generation(p_id uuid, p_owner uuid, p_token uuid, p_report jsonb)
returns boolean language sql security invoker set search_path='' as $$
  with changed as (
    update goeast_p1_qa.decision_orders
    set status=case when p_report is null then 'paid' else 'delivered' end,
      report_id=case when p_report is null then report_id else coalesce(report_id,gen_random_uuid()) end,
      report=p_report, generation_token=null, generation_expires=null
    where id=p_id and owner_id=p_owner and status='generating' and generation_token=p_token
    returning id
  ) select exists(select 1 from changed);
$$;

revoke all on function goeast_p1_qa.decision_record_payment(uuid,text,text,text,text,text),
  goeast_p1_qa.decision_record_refund(text,text,text), goeast_p1_qa.decision_acquire_generation(uuid,uuid,uuid),
  goeast_p1_qa.decision_finish_generation(uuid,uuid,uuid,jsonb) from PUBLIC, anon, authenticated, service_role;
grant execute on function goeast_p1_qa.decision_record_payment(uuid,text,text,text,text,text),
  goeast_p1_qa.decision_record_refund(text,text,text), goeast_p1_qa.decision_acquire_generation(uuid,uuid,uuid),
  goeast_p1_qa.decision_finish_generation(uuid,uuid,uuid,jsonb) to goeast_p1_qa;
-- Invoker-only runtime check, using the identical outside-QA privilege tests.
create function goeast_p1_qa.decision_qa_isolation_ok(p_owner uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if session_user <> 'goeast_p1_qa' or current_user <> 'goeast_p1_qa'
    or current_database() <> 'postgres' or not exists (
      select 1 from goeast_p1_qa.approved_owner where id = p_owner
    ) or exists (
      select 1 from pg_catalog.pg_auth_members m
      cross join pg_catalog.pg_namespace n
      where n.nspname='goeast_p1_qa' and (
        m.member='goeast_p1_qa'::regrole::oid
        or (
          m.roleid='goeast_p1_qa'::regrole::oid and not (
            -- PG16+ can give a non-superuser role creator ADMIN ONLY. This
            -- is not a database-access membership; never allow auth roles.
            m.member=n.nspowner and m.admin_option
            and (to_jsonb(m) ->> 'set_option')::boolean is false
            and (to_jsonb(m) ->> 'inherit_option')::boolean is false
          )
        )
      )
    ) or exists (
      select 1 from pg_catalog.pg_roles where rolname='goeast_p1_qa'
        and (rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls)
    )
    or exists (
      select 1 from pg_catalog.pg_namespace n
      cross join lateral pg_catalog.aclexplode(n.nspacl) a
      where n.nspname='goeast_p1_qa'
        and (a.grantee not in (n.nspowner, 'goeast_p1_qa'::regrole::oid)
          or (a.grantee='goeast_p1_qa'::regrole::oid and (a.privilege_type <> 'USAGE' or a.is_grantable)))
    )
  then return false; end if;
  begin
  if exists (
    select 1 from pg_database d
    where d.datname <> current_database() and d.datallowconn and not d.datistemplate
      and has_database_privilege('goeast_p1_qa',d.oid,'CONNECT')
  ) then raise exception 'Outside-QA database connection privilege'; end if;
  if has_database_privilege('goeast_p1_qa',current_database(),'CREATE') or exists (
    select 1 from pg_namespace n
    where n.nspname <> 'goeast_p1_qa'
      and has_schema_privilege('goeast_p1_qa',n.oid,'CREATE')
  ) then raise exception 'Outside-QA object creation privilege'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname !~ '^pg_' and n.nspname not in ('information_schema','goeast_p1_qa')
    and c.relkind in ('r','p','v','m','f','S')
    and has_schema_privilege('goeast_p1_qa',n.oid,'USAGE') and (
      case when c.relkind='S' then has_sequence_privilege('goeast_p1_qa',c.oid,'SELECT,USAGE,UPDATE')
      else has_table_privilege('goeast_p1_qa',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege('goeast_p1_qa',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') end
    )
  ) then raise exception 'Outside-QA relation privileges'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prosecdef and n.nspname not in ('pg_catalog','information_schema','goeast_p1_qa')
    and has_schema_privilege('goeast_p1_qa',n.oid,'USAGE')
    and has_function_privilege('goeast_p1_qa',p.oid,'EXECUTE')
  ) then raise exception 'Outside-QA SECURITY DEFINER privilege'; end if;
  exception when raise_exception then return false;
  end;
  return true;
end $$;
revoke all on function goeast_p1_qa.decision_qa_isolation_ok(uuid) from PUBLIC, anon, authenticated, service_role;
grant execute on function goeast_p1_qa.decision_qa_isolation_ok(uuid) to goeast_p1_qa;
commit;
