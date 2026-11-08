-- 세이프랜딩: 선배 아카이브 (기획서 4.6, 8장 posts·comments, 화면 11·12)
-- 익명 글의 작성자 정보가 일반 회원에게 내려가지 않도록, 일반 회원은 posts·comments 테이블을 직접 읽거나 쓰지 못하고
-- 아래 서버 함수(security definer)로만 다룬다. 함수 안에서 회원 여부·숨김·익명을 직접 확인한다.

create type public.post_board as enum ('review', 'qna', 'tip'); -- 합격 후기 / 질문 / 진로·준비 팁

create table public.posts (
  id bigint generated always as identity primary key,
  author_id uuid references public.profiles (id) on delete set null, -- 탈퇴하면 비운다 ("탈퇴한 회원")
  board public.post_board not null,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  is_anonymous boolean not null default false,
  is_hidden boolean not null default false,
  company text check (company is null or char_length(btrim(company)) between 1 and 100),
  job text check (job is null or char_length(btrim(job)) between 1 and 100),
  applied_at text check (applied_at is null or char_length(btrim(applied_at)) between 1 and 30), -- 예: 2027 상반기
  result text check (result is null or char_length(btrim(result)) between 1 and 30),
  is_answered boolean not null default false,
  share_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 후기에만 회사·직무·시기·결과가 있고, 후기는 회사·직무와 공개 동의가 꼭 있어야 한다. 답변 완료는 질문에만.
  check (board = 'review' or (company is null and job is null and applied_at is null and result is null)),
  check (board <> 'review' or (company is not null and job is not null and share_consent)),
  check (board = 'qna' or not is_answered)
);
create index posts_board_idx on public.posts (board, created_at desc);
create index posts_author_idx on public.posts (author_id);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  is_anonymous boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

create trigger posts_touch before update on public.posts
  for each row execute function private.touch_updated_at();

