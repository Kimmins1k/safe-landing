"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Toast } from "@/app/toast";

export function CopyButton({ text }: { text: string }) {
  const [copiedAt, setCopiedAt] = useState(0);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-1 text-sm text-white"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setFailed(false);
            setCopiedAt(Date.now());
          } catch {
            setFailed(true); // 앱 안 브라우저 등에서 복사가 막힐 수 있다
          }
        }}
      >
        <Copy aria-hidden size={16} />
        초안 재료 복사
      </button>
      {failed && (
        <p role="alert" className="w-full text-sm text-safety-700">
          복사가 막혔어요. 아래 글을 길게 눌러 직접 복사해 주세요.
        </p>
      )}
      {copiedAt > 0 && <Toast key={copiedAt}>복사했어요</Toast>}
    </>
  );
}
