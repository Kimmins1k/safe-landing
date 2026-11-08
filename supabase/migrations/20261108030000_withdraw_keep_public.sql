-- 탈퇴해도 동아리원 공개로 완성한 경험 카드는 남긴다. 작성자 칸을 비워 "탈퇴한 회원"으로 보인다(익명).
-- 비공개 카드와 임시 저장 카드는 탈퇴와 함께 지운다. 자격증·교육 기록은 지금처럼 모두 지운다.

alter table public.experiences alter column user_id drop not null;
alter table public.experiences drop constraint experiences_user_id_fkey;
alter table public.experiences
  add constraint experiences_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;

-- 프로필이 지워지기 직전에 남기지 않을 카드를 먼저 지운다. 남은 공개 카드는 위 외래키가 작성자를 비운다.
create or replace function private.delete_private_experiences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.experiences
  where user_id = old.id and (is_draft or visibility <> 'club');
  return old;
end;
$$;

create trigger profiles_delete_private_experiences
  before delete on public.profiles
  for each row execute function private.delete_private_experiences();
