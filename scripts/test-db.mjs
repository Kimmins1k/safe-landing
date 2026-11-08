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

// 10. 활동·목록: 회원은 읽기만, 관리자만 활동을 등록·숨김. 승인 대기자는 못 읽는다.
//     지금 관리자는 ALICE와 ADMIN. BOB은 일반 회원, EVE는 승인 대기.
const BOB = "00000000-0000-0000-0000-0000000000b1";
const EVE = "00000000-0000-0000-0000-0000000000e1";
await db.exec(`insert into auth.users values ('${BOB}', 'bob@example.com'), ('${EVE}', 'eve@example.com')`);
await as(BOB, `insert into public.profiles (id, name, cohort) values ($1, '밥', 2025)`, [BOB]);
await as(EVE, `insert into public.profiles (id, name, cohort) values ($1, '이브', 2026)`, [EVE]);
await as(ALICE, `select public.set_member_role($1, 'member')`, [BOB]);

assert.equal((await as(BOB, `select id from public.question_types`)).length, 10, "기본 문항 유형 10개");
assert.equal((await as(BOB, `select id from public.competency_tags`)).length, 12, "기본 역량 태그 12개");
assert.equal((await as(EVE, `select id from public.question_types`)).length, 0, "승인 대기자는 목록을 못 본다");
await fails(as(null, `select id from public.activities`), /permission denied/);
await fails(as(BOB, `insert into public.activities (title, semester, category) values ('몰래', '2026-2', 'event')`), /row-level security/);
const [{ id: ACT }] = await as(ALICE, `insert into public.activities (title, semester, category) values ('정기 안전점검', '2026-2', 'project') returning id`);
const [{ id: HIDDEN_ACT }] = await as(ALICE, `insert into public.activities (title, semester, category, is_hidden) values ('옛 활동', '2020-1', 'event') returning id`).catch(() => [{}]);
assert.equal(HIDDEN_ACT, undefined, "is_hidden은 등록할 때 직접 넣을 수 없다 (권한 없음)");
const [{ id: OLD_ACT }] = await as(ALICE, `insert into public.activities (title, semester, category) values ('옛 활동', '2020-1', 'event') returning id`);
await as(BOB, `update public.activities set is_hidden = true where id = $1`, [OLD_ACT]); // 회원은 0건 처리
assert.equal((await db.query(`select is_hidden from public.activities where id = $1`, [OLD_ACT])).rows[0].is_hidden, false);

// 10-2. 태그·문항 유형: 관리자만 추가·수정(비활성화 포함). 회원은 0건 처리, 삭제는 아무도 못 한다.
await fails(as(BOB, `insert into public.competency_tags (name) values ('몰래')`), /row-level security/);
await as(ALICE, `insert into public.competency_tags (name, sort_order) values ('새 태그', 99)`);
await fails(as(ALICE, `insert into public.competency_tags (name) values ('새 태그')`), /duplicate key/);
await fails(as(ALICE, `insert into public.question_types (name, is_active) values ('x', false)`), /permission denied/);
await as(ALICE, `insert into public.question_types (name, description, is_experience_based) values ('새 문항', '설명', false)`);
await as(BOB, `update public.question_types set is_active = false where name = '새 문항'`);
assert.equal((await db.query(`select is_active from public.question_types where name = '새 문항'`)).rows[0].is_active, true);
await as(ALICE, `update public.question_types set is_active = false where name = '새 문항'`);
assert.equal((await db.query(`select is_active from public.question_types where name = '새 문항'`)).rows[0].is_active, false);
await fails(as(ALICE, `delete from public.question_types where name = '새 문항'`), /permission denied/);
await db.exec(`delete from public.question_types where name = '새 문항'; delete from public.competency_tags where name = '새 태그'`);

