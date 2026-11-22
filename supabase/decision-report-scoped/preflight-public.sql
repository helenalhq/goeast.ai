-- Read-only before the target QA role exists. Run only on the confirmed project
-- as the authorized DBA. Lists object identifiers, never table rows or secrets.
-- Zero rows is necessary, not sufficient; the migration checks effective
-- privileges on the new role, and the runtime checks its actual session.
with accessible as (
  select n.oid,n.nspname from pg_namespace n
  where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  and exists (
    select 1 from aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
    where a.grantee=0 and a.privilege_type='USAGE'
  )
), blockers as (
  select 'name-already-exists' as reason, 'goeast_p1_qa' as object_name
  where to_regnamespace('goeast_p1_qa') is not null or to_regrole('goeast_p1_qa') is not null
  union all
  select 'other-database-public-connect', d.datname
  from pg_database d
  where d.datname<>current_database() and d.datallowconn and not d.datistemplate
  and exists (
    select 1 from aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a
    where a.grantee=0 and a.privilege_type='CONNECT'
  )
  union all
  select 'public-create-in-database', d.datname
  from pg_database d
  where d.datname=current_database()
  and exists (
    select 1 from aclexplode(coalesce(d.datacl,acldefault('d',d.datdba))) a
    where a.grantee=0 and a.privilege_type='CREATE'
  )
  union all
  select 'public-create-in-schema', n.nspname
  from pg_namespace n
  where exists (
    select 1 from aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
    where a.grantee=0 and a.privilege_type='CREATE'
  )
  union all
  select 'public-relation-privilege', format('%I.%I', n.nspname,c.relname)
  from pg_class c join accessible n on n.oid=c.relnamespace
  where c.relkind in ('r','p','v','m','f','S') and (
    exists (select 1 from aclexplode(c.relacl) a where a.grantee=0)
    or exists (
      select 1 from pg_attribute col cross join lateral aclexplode(col.attacl) a
      where col.attrelid=c.oid and col.attnum>0 and not col.attisdropped and a.grantee=0
    )
  )
  union all
  select 'public-execute-security-definer', format('%I.%I(%s)', n.nspname,p.proname,pg_get_function_identity_arguments(p.oid))
  from pg_proc p join accessible n on n.oid=p.pronamespace
  where p.prosecdef and exists (
    select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE'
  )
)
select reason,object_name from blockers order by reason,object_name;
