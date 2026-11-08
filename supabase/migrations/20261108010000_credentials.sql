-- 세이프랜딩: 자격증·교육 기록 (기획서 4.5, 8장 credentials, 화면 9)
-- 자격증: 준비 중 → 필기 합격 → 최종 취득 / 교육: 수강 예정 → 이수 완료

create type public.credential_kind as enum ('certificate', 'training');
create type public.credential_status as enum ('preparing', 'written_passed', 'acquired', 'planned', 'completed');

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.credential_kind not null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  status public.credential_status not null,
  exam_date date,      -- 시험일 또는 교육일
  acquired_date date,  -- 취득일 또는 이수일
  memo text not null default '' check (char_length(memo) <= 1000),
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 구분과 상태가 맞아야 한다.
  check (
    (kind = 'certificate' and status in ('preparing', 'written_passed', 'acquired'))
    or (kind = 'training' and status in ('planned', 'completed'))
  ),
  -- 취득일·이수일은 끝난 뒤에만 쓴다.
  check (acquired_date is null or status in ('acquired', 'completed'))
);
create index credentials_user_idx on public.credentials (user_id, created_at desc);

create trigger credentials_touch before update on public.credentials
  for each row execute function private.touch_updated_at();

-- 권한: 비로그인(anon)은 아무것도 못 한다. user_id는 로그인한 본인으로만 들어간다.
revoke all on table public.credentials from public, anon, authenticated;
grant select, delete on table public.credentials to authenticated;
grant insert (kind, name, status, exam_date, acquired_date, memo, visibility) on table public.credentials to authenticated;
grant update (kind, name, status, exam_date, acquired_date, memo, visibility) on table public.credentials to authenticated;

alter table public.credentials enable row level security;

-- 본인은 전부, 다른 회원은 공개(club)인 것만 읽는다.
create policy "본인 기록이나 공개 기록을 읽는다" on public.credentials for select to authenticated
  using ((select private.is_member()) and (user_id = (select auth.uid()) or visibility = 'club'));
create policy "본인 기록만 만든다" on public.credentials for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()));
create policy "본인 기록만 고친다" on public.credentials for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_member()))
  with check (user_id = (select auth.uid()) and (select private.is_member()));
create policy "본인 기록만 지운다" on public.credentials for delete to authenticated
  using (user_id = (select auth.uid()));
