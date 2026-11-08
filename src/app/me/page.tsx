import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmButton } from "@/app/confirm-button";
import { SignOutButton } from "@/app/sign-out-button";
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
      <Suspense fallback={<PageSkeleton />}>
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
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-700">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">내 정보</h2>
        <ProfileForm name={profile.name} cohort={profile.cohort} status={profile.status} />
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-sm text-navy-700">이 기기에서 로그아웃해요.</p>
        <SignOutButton />
      </section>

      <section className="space-y-3 card p-4">
        <h2 className="text-xl font-bold">탈퇴</h2>
        <p className="text-sm leading-relaxed">
          탈퇴하면 로그인 계정, 내 정보, 자격증·교육 기록, <b>비공개·임시 저장 경험 카드</b>가 <b>바로 삭제되고 되돌릴 수 없어요.</b> 다시
          이용하려면 새로 가입하고 승인을 받아야 해요.
        </p>
        <p className="rounded-xl bg-navy-50 p-3 text-sm leading-relaxed">
          <b>동아리원 공개</b>로 완성한 경험 카드는 후배들이 계속 볼 수 있도록 이름과 기수를 지우고 &quot;탈퇴한 회원&quot;으로 남아요. 남기고 싶지
          않은 카드는 탈퇴 전에 비공개로 바꾸거나 지워 주세요.
        </p>
        <form action={deleteAccount} className="space-y-3">
          <fieldset className="space-y-1 text-sm">
            <legend className="font-bold">아카이브에 쓴 글·댓글은?</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="archive" value="keep" defaultChecked />
              남기기 (작성자가 &quot;탈퇴한 회원&quot;으로 표시돼요)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="archive" value="delete" />
              모두 지우기
            </label>
          </fieldset>
          <ConfirmButton message="정말 탈퇴할까요? 되돌릴 수 없어요.">탈퇴</ConfirmButton>
        </form>
      </section>
    </>
  );
}
