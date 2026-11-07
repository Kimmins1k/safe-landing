-- 세이프랜딩: 관리자 회원 관리 (기획서 4.7, 화면 15)
-- 상태(재학/휴학/졸업) 수정은 기존 규칙(관리자는 profiles 수정 가능)으로 처리하고,
-- 여기서는 회원 목록(이메일 포함)과 회원 삭제를 추가한다. 권한 부여·해제는 set_member_role을 쓴다.

create function public.list_members()
returns table (
  id uuid,
  name text,
  cohort smallint,
  status public.member_status,
  role public.member_role,
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
    select p.id, p.name, p.cohort, p.status, p.role, u.email::text, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role <> 'pending'
    order by p.role desc, p.cohort, p.name;
end;
$$;

-- 회원 삭제: 일반 회원만. 관리자는 먼저 권한을 해제해야 하고, 본인은 지울 수 없다.
-- 로그인 계정째 지운다 (profiles와 이후 회원 데이터는 연쇄 삭제).
create function public.remove_member(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 회원을 삭제할 수 있습니다.' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception '본인 계정은 여기서 삭제할 수 없습니다.' using errcode = '22023';
  end if;
  delete from auth.users u
  using public.profiles p
  where u.id = p.id and p.id = target and p.role = 'member';
  if not found then
    raise exception '일반 회원만 삭제할 수 있습니다. 관리자는 먼저 권한을 해제해 주세요.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.list_members(), public.remove_member(uuid) from public, anon;
grant execute on function public.list_members(), public.remove_member(uuid) to authenticated;
