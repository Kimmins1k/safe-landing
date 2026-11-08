import Link from "next/link";
import { Suspense } from "react";
import type { PostRow } from "@/lib/archive";
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
  const { data: cards } = await supabase.from("experiences").select("is_draft").eq("user_id", userId);
  const drafts = (cards ?? []).filter((c) => c.is_draft).length;
  // 답변이 없는 질문을 홈에 보여 줘서 답변이 달리게 한다 (알림이 없으므로).
  const { data: questions } = await supabase.rpc("list_posts", { p_board: "qna", p_limit: 30 });
  const unanswered = ((questions ?? []) as PostRow[]).filter((q) => !q.is_answered && !q.is_hidden).slice(0, 3);
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
          내 경험 카드 <b>{(cards ?? []).length}개</b>
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
