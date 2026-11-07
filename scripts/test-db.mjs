// DB 보안 규칙 자체 점검. 실제 Supabase 없이 PGlite(브라우저·Node용 Postgres)에서 마이그레이션을 돌려 본다.
// 실행: npm run test:db
// shortcut: auth 스키마와 역할은 Supabase를 흉내 낸 최소 버전이다. 실제 프로젝트에 적용한 뒤에는 Supabase 보안 진단(advisors)도 돌린다.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email varchar(255));
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`);

const dir = new URL("../supabase/migrations/", import.meta.url);
for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const ALICE = "00000000-0000-0000-0000-0000000000a1";
const CAROL = "00000000-0000-0000-0000-0000000000c1";
await db.exec(`insert into auth.users values
  ('${ADMIN}', 'admin@example.com'), ('${ALICE}', 'alice@example.com'), ('${CAROL}', 'carol@example.com')`);

// 특정 사용자(또는 anon)로 SQL을 실행한다.
async function as(userId, sql, params = []) {
  await db.exec(userId ? `set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);` : `set role anon;`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function fails(promise, pattern) {
  await assert.rejects(promise, pattern);
}

// 1. 가입: 본인 프로필은 승인 대기로만 만들 수 있다.
await as(ADMIN, `insert into public.profiles (id, name, cohort, status) values ($1, '학회장', 2023, 'enrolled')`, [ADMIN]);
await as(ALICE, `insert into public.profiles (id, name, cohort) values ($1, '앨리스', 2025)`, [ALICE]);
await fails(as(CAROL, `insert into public.profiles (id, name, cohort, role) values ($1, '캐럴', 2026, 'admin')`, [CAROL]), /permission denied/);
await fails(as(CAROL, `insert into public.profiles (id, name, cohort) values ($1, '남의 계정', 2026)`, [ALICE]), /row-level security|duplicate/);
await as(CAROL, `insert into public.profiles (id, name, cohort) values ($1, '캐럴', 2026)`, [CAROL]);
assert.equal((await db.query(`select role from public.profiles where id = $1`, [CAROL])).rows[0].role, "pending");

// 2. 첫 관리자는 SQL 편집기에서 직접 지정한다 (README 참고).
await db.exec(`update public.profiles set role = 'admin' where id = '${ADMIN}'`);

// 3. 승인 대기자는 자기 프로필만 본다. 비로그인은 아무것도 못 본다.
assert.equal((await as(ALICE, `select id from public.profiles`)).length, 1);
await fails(as(null, `select id from public.profiles`), /permission denied/);
await fails(as(null, `select public.list_pending_members()`), /permission denied/);

// 4. 본인이 권한을 바꾸거나, 관리자 함수를 부를 수 없다.
await fails(as(ALICE, `update public.profiles set role = 'admin' where id = $1`, [ALICE]), /permission denied/);
await fails(as(ALICE, `select public.set_member_role($1, 'member')`, [ALICE]), /관리자만/);
await fails(as(ALICE, `select * from public.list_pending_members()`), /관리자만/);

// 5. 관리자는 신청 목록(이메일 포함)을 보고 승인한다.
const pending = await as(ADMIN, `select * from public.list_pending_members()`);
assert.deepEqual(pending.map((p) => p.email), ["alice@example.com", "carol@example.com"]);
await as(ADMIN, `select public.set_member_role($1, 'member')`, [ALICE]);
assert.equal((await as(ALICE, `select id from public.profiles`)).length, 3, "승인되면 다른 회원을 볼 수 있다");

// 6. 회원은 자기 정보만 고친다. 남의 정보 수정은 0건 처리된다.
await as(ALICE, `update public.profiles set name = '앨리스2' where id = $1`, [ALICE]);
await as(ALICE, `update public.profiles set name = '해킹' where id = $1`, [ADMIN]);
assert.equal((await db.query(`select name from public.profiles where id = $1`, [ADMIN])).rows[0].name, "학회장");

// 7. 마지막 관리자는 해제할 수 없다. 다른 관리자가 생기면 가능하다.
await fails(as(ADMIN, `select public.set_member_role($1, 'member')`, [ADMIN]), /최소 1명/);
await as(ADMIN, `select public.set_member_role($1, 'admin')`, [ALICE]);
await as(ADMIN, `select public.set_member_role($1, 'member')`, [ADMIN]);
await fails(as(ALICE, `select public.set_member_role($1, 'member')`, [ALICE]), /최소 1명/);

// 8. 거절은 승인 대기 신청만, 로그인 계정째 지운다.
await fails(as(ALICE, `select public.reject_member($1)`, [ADMIN]), /승인 대기 중인/);
await as(ALICE, `select public.reject_member($1)`, [CAROL]);
assert.equal((await db.query(`select count(*)::int as n from auth.users where id = $1`, [CAROL])).rows[0].n, 0);
assert.equal((await db.query(`select count(*)::int as n from public.profiles where id = $1`, [CAROL])).rows[0].n, 0);

// 9. 회원 관리: 목록·상태 수정·삭제는 관리자만. 지금 관리자는 ALICE, ADMIN은 일반 회원이다.
const DAVE = "00000000-0000-0000-0000-0000000000d1";
await db.exec(`insert into auth.users values ('${DAVE}', 'dave@example.com')`);
await as(DAVE, `insert into public.profiles (id, name, cohort) values ($1, '데이브', 2024)`, [DAVE]);
await as(ALICE, `select public.set_member_role($1, 'member')`, [DAVE]);

await fails(as(ADMIN, `select * from public.list_members()`), /관리자만/);
assert.deepEqual((await as(ALICE, `select email from public.list_members()`)).map((m) => m.email).sort(), [
  "admin@example.com",
  "alice@example.com",
  "dave@example.com",
]);
await as(ALICE, `update public.profiles set status = 'graduated' where id = $1`, [DAVE]);
assert.equal((await db.query(`select status from public.profiles where id = $1`, [DAVE])).rows[0].status, "graduated");

await fails(as(ADMIN, `select public.remove_member($1)`, [DAVE]), /관리자만/);
await fails(as(ALICE, `select public.remove_member($1)`, [ALICE]), /본인 계정/);
await as(ALICE, `select public.set_member_role($1, 'admin')`, [ADMIN]);
await fails(as(ALICE, `select public.remove_member($1)`, [ADMIN]), /일반 회원만/);
await as(ALICE, `select public.remove_member($1)`, [DAVE]);
assert.equal((await db.query(`select count(*)::int as n from auth.users where id = $1`, [DAVE])).rows[0].n, 0);

// 10. 정지 방지 Cron(service_role)은 읽을 수 있다.
await db.exec(`set role service_role`);
await db.query(`select count(*) from public.profiles`);
await db.exec(`reset role`);

console.log("DB 보안 규칙 점검 통과");
