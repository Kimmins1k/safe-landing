"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

// 브라우저 기본 확인 창(confirm)은 앱 안 브라우저 등에서 막힐 수 있어, 화면 안에서 한 번 더 누르게 한다.
export function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <button type="button" className="rounded-lg border border-navy-100 px-3 py-1" onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-safety-600">{message}</span>
      <button type="submit" disabled={pending} className="rounded-lg bg-navy-900 px-3 py-1 text-white disabled:opacity-60">
        {pending ? "처리 중…" : `${children} 확정`}
      </button>
      <button type="button" disabled={pending} className="rounded-lg border border-navy-100 px-3 py-1" onClick={() => setAsking(false)}>
        취소
      </button>
    </span>
  );
}
