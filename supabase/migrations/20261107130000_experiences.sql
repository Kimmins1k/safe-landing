-- 세이프랜딩 12월: 동아리 활동, 역량 태그·자소서 문항 유형, 경험 카드
-- 근거: 기획서.md 4.2(활동), 4.3(경험 카드), 4.4(태그·문항 유형), 6장(기본 목록), 8장(데이터 구조·접근 규칙)

create type public.activity_category as enum ('project', 'study', 'event', 'field_trip', 'contest', 'other');
create type public.experience_type as enum ('club', 'class_project', 'internship', 'part_time', 'volunteer', 'contest', 'other');
create type public.visibility as enum ('private', 'club');

-- 동아리 활동: 삭제하지 않고 숨긴다 (연결된 카드를 지키기 위해).
create table public.activities (
  id bigint generated always as identity primary key,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  semester text not null check (char_length(btrim(semester)) between 1 and 20),
  category public.activity_category not null,
  description text not null default '' check (char_length(description) <= 2000),
  is_hidden boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.competency_tags (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.question_types (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  description text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_experience_based boolean not null default true -- 경험 카드로 채우는 문항인지 (빈 부분 표시용)
);

-- 경험 카드. 임시 저장(is_draft) 중에는 유형·제목이 비어도 된다.
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id bigint references public.activities (id) on delete set null,
  type public.experience_type,
  title text not null default '' check (char_length(title) <= 100),
  start_date date,
  end_date date,
  answers jsonb not null default '[]'
    check (jsonb_typeof(answers) = 'array' and octet_length(answers::text) <= 60000),
  visibility public.visibility not null default 'private',
  is_draft boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (activity_id is null or type = 'club'),
  check (is_draft or (type is not null and char_length(btrim(title)) >= 1))
);
create index experiences_user_idx on public.experiences (user_id, updated_at desc);
create index experiences_activity_idx on public.experiences (activity_id) where activity_id is not null;

create table public.experience_question_types (
  experience_id uuid not null references public.experiences (id) on delete cascade,
  question_type_id bigint not null references public.question_types (id),
  primary key (experience_id, question_type_id)
);
create index experience_question_types_qt_idx on public.experience_question_types (question_type_id);

create table public.experience_tags (
  experience_id uuid not null references public.experiences (id) on delete cascade,
  tag_id bigint not null references public.competency_tags (id),
  primary key (experience_id, tag_id)
);
create index experience_tags_tag_idx on public.experience_tags (tag_id);

-- 수정 시각 자동 갱신
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger experiences_touch before update on public.experiences
  for each row execute function private.touch_updated_at();

-- 숨긴 활동·비활성 태그/문항 유형은 새로 고를 수 없다. 이미 연결된 것은 그대로 둔다.
create function private.check_new_links()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'experiences' then
    if new.activity_id is not null
       and (tg_op = 'INSERT' or new.activity_id is distinct from old.activity_id)
       and exists (select 1 from public.activities where id = new.activity_id and is_hidden) then
      raise exception '숨김 처리된 활동은 새로 고를 수 없습니다.' using errcode = '22023';
    end if;
  elsif tg_table_name = 'experience_question_types' then
    if not exists (select 1 from public.question_types where id = new.question_type_id and is_active) then
      raise exception '사용하지 않는 문항 유형은 고를 수 없습니다.' using errcode = '22023';
    end if;
  elsif not exists (select 1 from public.competency_tags where id = new.tag_id and is_active) then
    raise exception '사용하지 않는 역량 태그는 고를 수 없습니다.' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger experiences_check_links before insert or update of activity_id on public.experiences
  for each row execute function private.check_new_links();
create trigger experience_question_types_check before insert on public.experience_question_types
  for each row execute function private.check_new_links();
create trigger experience_tags_check before insert on public.experience_tags
  for each row execute function private.check_new_links();

-- 권한: 비로그인(anon)은 아무것도 못 한다. 목록(활동·태그·문항 유형)은 회원 읽기, 관리자만 활동을 쓴다.
revoke all on table
  public.activities, public.competency_tags, public.question_types,
  public.experiences, public.experience_question_types, public.experience_tags
from public, anon, authenticated;

grant select on table public.activities, public.competency_tags, public.question_types to authenticated;
grant insert (title, semester, category, description) on table public.activities to authenticated;
grant update (title, semester, category, description, is_hidden) on table public.activities to authenticated;

grant select, delete on table public.experiences to authenticated;
grant insert (activity_id, type, title, start_date, end_date, answers, visibility, is_draft)
  on table public.experiences to authenticated;
grant update (activity_id, type, title, start_date, end_date, answers, visibility, is_draft)
  on table public.experiences to authenticated;
grant select, insert, delete on table public.experience_question_types, public.experience_tags to authenticated;

alter table public.activities enable row level security;
alter table public.competency_tags enable row level security;
alter table public.question_types enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_question_types enable row level security;
alter table public.experience_tags enable row level security;

create policy "회원이 읽는다" on public.activities for select to authenticated
  using ((select private.is_member()));
create policy "관리자가 등록한다" on public.activities for insert to authenticated
  with check ((select private.is_admin()));
create policy "관리자가 고친다" on public.activities for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "회원이 읽는다" on public.competency_tags for select to authenticated
  using ((select private.is_member()));
create policy "회원이 읽는다" on public.question_types for select to authenticated
  using ((select private.is_member()));

-- 경험 카드: 본인은 전부, 다른 회원은 공개(club)이면서 임시 저장이 아닌 카드만 읽는다.
create policy "본인 카드나 공개 카드를 읽는다" on public.experiences for select to authenticated
  using (
    (select private.is_member())
    and (user_id = (select auth.uid()) or (visibility = 'club' and not is_draft))
  );
create policy "본인 카드만 만든다" on public.experiences for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_member()));
create policy "본인 카드만 고친다" on public.experiences for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_member()))
  with check (user_id = (select auth.uid()) and (select private.is_member()));
