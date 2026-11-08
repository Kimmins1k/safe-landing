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
      {/* shortcut: 아카이브 홈 요약은 아카이브를 만들 때 채운다 */}
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
        </div>
      </div>
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
