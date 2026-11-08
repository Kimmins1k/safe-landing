-- 세이프랜딩: 관리자 태그·문항 유형 관리 (기획서 4.4, 4.7, 화면 17)
-- 읽기는 기존 규칙 그대로(회원). 추가·수정은 관리자만. 삭제는 없다 (is_active로 비활성화).

grant insert (name, sort_order) on table public.competency_tags to authenticated;
grant update (name, sort_order, is_active) on table public.competency_tags to authenticated;

grant insert (name, description, sort_order, is_experience_based) on table public.question_types to authenticated;
grant update (name, description, sort_order, is_active, is_experience_based) on table public.question_types to authenticated;

create policy "관리자가 등록한다" on public.competency_tags for insert to authenticated
  with check ((select private.is_admin()));
create policy "관리자가 고친다" on public.competency_tags for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "관리자가 등록한다" on public.question_types for insert to authenticated
  with check ((select private.is_admin()));
create policy "관리자가 고친다" on public.question_types for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