// 11. 경험 카드: 임시 저장은 본인만, 완료 + 공개만 다른 회원이 본다.
const QT = (await db.query(`select id from public.question_types order by sort_order`)).rows.map((r) => r.id);
const TAG = (await db.query(`select id from public.competency_tags order by sort_order`)).rows.map((r) => r.id);
await fails(as(EVE, `insert into public.experiences (is_draft) values (true)`), /row-level security/);
await fails(as(BOB, `insert into public.experiences (user_id) values ($1)`, [ALICE]), /permission denied/);
const [{ id: CARD }] = await as(BOB, `insert into public.experiences (is_draft) values (true) returning id`);
const save = (who, o) =>
  as(who, `select public.save_experience($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
    o.id ?? CARD, o.type ?? "club", o.activity ?? ACT, o.title ?? "안전점검 프로젝트", null, null,
    JSON.stringify(o.answers ?? [{ step: "situation", question: "q", answer: "a" }]),
    o.visibility ?? "club", o.draft ?? true, o.qt ?? [QT[3]], o.tags ?? [TAG[0]],
  ]);

await save(BOB, { draft: true, qt: [] });
assert.equal((await as(ALICE, `select id from public.experiences`)).length, 0, "임시 저장 카드는 공개여도 남이 못 본다");
await fails(save(BOB, { draft: false, qt: [] }), /문항 유형을 하나 이상/);
await fails(save(BOB, { draft: false, activity: OLD_ACT, qt: [QT[3]] }).then(async () => {
  await db.exec(`update public.activities set is_hidden = true where id = ${OLD_ACT}`);
  await save(BOB, { draft: false, activity: ACT });
  await save(BOB, { draft: false, activity: OLD_ACT });
}), /숨김 처리된 활동/);
await save(BOB, { draft: false, qt: [QT[3], QT[6]], tags: [TAG[0], TAG[2]] });
assert.equal((await as(ALICE, `select id from public.experiences`)).length, 1, "완료된 공개 카드는 회원이 본다");
assert.equal((await as(ALICE, `select * from public.experience_question_types`)).length, 2);
assert.equal((await as(EVE, `select id from public.experiences`)).length, 0, "승인 대기자는 못 본다");

// 남의 카드는 고치거나 지울 수 없다 (0건 처리 또는 오류).
await fails(save(ALICE, { title: "해킹" }), /찾을 수 없습니다/);
await as(ALICE, `delete from public.experiences where id = $1`, [CARD]);
await fails(as(ALICE, `insert into public.experience_tags values ($1, $2)`, [CARD, TAG[5]]), /row-level security/);
await as(ALICE, `delete from public.experience_question_types where experience_id = $1`, [CARD]);
assert.equal((await db.query(`select count(*)::int as n from public.experience_question_types where experience_id = $1`, [CARD])).rows[0].n, 2);

// 비공개로 바꾸면 남에게 안 보인다.
await save(BOB, { draft: false, visibility: "private", qt: [QT[3], QT[6]], tags: [TAG[0], TAG[2]] });
assert.equal((await as(ALICE, `select id from public.experiences`)).length, 0);

// 비활성화된 문항 유형: 이미 연결된 것은 남고, 새로 연결은 막힌다.
await db.exec(`update public.question_types set is_active = false where id in (${QT[6]}, ${QT[7]})`);
await save(BOB, { draft: false, qt: [QT[3], QT[6]], tags: [TAG[0]] });
assert.deepEqual((await as(BOB, `select question_type_id from public.experience_question_types order by 1`)).map((r) => r.question_type_id), [QT[3], QT[6]]);
assert.equal((await as(BOB, `select * from public.experience_tags`)).length, 1, "빠진 태그는 해제된다");
await fails(save(BOB, { draft: false, qt: [QT[3], QT[7]] }), /사용하지 않는 문항 유형/);

// 본인은 지울 수 있고, 연결도 함께 지워진다. 회원을 삭제하면 그 회원의 카드도 지워진다.
await as(BOB, `delete from public.experiences where id = $1`, [CARD]);
assert.equal((await db.query(`select count(*)::int as n from public.experience_question_types`)).rows[0].n, 0);
await as(BOB, `insert into public.experiences (is_draft) values (true)`);
await as(ALICE, `select public.remove_member($1)`, [BOB]);
assert.equal((await db.query(`select count(*)::int as n from public.experiences`)).rows[0].n, 0);

// 11-2. 탈퇴(계정 삭제): 관리자가 둘일 때는 한 명이 나갈 수 있고, 마지막 관리자는 DB가 막는다.
await db.exec(`delete from auth.users where id = '${ALICE}'`);
await fails(db.exec(`delete from auth.users where id = '${ADMIN}'`), /최소 1명/);

// 12. 정지 방지 Cron(service_role)은 읽을 수 있다.
await db.exec(`set role service_role`);
await db.query(`select count(*) from public.profiles`);
await db.exec(`reset role`);

console.log("DB 보안 규칙 점검 통과");
