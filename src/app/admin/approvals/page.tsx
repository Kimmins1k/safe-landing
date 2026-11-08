import { PageSkeleton } from "@/app/skeleton";
import { Suspense } from "react";
import { requireStage, STATUS_LABEL, type MemberStatus } from "@/lib/auth";
import { approveMember, rejectMember } from "./actions";
import { ConfirmButton } from "@/app/confirm-button";
import { PushToggle } from "./push-toggle";

type PendingMember = {
  id: string;
  name: string;
  cohort: number;
  status: MemberStatus;
  email: string;
  created_at: string;
};

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">가입 승인</h1>
      <PushToggle />
      <Suspense fallback={<PageSkeleton />}>
        <PendingList />
      </Suspense>
    </div>
  );
}

async function PendingList() {
  const { supabase } = await requireStage("admin");
  const { data, error } = await supabase.rpc("list_pending_members");
  if (error) throw new Error(error.message);
  const members = (data ?? []) as PendingMember[];

  if (members.length === 0) return <p>승인을 기다리는 신청이 없어요.</p>;

  return (
    <ul className="space-y-3">
      {members.map((m) => (
        <li key={m.id} className="card p-4">
          <p className="font-bold">
            {m.name} <span className="font-normal text-navy-700">· {m.cohort}학번 · {STATUS_LABEL[m.status]}</span>
          </p>
          <p className="text-sm text-navy-700">{m.email}</p>
          <p className="text-sm text-navy-700">신청: {new Date(m.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
          <div className="mt-3 flex gap-2">
            <form action={approveMember.bind(null, m.id)}>
              <button className="rounded-lg bg-safety-500 px-3 py-1 font-bold text-navy-900 hover:bg-safety-600">승인</button>
            </form>
            <form action={rejectMember.bind(null, m.id)}>
              <ConfirmButton message={`${m.name}님의 신청을 거절할까요? 입력한 정보와 로그인 계정이 삭제됩니다.`}>
                거절
              </ConfirmButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
