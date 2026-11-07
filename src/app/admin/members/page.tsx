import { Suspense } from "react";
import { requireStage, STATUS_LABEL, type MemberRole, type MemberStatus } from "@/lib/auth";
import { ConfirmButton } from "@/app/confirm-button";
import { removeMember, setAdmin, updateStatus } from "./actions";

type Member = {
  id: string;
  name: string;
  cohort: number;
  status: MemberStatus;
  role: MemberRole;
  email: string;
};

const smallButton = "rounded-lg border border-navy-100 px-3 py-1 text-sm";

export default function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">회원 관리</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <MemberList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MemberList({ searchParams }: Pick<PageProps<"/admin/members">, "searchParams">) {
  const { supabase, userId } = await requireStage("admin");
  const { error: errorMessage } = await searchParams;
  const { data, error } = await supabase.rpc("list_members");
  if (error) throw new Error(error.message);
  const members = (data ?? []) as Member[];

  return (
    <>
      {typeof errorMessage === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
          {errorMessage}
        </p>
      )}
      <p className="text-sm text-navy-700">승인된 회원 {members.length}명</p>
      <ul className="space-y-3">
        {members.map((m) => {
          const isMe = m.id === userId;
          return (
            <li key={m.id} className="space-y-3 rounded-lg border border-navy-100 p-4">
              <div>
                <p className="font-bold">
                  {m.name}
                  {isMe && <span className="font-normal text-navy-700"> (나)</span>}
                  {m.role === "admin" && (
                    <span className="ml-2 rounded bg-safety-500 px-2 py-0.5 text-xs text-white">관리자</span>
                  )}
                </p>
                <p className="text-sm text-navy-700">
                  {m.cohort}학번 · {STATUS_LABEL[m.status]} · {m.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={updateStatus.bind(null, m.id)} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${m.id}`}>
                    상태
                  </label>
                  <select
                    id={`status-${m.id}`}
                    name="status"
                    defaultValue={m.status}
                    className="rounded-lg border border-navy-100 px-2 py-1 text-sm"
                  >
                    <option value="enrolled">재학</option>
                    <option value="on_leave">휴학</option>
                    <option value="graduated">졸업</option>
                  </select>
                  <button className={smallButton}>상태 저장</button>
                </form>

                <form action={setAdmin.bind(null, m.id, m.role !== "admin")}>
                  <button className={smallButton}>{m.role === "admin" ? "관리자 해제" : "관리자로 지정"}</button>
                </form>

                {m.role === "member" && !isMe && (
                  <form action={removeMember.bind(null, m.id)}>
                    <ConfirmButton
                      message={`${m.name}님을 삭제할까요? 로그인 계정과 기록이 모두 지워지고 되돌릴 수 없어요.`}
                    >
                      회원 삭제
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
