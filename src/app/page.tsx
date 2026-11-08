import Link from "next/link";
import { Suspense } from "react";
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
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {profile.name}님</h1>
      <p className="text-navy-700">
        {profile.cohort}학번 · {STATUS_LABEL[profile.status]}
        {profile.role === "admin" && " · 관리자"}
      </p>
      {/* shortcut: 자격증·아카이브 홈 요약은 1월 일정에서 채운다 */}
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
        </div>
      </div>
      {profile.role === "admin" && (
        <Link href="/admin/approvals" className="inline-block font-bold text-safety-600 underline">
          관리자 메뉴 (가입 승인 · 회원 · 활동 · 태그·문항 유형)
        </Link>
      )}
      <SignOutButton />
    </div>
  );
}