create policy "본인 카드만 지운다" on public.experiences for delete to authenticated
  using (user_id = (select auth.uid()));

-- 연결 표: 카드를 읽을 수 있으면 읽고, 본인 카드일 때만 바꾼다. (안쪽 조회에도 experiences 규칙이 적용된다)
create policy "읽을 수 있는 카드의 연결" on public.experience_question_types for select to authenticated
  using (exists (select 1 from public.experiences e where e.id = experience_id));
create policy "본인 카드에 연결" on public.experience_question_types for insert to authenticated
  with check (exists (select 1 from public.experiences e where e.id = experience_id and e.user_id = (select auth.uid())));
create policy "본인 카드에서 해제" on public.experience_question_types for delete to authenticated
  using (exists (select 1 from public.experiences e where e.id = experience_id and e.user_id = (select auth.uid())));

create policy "읽을 수 있는 카드의 연결" on public.experience_tags for select to authenticated
  using (exists (select 1 from public.experiences e where e.id = experience_id));
create policy "본인 카드에 연결" on public.experience_tags for insert to authenticated
  with check (exists (select 1 from public.experiences e where e.id = experience_id and e.user_id = (select auth.uid())));
create policy "본인 카드에서 해제" on public.experience_tags for delete to authenticated
  using (exists (select 1 from public.experiences e where e.id = experience_id and e.user_id = (select auth.uid())));

-- 카드 내용과 연결을 한 번에 저장한다. 호출한 사람 권한(security invoker)으로 돌아 위 규칙이 그대로 적용된다.
create function public.save_experience(
  p_id uuid,
  p_type public.experience_type,
  p_activity_id bigint,
  p_title text,
  p_start_date date,
  p_end_date date,
  p_answers jsonb,
  p_visibility public.visibility,
  p_is_draft boolean,
  p_question_type_ids bigint[],
  p_tag_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  qt bigint[] := coalesce(p_question_type_ids, '{}');
  tags bigint[] := coalesce(p_tag_ids, '{}');
begin
  if not p_is_draft and cardinality(qt) = 0 then
    raise exception '자소서 문항 유형을 하나 이상 골라 주세요.' using errcode = '22023';
  end if;

  update public.experiences
  set type = p_type, activity_id = p_activity_id, title = coalesce(p_title, ''),
      start_date = p_start_date, end_date = p_end_date, answers = coalesce(p_answers, '[]'),
      visibility = p_visibility, is_draft = p_is_draft
  where id = p_id;
  if not found then
    raise exception '경험 카드를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  delete from public.experience_question_types
  where experience_id = p_id and question_type_id <> all (qt);
  insert into public.experience_question_types (experience_id, question_type_id)
  select distinct p_id, x from unnest(qt) x
  where not exists (
    select 1 from public.experience_question_types l where l.experience_id = p_id and l.question_type_id = x
  );

  delete from public.experience_tags
  where experience_id = p_id and tag_id <> all (tags);
  insert into public.experience_tags (experience_id, tag_id)
  select distinct p_id, x from unnest(tags) x
  where not exists (select 1 from public.experience_tags l where l.experience_id = p_id and l.tag_id = x);
end;
$$;

revoke execute on function public.save_experience(
  uuid, public.experience_type, bigint, text, date, date, jsonb, public.visibility, boolean, bigint[], bigint[]
) from public, anon;
grant execute on function public.save_experience(
  uuid, public.experience_type, bigint, text, date, date, jsonb, public.visibility, boolean, bigint[], bigint[]
) to authenticated;

-- 기본 목록 (기획서 6장)
insert into public.competency_tags (name, sort_order) values
  ('안전의식·원칙 준수', 1), ('책임감', 2), ('꼼꼼함·정확성', 3), ('문제 해결', 4),
  ('현장 개선·제안', 5), ('위기 대응', 6), ('협업·팀워크', 7), ('소통', 8),
  ('리더십', 9), ('성실함·끈기', 10), ('자기관리 (체력, 교대근무 적응 등)', 11), ('학습 능력 (자격증, 전공 지식)', 12);

insert into public.question_types (name, sort_order, is_experience_based) values
  ('지원 동기', 1, false), ('입사 후 포부', 2, false), ('성격의 장단점', 3, false),
  ('협업·팀워크 경험', 4, true), ('갈등 해결 경험', 5, true), ('실패·극복 경험', 6, true),
  ('원칙·안전 준수 경험', 7, true), ('문제 해결·개선 경험', 8, true),
  ('직무 역량 (전공·자격증 활용)', 9, true), ('성장 과정·가치관', 10, false);
