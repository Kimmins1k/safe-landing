"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudCheck,
  Flag,
  HandHeart,
  HardHat,
  Lightbulb,
  Lock,
  Sparkles,
  Store,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  alignAnswers,
  EXPERIENCE_TYPES,
  exampleFor,
  STEP_LABEL,
  STEP_TIP,
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

const TYPE_ICON: Record<ExperienceType, LucideIcon> = {
  club: Flag,
  class_project: Users,
  internship: HardHat,
  part_time: Store,
  volunteer: HandHeart,
  contest: Trophy,
  other: Sparkles,
};

const inputClass = "mt-1 w-full rounded-xl border border-navy-100 bg-white px-3 py-2";
const chip = (on: boolean) =>
  `flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100 bg-white hover:border-navy-700"}`;

export function Wizard({ initial, storedType, activities, questionTypes, tags }: Props) {
  const router = useRouter();
  const published = !initial.isDraft; // 저장·공개한 카드는 자동 저장하지 않는다 (기획서 4.3)
  const [card, setCard] = useState<ExperienceInput>(() => ({
    ...initial,
    answers: alignAnswers(initial.type, initial.answers, storedType),
  }));
  const [answersType, setAnswersType] = useState(initial.type);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next"); // 질문이 들어오는 방향
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(() => JSON.stringify(card));
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const stepperRef = useRef<HTMLOListElement>(null);
  const dirty = JSON.stringify(card) !== saved;

  const answerSteps = card.answers.length;
  const total = 2 + answerSteps + 2; // 유형, 제목·기간, 답변들, 문항 유형·태그, 공개 범위
  const answerIndex = step - 2;

  function go(next: number) {
    setError("");
    setDir(next < step ? "prev" : "next");
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

  // 단계 칩 줄이 화면보다 길면, 지금 단계 칩이 보이도록 가로로 굴린다.
  useEffect(() => {
    stepperRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [step]);

  async function finish() {
    setBusy(true);
    setError("");
    const result = await save(card, true).catch(() => ({ error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." }));
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    // 처음 완성하면 상세 화면에서 축하하고, 이미 완성한 카드를 고쳤으면 저장 알림만 띄운다.
    router.push(`/experiences/${card.id}?${published ? "saved" : "done"}=1`);
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

  // 단계 칩: 이름과 채웠는지 여부. 모든 단계는 건너뛸 수 있으니 칩을 눌러 바로 이동한다.
  const extraCount = card.answers.filter((a) => a.step === "extra").length;
  let extraNo = 0;
  const steps = [
    { label: "유형", filled: !!card.type },
    { label: "제목·기간", filled: !!card.title.trim() },
    ...card.answers.map((a) => ({
      label: a.step === "extra" && extraCount > 1 ? `${STEP_LABEL.extra} ${++extraNo}` : STEP_LABEL[a.step],
      filled: !!a.answer.trim(),
    })),
    { label: "문항 연결", filled: card.questionTypeIds.length > 0 },
    { label: "공개 범위", filled: false },
  ];

  const current = answerIndex >= 0 && answerIndex < answerSteps ? card.answers[answerIndex] : null;
  const isLast = step === total - 1;
  const emptyNow =
    (step === 0 && !card.type) || (step === 1 && !card.title.trim()) || (current !== null && !current.answer.trim());
  const tip = current ? STEP_TIP[current.step] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 text-sm text-navy-700">
        <span aria-live="polite" className="flex items-center gap-1">
          {published ? (
            dirty && "저장하지 않은 내용이 있어요"
          ) : status ? (
            <>
              {status.startsWith("임시 저장됨") ? <CloudCheck aria-hidden size={16} /> : <Cloud aria-hidden size={16} />}
              {status}
            </>
          ) : null}
        </span>
        <button type="button" disabled={busy} onClick={exit} className="shrink-0 underline">
          {published ? "나가기" : "나중에 이어 쓰기"}
        </button>
      </div>

      {/* 단계 칩 + 진행 막대 */}
      <nav aria-label="작성 단계">
        <ol ref={stepperRef} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {steps.map((s, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                aria-current={i === step ? "step" : undefined}
                onClick={() => go(i)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  i === step
                    ? "border-navy-900 bg-navy-900 text-white"
                    : s.filled
                      ? "border-navy-100 bg-navy-50 text-navy-900"
                      : "border-navy-100 bg-white text-navy-700"
                }`}
              >
                {s.filled && i !== step && <Check aria-hidden size={12} strokeWidth={3} className="text-safety-700" />}
                {s.label}
                {s.filled && <span className="sr-only">(작성함)</span>}
              </button>
            </li>
          ))}
        </ol>
        <div className="h-1.5 rounded-full bg-navy-50" aria-hidden>
          <div className="h-1.5 rounded-full bg-safety-500 transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <p className="mt-1 text-right text-xs text-navy-700 tabular-nums">
          {step + 1} / {total}
        </p>
      </nav>

      {/* 단계가 바뀔 때마다 새로 그려서 들어오는 애니메이션을 다시 튼다 */}
      <section key={step} className={`space-y-5 ${dir === "next" ? "animate-step-next" : "animate-step-prev"}`}>
        <h1 className="text-xl font-bold text-balance">{stepTitle}</h1>

        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXPERIENCE_TYPES.map((t) => {
                const Icon = TYPE_ICON[t];
                const on = card.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setType(t)}
                    className={`relative flex flex-col items-start gap-2 rounded-2xl border p-3 text-left text-sm font-bold transition-colors ${
                      on ? "border-navy-900 bg-navy-50 shadow-card" : "border-navy-100 bg-white hover:border-navy-700"
                    }`}
                  >
                    <Icon aria-hidden size={24} strokeWidth={1.5} className={on ? "text-safety-700" : "text-navy-700"} />
                    {TYPE_LABEL[t]}
                    {on && <Check aria-hidden size={16} strokeWidth={3} className="absolute top-3 right-3 text-navy-900" />}
                  </button>
                );
              })}
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
                placeholder="예: 실험실 안전점검 프로젝트"
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
          <div className="space-y-2">
            {exampleFor(current) && (
              <p className="rounded-2xl bg-navy-50 p-3 text-sm">
                <span className="mr-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold">예시</span>
                {exampleFor(current)}
              </p>
            )}
            <textarea
              value={current.answer}
              maxLength={3000}
              rows={7}
              onChange={(e) => setAnswer(answerIndex, e.target.value)}
              aria-label={current.question}
              aria-describedby="answer-hint"
              placeholder="자소서 말투(~했습니다)로 써 주세요. 짧게라도 남기고 나중에 채워도 돼요."
              className={inputClass}
            />
            <div id="answer-hint" className="flex items-start justify-between gap-3 text-sm text-navy-700">
              <span className="flex items-start gap-1">
                {tip && (
                  <>
                    <Lightbulb aria-hidden size={16} className="mt-0.5 shrink-0 text-safety-700" />
                    {tip}
                  </>
                )}
              </span>
              <span className="shrink-0 tabular-nums">{current.answer.length.toLocaleString("ko-KR")}자</span>
            </div>
          </div>
        )}

        {step === total - 2 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 font-bold">
                자소서 문항 유형 <span className="text-safety-700">(하나 이상 필수)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {questionTypes.map((q) => {
                  const on = card.questionTypeIds.includes(q.id);
                  return (
                    <button key={q.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggle("questionTypeIds", q.id)}>
                      {on && <Check aria-hidden size={14} strokeWidth={3} />}
                      {q.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 font-bold">역량 태그 (선택)</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const on = card.tagIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggle("tagIds", t.id)}>
                      {on && <Check aria-hidden size={14} strokeWidth={3} />}#{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isLast && (
          <fieldset className="space-y-2">
            <legend className="sr-only">공개 범위</legend>
            {(
              [
                ["private", "비공개 (나만 보기)", "기본값이에요.", Lock],
                ["club", "동아리원 공개", "다른 회원이 읽기 전용으로 볼 수 있어요. 활동 상세에서 선배 활용 사례로 보여요.", Users],
              ] as [Visibility, string, string, LucideIcon][]
            ).map(([value, label, hint, Icon]) => (
              <label
                key={value}
                className="card flex cursor-pointer items-start gap-3 p-3 transition-colors has-checked:border-navy-900 has-checked:bg-navy-50"
              >
                <input type="radio" name="visibility" value={value} checked={card.visibility === value} onChange={() => update({ visibility: value })} className="mt-1 accent-navy-900" />
                <Icon aria-hidden size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-navy-700" />
                <span>
                  <span className="font-bold">{label}</span>
                  <span className="block text-sm text-navy-700">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </section>

      {error && (
        <p role="alert" className="text-safety-700">
          {error}
        </p>
      )}

      {leaving && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-safety-500/10 p-3 text-sm">
          <span className="text-safety-700">저장하지 않은 내용이 있어요. 저장하지 않고 나갈까요?</span>
          <Link href={`/experiences/${card.id}`} className="rounded-lg border border-navy-100 bg-white px-3 py-1">
            저장하지 않고 나가기
          </Link>
          <button type="button" onClick={() => setLeaving(false)} className="rounded-lg bg-navy-900 px-3 py-1 text-white">
            계속 쓰기
          </button>
        </div>
      )}

      {/* 이전·다음 버튼은 화면 아래(모바일은 하단 탭 바로 위)에 붙어 있어 긴 답변을 써도 스크롤하지 않고 누를 수 있다 */}
      <div className="sticky bottom-(--bottom-nav) z-10 -mx-4 flex items-center gap-2 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur md:bottom-4 md:mx-0 md:rounded-2xl md:border md:shadow-card">
        <button
          type="button"
          disabled={step === 0 || busy}
          onClick={() => go(step - 1)}
          aria-label="이전"
          className="flex items-center rounded-xl border border-navy-100 bg-white px-3 py-2 disabled:opacity-40"
        >
          <ChevronLeft aria-hidden size={20} />
        </button>
        {!isLast && (
          <button
            type="button"
            disabled={busy}
            onClick={() => go(step + 1)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-navy-900 px-4 py-2 font-bold text-white"
          >
            {emptyNow ? "건너뛰기" : "다음"}
            <ChevronRight aria-hidden size={18} />
          </button>
        )}
        {(isLast || published) && (
          <button
            type="button"
            disabled={busy}
            onClick={finish}
            className={`rounded-xl bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600 disabled:opacity-60 ${isLast ? "flex-1" : ""}`}
          >
            {busy ? "저장 중…" : published ? "저장" : "완료하고 저장"}
          </button>
        )}
      </div>
    </div>
  );
}
