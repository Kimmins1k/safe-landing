import { PageSkeleton } from "@/app/skeleton";
import {
  ArrowRight,
  Award,
  ChevronRight,
  Flag,
  Library,
  MessageCircleMore,
  NotebookPen,
  PenLine,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BOARD_LABEL, type PostRow } from "@/lib/archive";
import { requireStage, STATUS_LABEL } from "@/lib/auth";
import { createExperience } from "./experiences/actions";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

type Card = { id: string; title: string; is_draft: boolean; experience_question_types: { question_type_id: number }[] };
// 맨 위 "다음 할 일" 카드. 버튼은 링크(href)이거나 새 경험 만들기(create)다.
type NextStep = { title: string; desc: string; cta: string; href?: string; create?: boolean };

const SENIOR_LINKS: [string, string, LucideIcon][] = [
  ["/activities", "동아리 활동", Flag],
  ["/experiences/shared", "공개 경험", Users],
  ["/archive", "선배 아카이브", Library],
];

async function Home() {
  const { supabase, userId, profile } = await requireStage("member");
  if (!profile) return null;
  const [cardsRes, typesRes, qna, review, tip, credentials] = await Promise.all([
    supabase
      .from("experiences")
      .select("id, title, is_draft, experience_question_types(question_type_id)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase.from("question_types").select("id, name, is_experience_based").eq("is_active", true).order("sort_order"),
    supabase.rpc("list_posts", { p_board: "qna", p_limit: 30 }),
    supabase.rpc("list_posts", { p_board: "review", p_limit: 3 }),
    supabase.rpc("list_posts", { p_board: "tip", p_limit: 3 }),
    supabase.from("credentials").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const cards = (cardsRes.data ?? []) as Card[];
  const drafts = cards.filter((c) => c.is_draft);

  // 문항 유형마다 완성한 카드가 몇 개 연결됐는지. 경험으로 채우는 문항인데 0개면 비었다고 알려 준다.
  const done = cards.filter((c) => !c.is_draft);
  const typeStatus = ((typesRes.data ?? []) as { id: number; name: string; is_experience_based: boolean }[]).map((t) => ({
    ...t,
    count: done.filter((c) => c.experience_question_types.some((l) => l.question_type_id === t.id)).length,
  }));
  const experienceTypes = typeStatus.filter((t) => t.is_experience_based);
  const filledCount = experienceTypes.filter((t) => t.count > 0).length;
  const firstEmpty = experienceTypes.find((t) => t.count === 0);

  // 답변이 없는 질문을 홈에 보여 줘서 답변이 달리게 한다 (알림이 없으므로).
  const visible = (rows: unknown) => ((rows ?? []) as PostRow[]).filter((p) => !p.is_hidden);
  const unanswered = visible(qna.data).filter((q) => !q.is_answered).slice(0, 3);
  const recent = [...visible(qna.data).slice(0, 3), ...visible(review.data), ...visible(tip.data)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  // 지금 가장 먼저 하면 좋은 일 하나: 첫 카드 → 쓰다 만 카드 → 빈 문항 → 답변 없는 질문 → 선배 사례 보기
  const next: NextStep =
    cards.length === 0
      ? { title: "첫 경험 카드를 써 보세요", desc: "질문에 하나씩 답하면 자소서 재료가 쌓여요. 짧게 써도 괜찮아요.", cta: "첫 경험 쓰기", create: true }
      : drafts[0]
        ? {
            title: `‘${drafts[0].title || "제목 없음"}’ 이어 쓰기`,
            desc: "쓰다 만 카드가 있어요. 마저 채우면 초안 재료가 만들어져요.",
            cta: "이어 쓰기",
            href: `/experiences/${drafts[0].id}/edit`,
          }
        : firstEmpty
          ? {
              title: `‘${firstEmpty.name}’ 문항이 비어 있어요`,
              desc: "이 문항에 쓸 경험을 하나 기록해 두면 자소서를 쓸 때 막막하지 않아요.",
              cta: "새 경험 쓰기",
              create: true,
            }
          : unanswered[0]
            ? { title: "동아리원의 질문에 답해 주세요", desc: unanswered[0].title, cta: "답변하러 가기", href: `/archive/${unanswered[0].id}` }
            : {
                title: "모든 문항에 쓸 경험이 있어요 👏",
                desc: "선배·동기가 같은 활동을 어떻게 썼는지 보면서 다듬어 보세요.",
                cta: "공개 경험 보기",
                href: "/experiences/shared",
              };

  const ctaClass =
    "flex w-full items-center justify-center gap-1 rounded-xl bg-safety-500 px-4 py-2.5 font-bold text-navy-900 hover:bg-safety-600 sm:w-fit";

  return (
    <div className="space-y-5">
      {/* 인사 + 내 기록 요약 */}
      <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
        <p className="text-sm text-navy-100">
          {profile.cohort}학번 · {STATUS_LABEL[profile.status]}
          {profile.role === "admin" && " · 관리자"}
        </p>
        <h1 className="mt-1 text-2xl font-bold">안녕하세요, {profile.name}님</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/experiences" className="rounded-2xl bg-white/10 p-3 transition-colors hover:bg-white/15">
            <NotebookPen aria-hidden size={20} strokeWidth={1.75} className="text-safety-500" />
            <p className="mt-2 text-sm text-navy-100">경험 카드</p>
            <p className="text-xl font-bold tabular-nums">
              {cards.length}
              <span className="text-sm font-normal">개</span>
            </p>
            {drafts.length > 0 && <p className="text-xs text-navy-100">임시 저장 {drafts.length}개</p>}
          </Link>
          <Link href="/credentials" className="rounded-2xl bg-white/10 p-3 transition-colors hover:bg-white/15">
            <Award aria-hidden size={20} strokeWidth={1.75} className="text-safety-500" />
            <p className="mt-2 text-sm text-navy-100">자격증·교육</p>
            <p className="text-xl font-bold tabular-nums">
              {credentials.count ?? 0}
              <span className="text-sm font-normal">개</span>
            </p>
          </Link>
        </div>
      </section>

      {/* 다음 할 일 */}
      <section className="card space-y-3 border-l-4 border-l-safety-500 p-4">
        <p className="text-xs font-bold text-safety-700">다음 할 일</p>
        <div>
          <p className="text-lg font-bold">{next.title}</p>
          <p className="text-sm text-navy-700">{next.desc}</p>
        </div>
        {next.create ? (
          <form action={createExperience}>
            <button className={ctaClass}>
              <PenLine aria-hidden size={18} />
              {next.cta}
            </button>
          </form>
        ) : (
          <Link href={next.href ?? "/"} className={ctaClass}>
            {next.cta}
            <ArrowRight aria-hidden size={18} />
          </Link>
        )}
      </section>

      {/* 자소서 문항 준비도 */}
      <section className="card space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-bold">자소서 문항 준비도</h2>
          <p className="text-sm text-navy-700 tabular-nums">
            <b className="text-lg text-navy-900">{filledCount}</b> / {experienceTypes.length} 채움
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="경험으로 채운 문항 유형"
          aria-valuemin={0}
          aria-valuemax={experienceTypes.length}
          aria-valuenow={filledCount}
          className="h-2.5 overflow-hidden rounded-full bg-navy-50"
        >
          <div
            className="h-full origin-left animate-grow rounded-full bg-safety-500"
            style={{ width: `${experienceTypes.length ? (filledCount / experienceTypes.length) * 100 : 0}%` }}
          />
        </div>
        <ul className="flex flex-wrap gap-1.5 text-sm">
          {typeStatus.map((t) => (
            <li
              key={t.id}
              className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                !t.is_experience_based
                  ? "bg-navy-50 text-navy-700"
                  : t.count === 0
                    ? "border border-dashed border-safety-700 text-safety-700"
                    : "bg-navy-900 text-white"
              }`}
            >
              {t.is_experience_based && t.count === 0 && <TriangleAlert aria-hidden size={14} />}
              {t.name}
              {t.is_experience_based ? (
                t.count > 0 ? (
                  <b className="tabular-nums">{t.count}</b>
                ) : (
                  <span className="sr-only">비어 있음</span>
                )
              ) : (
                <span className="text-xs">(경험 외)</span>
              )}
            </li>
          ))}
        </ul>
        <Link href="/experiences/by-question" className="flex w-fit items-center gap-0.5 text-sm font-bold text-navy-700 hover:text-navy-900">
          문항 유형별로 자세히 보기
          <ChevronRight aria-hidden size={16} />
        </Link>
      </section>

      {/* 선배·동기 사례 바로가기 */}
      <section className="space-y-2">
        <h2 className="font-bold">선배·동기는 어떻게 썼을까?</h2>
        <div className="grid grid-cols-3 gap-2">
          {SENIOR_LINKS.map(([href, label, Icon]) => (
            <Link key={href} href={href} className="card card-hover flex flex-col items-center gap-2 p-3 text-center text-sm font-bold">
              <Icon aria-hidden size={24} strokeWidth={1.5} className="text-navy-700" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      {unanswered.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="flex items-center gap-1 font-bold">
            <MessageCircleMore aria-hidden size={18} className="text-safety-700" />
            답변을 기다리는 질문
          </h2>
          <ul className="divide-y divide-navy-100">
            {unanswered.map((q) => (
              <li key={q.id}>
                <Link href={`/archive/${q.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-navy-700">
                  <span className="min-w-0 truncate">{q.title}</span>
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-navy-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">최근 아카이브 글</h2>
          <ul className="divide-y divide-navy-100">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/archive/${p.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-navy-700">
                  <span className="min-w-0">
                    <span className="mr-1.5 rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-700">{BOARD_LABEL[p.board]}</span>
                    {p.title}
                  </span>
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-navy-700" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
