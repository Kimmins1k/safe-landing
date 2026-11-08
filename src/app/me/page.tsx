import Link from "next/link";
import { Suspense } from "react";
import { ConfirmButton } from "@/app/confirm-button";
import { requireStage } from "@/lib/auth";
import { deleteAccount } from "./actions";
import { ProfileForm } from "./profile-form";

export default function MePage({ searchParams }: PageProps<"/me">) {
  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-navy-700 underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">마이페이지</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <Me searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Me({ searchParams }: Pick<PageProps<"/me">, "searchParams">) {
  const { profile } = await requireStage("member");
  const { error } = await searchParams;
  if (!profile) return null;

  return (
    <>
      {typeof error === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">내 정보</h2>
        <ProfileForm name={profile.name} cohort={profile.cohort} status={profile.status} />
      </section>

      <section className="space-y-3 rounded-lg border border-navy-100 p-4">
        <h2 className="text-xl font-bold">탈퇴</h2>
        <p className="text-sm leading-relaxed">
          탈퇴하면 로그인 계정, 내 정보, 경험 카드가 <b>바로 삭제되고 되돌릴 수 없어요.</b> 다시 이용하려면 새로 가입하고 승인을 받아야 해요.
        </p>
        <form action={deleteAccount}>
          <ConfirmButton message="정말 탈퇴할까요? 되돌릴 수 없어요.">탈퇴</ConfirmButton>
        </form>
      </section>
    </>
  );
}