-- 권한: 아무도 테이블을 직접 읽거나 쓰지 못한다. RLS도 켜 두고 규칙은 만들지 않는다 (함수만 통로).
revoke all on table public.posts, public.comments from public, anon, authenticated;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- 보조: 회원이면서 (숨김이 아니거나 관리자·작성자) 인 글만 본다. 함수 안에서만 쓴다.
create function private.can_read_post(p_hidden boolean, p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_member() and (not p_hidden or private.is_admin() or p_author = (select auth.uid()));
$$;
revoke execute on function private.can_read_post(boolean, uuid) from public;

-- ===== 읽기 =====

create function public.list_posts(p_board public.post_board, p_limit int default 50)
returns table (
  id bigint, board public.post_board, title text, company text, job text, applied_at text, result text,
  is_answered boolean, is_anonymous boolean, is_hidden boolean,
  author_name text, author_cohort smallint, is_mine boolean, is_withdrawn boolean,
  comment_count bigint, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.board, p.title, p.company, p.job, p.applied_at, p.result,
         p.is_answered, p.is_anonymous, p.is_hidden,
         case when not p.is_anonymous or private.is_admin() then a.name end,
         case when not p.is_anonymous or private.is_admin() then a.cohort end,
         coalesce(p.author_id = (select auth.uid()), false),
         p.author_id is null,
         (select count(*) from public.comments c
          where c.post_id = p.id and (not c.is_hidden or private.is_admin() or c.author_id = (select auth.uid()))),
         p.created_at
  from public.posts p
  left join public.profiles a on a.id = p.author_id
  where p.board = p_board and private.can_read_post(p.is_hidden, p.author_id)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create function public.get_post(p_id bigint)
returns table (
  id bigint, board public.post_board, title text, body text, company text, job text, applied_at text, result text,
  is_answered boolean, is_anonymous boolean, is_hidden boolean, share_consent boolean,
  author_name text, author_cohort smallint, is_mine boolean, is_withdrawn boolean,
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.board, p.title, p.body, p.company, p.job, p.applied_at, p.result,
         p.is_answered, p.is_anonymous, p.is_hidden, p.share_consent,
         case when not p.is_anonymous or private.is_admin() then a.name end,
         case when not p.is_anonymous or private.is_admin() then a.cohort end,
         coalesce(p.author_id = (select auth.uid()), false),
         p.author_id is null,
         p.created_at, p.updated_at
  from public.posts p
  left join public.profiles a on a.id = p.author_id
  where p.id = p_id and private.can_read_post(p.is_hidden, p.author_id);
$$;

create function public.list_comments(p_post_id bigint)
returns table (
  id bigint, body text, is_anonymous boolean, is_hidden boolean,
  author_name text, author_cohort smallint, is_mine boolean, is_withdrawn boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.body, c.is_anonymous, c.is_hidden,
         case when not c.is_anonymous or private.is_admin() then a.name end,
         case when not c.is_anonymous or private.is_admin() then a.cohort end,
         coalesce(c.author_id = (select auth.uid()), false),
         c.author_id is null,
         c.created_at
  from public.comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles a on a.id = c.author_id
  where c.post_id = p_post_id
    and private.can_read_post(p.is_hidden, p.author_id)
    and (not c.is_hidden or private.is_admin() or c.author_id = (select auth.uid()))
  order by c.created_at, c.id;
$$;

-- ===== 쓰기 =====

create function public.create_post(
  p_board public.post_board, p_title text, p_body text, p_is_anonymous boolean,
  p_company text, p_job text, p_applied_at text, p_result text, p_share_consent boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not private.is_member() then
    raise exception '승인된 회원만 글을 쓸 수 있습니다.' using errcode = '42501';
  end if;
  if p_board = 'review' and not coalesce(p_share_consent, false) then
    raise exception '합격 자소서·후기는 동아리원에게 공개하는 데 동의해야 올릴 수 있습니다.' using errcode = '22023';
  end if;
  insert into public.posts (author_id, board, title, body, is_anonymous, company, job, applied_at, result, share_consent)
  values (
    (select auth.uid()), p_board, p_title, p_body, coalesce(p_is_anonymous, false),
    case when p_board = 'review' then p_company end, case when p_board = 'review' then p_job end,
    case when p_board = 'review' then p_applied_at end, case when p_board = 'review' then p_result end,
    p_board = 'review'
  )
  returning posts.id into new_id;
  return new_id;
end;
$$;

-- 수정은 작성자만. 게시판은 바꿀 수 없다.
create function public.update_post(
  p_id bigint, p_title text, p_body text, p_is_anonymous boolean,
  p_company text, p_job text, p_applied_at text, p_result text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member() then
    raise exception '승인된 회원만 글을 고칠 수 있습니다.' using errcode = '42501';
  end if;
  update public.posts
  set title = p_title, body = p_body, is_anonymous = coalesce(p_is_anonymous, false),
      company = case when board = 'review' then p_company end, job = case when board = 'review' then p_job end,
      applied_at = case when board = 'review' then p_applied_at end, result = case when board = 'review' then p_result end
  where id = p_id and author_id = (select auth.uid());
  if not found then
    raise exception '고칠 수 없는 글입니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- 삭제는 작성자와 관리자.
create function public.delete_post(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member() then
    raise exception '승인된 회원만 쓸 수 있습니다.' using errcode = '42501';
  end if;
  delete from public.posts where id = p_id and (author_id = (select auth.uid()) or private.is_admin());
  if not found then
    raise exception '지울 수 없는 글입니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- 숨기기는 관리자만.
create function public.set_post_hidden(p_id bigint, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 글을 숨길 수 있습니다.' using errcode = '42501';
  end if;
  update public.posts set is_hidden = coalesce(p_hidden, false) where id = p_id;
  if not found then
    raise exception '글을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- 질문 게시판의 답변 완료 표시는 질문한 사람(또는 관리자).
create function public.set_post_answered(p_id bigint, p_answered boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member() then
    raise exception '승인된 회원만 쓸 수 있습니다.' using errcode = '42501';
  end if;
  update public.posts set is_answered = coalesce(p_answered, false)
  where id = p_id and board = 'qna' and (author_id = (select auth.uid()) or private.is_admin());
  if not found then
    raise exception '바꿀 수 없는 글입니다.' using errcode = 'P0002';
  end if;
end;
$$;

create function public.create_comment(p_post_id bigint, p_body text, p_is_anonymous boolean)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id bigint;
begin
  if not exists (
    select 1 from public.posts p where p.id = p_post_id and private.can_read_post(p.is_hidden, p.author_id)
  ) then
    raise exception '댓글을 쓸 수 없는 글입니다.' using errcode = 'P0002';
  end if;
  insert into public.comments (post_id, author_id, body, is_anonymous)
  values (p_post_id, (select auth.uid()), p_body, coalesce(p_is_anonymous, false))
  returning comments.id into new_id;
  return new_id;
end;
$$;

create function public.delete_comment(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member() then
    raise exception '승인된 회원만 쓸 수 있습니다.' using errcode = '42501';
  end if;
  delete from public.comments where id = p_id and (author_id = (select auth.uid()) or private.is_admin());
  if not found then
    raise exception '지울 수 없는 댓글입니다.' using errcode = 'P0002';
  end if;
end;
$$;

create function public.set_comment_hidden(p_id bigint, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception '관리자만 댓글을 숨길 수 있습니다.' using errcode = '42501';
  end if;
  update public.comments set is_hidden = coalesce(p_hidden, false) where id = p_id;
  if not found then
    raise exception '댓글을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
end;
$$;

-- 탈퇴할 때 "글·댓글 지우기"를 고른 경우, 본인이 쓴 글과 댓글을 모두 지운다. (남기기를 고르면 계정 삭제 때 작성자만 비워진다)
create function public.delete_my_archive()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.posts where author_id = (select auth.uid());
  delete from public.comments where author_id = (select auth.uid());
end;
$$;

revoke execute on function
  public.list_posts(public.post_board, int),
  public.get_post(bigint),
  public.list_comments(bigint),
  public.create_post(public.post_board, text, text, boolean, text, text, text, text, boolean),
  public.update_post(bigint, text, text, boolean, text, text, text, text),
  public.delete_post(bigint),
  public.set_post_hidden(bigint, boolean),
  public.set_post_answered(bigint, boolean),
  public.create_comment(bigint, text, boolean),
  public.delete_comment(bigint),
  public.set_comment_hidden(bigint, boolean),
  public.delete_my_archive()
from public, anon;

grant execute on function
  public.list_posts(public.post_board, int),
  public.get_post(bigint),
  public.list_comments(bigint),
  public.create_post(public.post_board, text, text, boolean, text, text, text, text, boolean),
  public.update_post(bigint, text, text, boolean, text, text, text, text),
  public.delete_post(bigint),
  public.set_post_hidden(bigint, boolean),
  public.set_post_answered(bigint, boolean),
  public.create_comment(bigint, text, boolean),
  public.delete_comment(bigint),
  public.set_comment_hidden(bigint, boolean),
  public.delete_my_archive()
to authenticated;
