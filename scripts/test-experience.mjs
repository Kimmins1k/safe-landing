// 경험 카드 질문 맞추기·초안 재료 점검. 실행: npm run test:experience
import assert from "node:assert/strict";
import { alignAnswers, draftMaterial, EXTRA, STAR } from "../src/lib/experience.ts";

const a = (step, answer, question = "q") => ({ step, question, answer });

// 초안 재료: 순서대로 잇고, 건너뛴 단계와 추가 질문은 뺀다. 이미 "그 결과"로 시작하면 또 붙이지 않는다.
assert.equal(
  draftMaterial([a("reflection", "배웠습니다."), a("extra", "추가"), a("situation", "상황입니다."), a("result", "9건이 개선되었습니다.")]),
  "상황입니다. 그 결과 9건이 개선되었습니다. 이 경험으로 배웠습니다.",
);
assert.equal(draftMaterial([a("result", "그 결과 좋았습니다."), a("task", "  ")]), "그 결과 좋았습니다.");
assert.equal(draftMaterial([]), "");

// 질문 맞추기: 새 카드는 STAR + 유형별 추가 질문.
const fresh = alignAnswers("internship", [], null);
assert.equal(fresh.length, STAR.length + EXTRA.internship.length);

// 같은 유형이면 예전 질문 문장과 답을 그대로 둔다.
const old = [a("situation", "S", "예전 질문"), a("extra", "E", "예전 추가 질문")];
const kept = alignAnswers("club", old, "club");
assert.equal(kept[0].question, "예전 질문");
assert.deepEqual(kept.at(-1), old[1]);

// 유형이 바뀌면 STAR 답은 남고 추가 질문만 새 유형 것으로 바뀐다.
const changed = alignAnswers("part_time", old, "club");
assert.equal(changed[0].answer, "S");
assert.deepEqual(changed.slice(STAR.length).map((x) => x.question), EXTRA.part_time.map((q) => q.question));

// 유형을 아직 안 골랐으면 STAR만.
assert.equal(alignAnswers(null, [], null).length, STAR.length);

console.log("경험 카드 점검 통과");
