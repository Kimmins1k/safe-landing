-- 세이프랜딩 1단계: 회원 정보(profiles), 가입 승인, 권한 보호
-- 근거: 기획서.md 3장(사용자와 권한), 4.1(가입·로그인), 8장(데이터 구조·접근 규칙)

-- 보조 함수는 Data API에 노출되지 않는 private 스키마에 둔다.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.member_role as enum ('pending', 'member', 'admin');
-- enrolled = 재학, on_leave = 휴학, graduated = 졸업
create type public.member_status as enum ('enrolled', 'on_leave', 'graduated');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  cohort smallint not null check (cohort between 2000 and 2100),
  status public.member_status not null default 'enrolled',
  role public.member_role not null default 'pending',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 규칙 안에서 profiles를 다시 읽으면 무한 재귀가 나므로 security definer 보조 함수로 확인한다.
create function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('member', 'admin')
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_member(), private.is_admin() from public;
grant execute on function private.is_member(), private.is_admin() to authenticated;

-- 권한: 비로그인(anon)은 아무것도 못 한다. role·consented_at은 직접 쓸 수 없다(기본값만).
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, name, cohort, status) on table public.profiles to authenticated;
grant update (name, cohort, status) on table public.profiles to authenticated;
grant select on table public.profiles to service_role; -- 정지 방지 Cron이 가볍게 읽는 용도

create policy "본인이나 승인된 회원만 읽는다"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_member()));

create policy "본인 프로필만 승인 대기로 만든다"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()) and role = 'pending');

create policy "본인이나 관리자만 고친다"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- 마지막 관리자는 권한 해제·삭제될 수 없다 (화면이 아니라 DB에서 막는다).
create function private.keep_one_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    -- 두 관리자가 동시에 서로를 해제하는 경우를 막기 위해 순서대로 처리한다.
    perform pg_advisory_xact_lock(hashtext('safe_landing_admins'));
    perform 1 from public.profiles where role = 'admin' and id <> old.id;
    if not found then
      raise exception '관리자는 최소 1명 남아 있어야 합니다.' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger profiles_keep_one_admin
  before update of role or delete on public.profiles
  for each row execute function private.keep_one_admin();

-- 관리자 전용 기능. 함수 안에서 관리자인지 직접 확인한다.
create function public.list_pending_members()
returns table (
  id uuid,
  name text,
  cohort smallint,
  status public.member_status,
  email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 볼 수 있습니다.' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.cohort, p.status, u.email::text, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'pending'
    order by p.created_at;
end;
$$;

-- 승인(pending → member), 관리자 권한 부여(→ admin)·해제(→ member)
create function public.set_member_role(target uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 권한을 바꿀 수 있습니다.' using errcode = '42501';
  end if;
  if new_role = 'pending' then
    raise exception '승인 대기로 되돌릴 수는 없습니다.' using errcode = '22023';
  end if;
  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception '회원을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- 거절: 승인 대기 신청만, 로그인 계정째 지운다 (profiles는 연쇄 삭제).
create function public.reject_member(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 거절할 수 있습니다.' using errcode = '42501';
  end if;
  delete from auth.users u
  using public.profiles p
  where u.id = p.id and p.id = target and p.role = 'pending';
  if not found then
    raise exception '승인 대기 중인 신청만 거절할 수 있습니다.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function
  public.list_pending_members(),
  public.set_member_role(uuid, public.member_role),
  public.reject_member(uuid)
from public, anon;

grant execute on function
  public.list_pending_members(),
  public.set_member_role(uuid, public.member_role),
  public.reject_member(uuid)
to authenticated;
