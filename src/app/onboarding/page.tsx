import { PageSkeleton } from "@/app/skeleton";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">가입 정보 입력</h1>
      <p>임원진이 확인한 뒤 승인하면 이용할 수 있어요. 학번이나 전화번호는 받지 않아요.</p>
      <Suspense fallback={<PageSkeleton />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  await requireStage("none");
  return <OnboardingForm />;
}
