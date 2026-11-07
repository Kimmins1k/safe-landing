"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  alignAnswers,
  EXPERIENCE_TYPES,
  exampleFor,
  TYPE_LABEL,
  type ExperienceType,
  type Visibility,
} from "@/lib/experience";
import { saveExperience, type ExperienceInput } from "../../actions";

export type Option = { id: number; name: string };
export type ActivityOption = { id: number; title: string; semester: string };

type Props = {
  initial: ExperienceInput;
  storedType: ExperienceType | null;
  activities: ActivityOption[];
  questionTypes: Option[];
  tags: Option[];
};

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${on ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100"}`;

export function Wizard({ initial, storedType, activities, questionTypes, tags }: Props) {
  const router = useRouter();
  const published = !initial.isDraft; // 저장·공개한 카드는 자동 저장하지 않는다 (기획서 4.3)
  const [card, setCard] = useState<ExperienceInput>(() => ({
    ...initial,
    answers: alignAnswers(initial.type, initial.answers, storedType),
  }));
  const [answersType, setAnswersType] = useState(initial.type);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(() => JSON.stringify(card));
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const dirty = JSON.stringify(card) !== saved;

  const answerSteps = card.answers.length;
  const total = 2 + answerSteps + 2; // 유형, 제목·기간, 답변들, 문항 유형·태그, 공개 범위
  const answerIndex = step - 2;

  function go(next: number) {
    setError("");
    setStep(next);
  }
  function update(patch: Partial<ExperienceInput>) {
    setCard((c) => ({ ...c, ...patch }));
  }
  function setType(type: ExperienceType) {
    setCard((c) => ({ ...c, type, activityId: type === "club" ? c.activityId : null, answers: alignAnswers(type, c.answers, answersType) }));
    setAnswersType(type);
  }
  function setAnswer(i: number, answer: string) {
    setCard((c) => ({ ...c, answers: c.answers.map((a, j) => (j === i ? { ...a, answer } : a)) }));
  }
  function toggle(key: "questionTypeIds" | "tagIds", id: number) {
    setCard((c) => ({ ...c, [key]: c[key].includes(id) ? c[key].filter((x) => x !== id) : [...c[key], id] }));
  }

  // 저장은 한 번에 하나씩 순서대로 보낸다.
  function save(next: ExperienceInput, final = false) {
    const run = chainRef.current.then(async () => {
      const result = await saveExperience(final ? { ...next, isDraft: false } : next);
      if (!result.error) setSaved(JSON.stringify(next));
      return result;
    });
    chainRef.current = run.catch(() => undefined);
    return run;
  }

  // 임시 저장 카드: 입력이 멈추고 1.5초 뒤 자동 저장
  useEffect(() => {
    if (published || !dirty) return;
    const timer = setTimeout(async () => {
      setStatus("저장 중…");
      const result = await save(card).catch(() => ({ error: "연결이 끊겼어요. 잠시 후 다시 저장할게요." }));
      setStatus(result.error ? result.error : `임시 저장됨 ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`);
    }, 1500);
    return () => clearTimeout(timer);
  });

  // 저장하지 않은 채 창을 닫거나 새로고침하면 브라우저가 한 번 묻는다.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function finish() {
    setBusy(true);
    setError("");
    const result = await save(card, true).catch(() => ({ error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }));
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/experiences/${card.id}`);
  }

  async function exit() {
    if (published && dirty) return setLeaving(true);
    if (!published && dirty) {
      setBusy(true);
      await save(card).catch(() => undefined);
    }
    router.push(published ? `/experiences/${card.id}` : "/experiences");
  }

  const stepTitle = useMemo(() => {
    if (step === 0) return "어떤 경험인가요?";
    if (step === 1) return "제목과 기간";
    if (answerIndex < answerSteps) return card.answers[answerIndex].question;
    if (step === total - 2) return "어떤 자소서 문항에 쓸 수 있을까요?";
    return "공개 범위";
  }, [step, answerIndex, answerSteps, card.answers, total]);

  const current = answerIndex >= 0 && answerIndex < answerSteps ? card.answers[answerIndex] : null;
  const isLast = step === total - 1;
  const emptyNow =
    (step === 0 && !card.type) || (step === 1 && !card.title.trim()) || (current !== null && !current.answer.trim());

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-navy-700">
        <span>
          {step + 1} / {total}
        </span>
        <span aria-live="polite">{published ? (dirty ? "저장하지 않은 내용이 있어요" : "") : status}</span>
      </div>
      <div className="h-2 rounded-full bg-navy-50" aria-hidden>
        <div className="h-2 rounded-full bg-safety-500 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      <h1 className="text-xl font-bold">{stepTitle}</h1>

      {step === 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={card.type === t} className={chip(card.type === t)} onClick={() => setType(t)}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          {card.type === "club" && (
            <label className="block">
              동아리 활동
              <select
                value={card.activityId ?? ""}
                onChange={(e) => update({ activityId: e.target.value ? Number(e.target.value) : null })}
                className={inputClass}
              >
                <option value="">목록에 없음 (제목에 직접 쓰기)</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.semester} · {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {storedType && card.type !== storedType && card.answers.some((a) => a.step === "extra") && (
            <p className="text-sm text-navy-700">유형을 바꾸면 유형별 추가 질문이 새 유형에 맞게 바뀌어요. 공통 질문 답변은 그대로 남아요.</p>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            제목
            <input
              value={card.title}
              maxLength={100}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="실험실 안전점검 프로젝트"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              시작
              <input type="date" value={card.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value || null })} className={inputClass} />
            </label>
            <label className="block">
              끝 (선택)
              <input type="date" value={card.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value || null })} className={inputClass} />
            </label>
          </div>
        </div>
      )}

      {current && (
        <div className="space-y-3">
          {exampleFor(current) && (
            <p className="rounded-lg bg-navy-50 p-3 text-sm">
              <span className="font-bold">예시</span> {exampleFor(current)}
            </p>
          )}
          <textarea
            value={current.answer}
            maxLength={3000}
            rows={7}
            onChange={(e) => setAnswer(answerIndex, e.target.value)}
            aria-label={current.question}
            placeholder="자소서 말투(~했습니다)로 써 주세요. 짧게라도 남기고 나중에 채워도 돼요."
            className={inputClass}
          />
        </div>
      )}

      {step === total - 2 && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-bold">
              자소서 문항 유형 <span className="text-safety-600">(하나 이상 필수)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {questionTypes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  aria-pressed={card.questionTypeIds.includes(q.id)}
                  className={chip(card.questionTypeIds.includes(q.id))}
                  onClick={() => toggle("questionTypeIds", q.id)}
                >
                  {q.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold">역량 태그 (선택)</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t.id} type="button" aria-pressed={card.tagIds.includes(t.id)} className={chip(card.tagIds.includes(t.id))} onClick={() => toggle("tagIds", t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLast && (
        <fieldset className="space-y-2">
          <legend className="sr-only">공개 범위</legend>
          {(
            [
              ["private", "비공개 (나만 보기)", "기본값이에요."],
              ["club", "동아리원 공개", "다른 회원이 읽기 전용으로 볼 수 있어요. 활동 상세에서 선배 활용 사례로 보여요."],
            ] as [Visibility, string, string][]
          ).map(([value, label, hint]) => (
            <label key={value} className="flex items-start gap-2 rounded-lg border border-navy-100 p-3">
              <input type="radio" name="visibility" value={value} aria-label={label} checked={card.visibility === value} onChange={() => update({ visibility: value })} className="mt-1" />
              <span>
                <span className="font-bold">{label}</span>
                <span className="block text-sm text-navy-700">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-safety-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={step === 0 || busy} onClick={() => go(step - 1)} className="rounded-lg border border-navy-100 px-4 py-2 disabled:opacity-40">
          이전
        </button>
        {!isLast && (
          <button type="button" disabled={busy} onClick={() => go(step + 1)} className="rounded-lg bg-navy-900 px-4 py-2 text-white">
            {emptyNow ? "건너뛰기" : "다음"}
          </button>
        )}
        {(isLast || published) && (
          <button type="button" disabled={busy} onClick={finish} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600 disabled:opacity-60">
            {busy ? "저장 중…" : published ? "저장" : "완료하고 저장"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={exit} className="ml-auto text-sm text-navy-700 underline">
          {published ? "나가기" : "나중에 이어 쓰기"}
        </button>
      </div>

      {leaving && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-safety-500/10 p-3 text-sm">
          <span className="text-safety-600">저장하지 않은 내용이 있어요. 저장하지 않고 나갈까요?</span>
          <Link href={`/experiences/${card.id}`} className="rounded-lg border border-navy-100 px-3 py-1">
            저장하지 않고 나가기
          </Link>
          <button type="button" onClick={() => setLeaving(false)} className="rounded-lg bg-navy-900 px-3 py-1 text-white">
            계속 쓰기
          </button>
        </div>
      )}
    </div>
  );
}
