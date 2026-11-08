-- 임원진 휴대폰 푸시 알림: 알림을 켠 기기(브라우저)마다 한 줄. 가입 신청이 들어오면 임원진 기기에 알림을 보낸다.
-- 회원은 이 표를 직접 못 읽고 못 쓴다. 서버가 임원진인지 확인한 뒤 service_role로만 다룬다.

create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

revoke all on table public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

-- 규칙(policy)을 두지 않아서 anon·authenticated는 권한이 생겨도 한 줄도 못 본다.
alter table public.push_subscriptions enable row level security;
