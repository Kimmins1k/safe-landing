import Link from "next/link";
import { Suspense } from "react";
import { ConfirmButton } from "@/app/confirm-button";
import { requireStage } from "@/lib/auth";
import { KIND_LABEL, STATUS_LABEL, type Credential } from "@/lib/credential";
import { createCredential, deleteCredential, updateCredential } from "./actions";
import { CredentialFields } from "./credential-fields";

export default function CredentialsPage({ searchParams }: PageProps<"/credentials">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-navy-700 underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">자격증·교육</h1>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function List({ searchParams }: Pick<PageProps<"/credentials">, "searchParams">) {
  const { supabase, userId } = await requireStage("member");
  const { error: errorMessage } = await searchParams;

  // 다른 회원의 공개 기록도 DB가 함께 돌려주므로 내 것만 거른다.
  const { data, error } = await supabase
    .from("credentials")
    .select("id, kind, name, status, exam_date, acquired_date, memo, visibility")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const items = (data ?? []) as Credential[];

  return (
    <>
      {typeof errorMessage === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
          {errorMessage}
        </p>
      )}

      <form action={createCredential} className="space-y-3 rounded-lg bg-navy-50 p-4">
        <p className="font-bold">새 기록 추가</p>
        <CredentialFields />
        <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600">추가</button>
      </form>

      {items.length === 0 && <p>아직 기록이 없어요. 준비 중인 자격증도 먼저 남겨 두세요.</p>}
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-navy-100 p-4">
            <details>
              <summary className="cursor-pointer">
                <span className="font-bold">{c.name}</span>
                <span className="text-sm text-navy-700">
                  {" "}
                  · {KIND_LABEL[c.kind]} · {STATUS_LABEL[c.status]}
                  {c.acquired_date && ` · ${c.acquired_date}`}
                  {c.visibility === "club" && " · 동아리원 공개"}
                </span>
              </summary>
              <form action={updateCredential.bind(null, c.id)} className="mt-3 space-y-3">
                <CredentialFields item={c} />
                <button className="rounded-lg border border-navy-100 px-3 py-1 text-sm">수정 저장</button>
              </form>
            </details>
            <form action={deleteCredential.bind(null, c.id)} className="mt-2">
              <ConfirmButton message="이 기록을 지울까요? 되돌릴 수 없어요.">삭제</ConfirmButton>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
