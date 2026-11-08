import { PageSkeleton } from "@/app/skeleton";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { SignOutButton } from "../sign-out-button";

export default function PendingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Pending />
    </Suspense>
  );
}

async function Pending() {
  const { profile } = await requireStage("pending");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">승인을 기다리고 있어요</h1>
      <p>
        {profile?.name}님의 가입 신청이 접수됐어요. 임원진이 승인하면 바로 이용할 수 있어요. 오래 걸리면 임원진에게
        말해 주세요.
      </p>
      <SignOutButton />
    </div>
  );
}
