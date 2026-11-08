import Link from "next/link";
import { Suspense } from "react";
import { BOARD_LABEL, type PostRow } from "@/lib/archive";
import { requireStage, STATUS_LABEL } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export default function HomePage() {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { supabase, userId, profile } = await requireStage("member");
  if (!profile) return null;
  const [cardsRes, typesRes, qna, review, tip] = await Promise.all([
    supabase.from("experiences").select("is_draft, experience_question_types(question_type_id)").eq("user_id", userId),
    supabase.from("question_types").select("id, name, is_experience_based").eq("is_active", true).order("sort_order"),
    supabase.rpc("list_posts", { p_board: "qna", p_limit: 30 }),
    supabase.rpc("list_posts", { p_board: "review", p_limit: 3 }),
    supabase.rpc("list_posts", { p_board: "tip", p_limit: 3 }),
  ]);
  const cards = (cardsRes.data ?? []) as { is_draft: boolean; experience_question_types: { question_type_id: number }[] }[];
  const drafts = cards.filter((c) => c.is_draft).length;

  // 문항 유형마다 완성한 카드가 몇 개 연결됐는지. 경험으로 채우는 문항인데 0개면 비었다고 알려 준다.
  const done = cards.filter((c) => !c.is_draft);
  const typeStatus = ((typesRes.data ?? []) as { id: number; name: string; is_experience_based: boolean }[]).map((t) => ({
    ...t,
    count: done.filter((c) => c.experience_question_types.some((l) => l.question_type_id === t.id)).length,
  }));
  const emptyCount = typeStatus.filter((t) => t.is_experience_based && t.count === 0).length;

  // 답변이 없는 질문을 홈에 보여 줘서 답변이 달리게 한다 (알림이 없으므로).
  const visible = (rows: unknown) => ((rows ?? []) as PostRow[]).filter((p) => !p.is_hidden);
  const unanswered = visible(qna.data).filter((q) => !q.is_answered).slice(0, 3);
  const recent = [...visible(qna.data).slice(0, 3), ...visible(review.data), ...visible(tip.data)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  const { count: credentialCount } = await supabase
    .from("credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {profile.name}님</h1>
      <p className="text-navy-700">
        {profile.cohort}학번 · {STATUS_LABEL[profile.status]}
        {profile.role === "admin" && " · 관리자"}
      </p>
      <div className="space-y-2 rounded-lg bg-navy-50 p-4">
        <p>
          내 경험 카드 <b>{cards.length}개</b>
          {drafts > 0 && <span className="text-safety-600"> (임시 저장 {drafts}개)</span>}
        </p>
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          <Link href="/experiences" className="underline">
            내 경험 목록
          </Link>
          <Link href="/experiences/by-question" className="underline">
            문항 유형별 보기
          </Link>
        </div>
        <p className="pt-2">
          자격증·교육 기록 <b>{credentialCount ?? 0}개</b>
        </p>
        <Link href="/credentials" className="inline-block text-sm font-bold underline">
          자격증·교육 관리
        </Link>
      </div>
      <div className="space-y-2 rounded-lg border border-navy-100 p-4">
        <p className="font-bold">자소서 문항 유형별 내 경험</p>
        {emptyCount > 0 && (
          <p className="text-sm text-safety-600">⚠️ 경험이 없는 문항이 {emptyCount}개 있어요. 완성한 카드를 문항 유형에 연결해 보세요.</p>
        )}
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {typeStatus.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">
              <span>{t.name}</span>
              {!t.is_experience_based ? (
                <span className="text-navy-700">경험 외 문항</span>
              ) : t.count === 0 ? (
                <span className="font-bold text-safety-600">⚠️ 비어 있음</span>
              ) : (
                <b>{t.count}개</b>
              )}
            </li>
          ))}
        </ul>
        <Link href="/experiences/by-question" className="inline-block text-sm font-bold underline">
          문항 유형별로 자세히 보기
        </Link>
      </div>
      <div className="space-y-2 rounded-lg bg-navy-50 p-4">
        <p className="font-bold">선배·동기는 어떻게 썼을까?</p>
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          <Link href="/activities" className="underline">
            동아리 활동
          </Link>
          <Link href="/experiences/shared" className="underline">
            공개 경험 목록
          </Link>
          <Link href="/archive" className="underline">
            선배 아카이브
          </Link>
        </div>
      </div>
      {unanswered.length > 0 && (
        <div className="space-y-2 rounded-lg border border-safety-500 p-4">
          <p className="font-bold">답변을 기다리는 질문</p>
          <ul className="space-y-1 text-sm">
            {unanswered.map((q) => (
              <li key={q.id}>
                <Link href={`/archive/${q.id}`} className="underline">
                  {q.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {recent.length > 0 && (
        <div className="space-y-2 rounded-lg border border-navy-100 p-4">
          <p className="font-bold">최근 아카이브 글</p>
          <ul className="space-y-1 text-sm">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/archive/${p.id}`} className="underline">
                  {p.title}
                </Link>
                <span className="text-navy-700"> · {BOARD_LABEL[p.board]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {profile.role === "admin" && (
        <Link href="/admin/approvals" className="inline-block font-bold text-safety-600 underline">
          관리자 메뉴 (가입 승인 · 회원 · 활동 · 태그·문항 유형)
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <SignOutButton />
        <Link href="/me" className="text-sm text-navy-700 underline">
          마이페이지
        </Link>
      </div>
    </div>
  );
}
