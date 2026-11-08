"use client";

import { useActionState } from "react";
import { Toast } from "@/app/toast";
import type { Credential } from "@/lib/credential";
import type { CredentialState } from "./actions";
import { CredentialFields } from "./credential-fields";

// 자격증 추가·수정 폼. 실패하면 쓴 내용을 그대로 다시 채우고, 성공하면 알림을 띄운다.
export function CredentialForm({
  item,
  action,
  submitLabel,
  className,
  buttonClass,
}: {
  item?: Credential;
  action: (prev: CredentialState, formData: FormData) => Promise<CredentialState>;
  submitLabel: string;
  className: string;
  buttonClass: string;
}) {
  const [state, formAction, pending] = useActionState(action, { n: 0 });

  return (
    <form key={state.n} action={formAction} className={className}>
      <CredentialFields item={state.values ? { ...item, id: item?.id ?? "", ...state.values } : item} />
      {/* 오류는 누른 버튼 바로 위에 둔다. 긴 글을 쓰고 아래에서 누르면 위쪽 안내는 안 보인다. */}
      {state.error && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-sm text-safety-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={`${buttonClass} disabled:opacity-60`}>
        {pending ? "저장 중…" : submitLabel}
      </button>
      {state.savedAt && <Toast key={state.savedAt}>저장했어요</Toast>}
    </form>
  );
}
