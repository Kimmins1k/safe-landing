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
  const { profile } = await requireStage("member");
  if (!profile) return null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {profile.name}님</h1>
      <p className="text-navy-700">
        {profile.cohort}학번 · {STATUS_LABEL[profile.status]}
        {profile.role === "admin" && " · 관리자"}
      </p>
      {/* shortcut: 경험 카드·아카이브 홈 요약은 12월~1월 일정에서 채운다 */}
      <p className="rounded-lg bg-navy-50 p-4">경험 카드 기능은 곧 열려요.</p>
      {profile.role === "admin" && (
        <Link href="/admin/approvals" className="inline-block font-bold text-safety-600 underline">
          관리자 메뉴 (가입 승인 · 회원 관리)
        </Link>
      )}
      <SignOutButton />
    </div>
  );
}
