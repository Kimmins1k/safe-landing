"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded-lg bg-navy-900 px-3 py-1 text-sm text-white"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setDone(true);
      }}
    >
      {done ? "복사했어요" : "초안 재료 복사"}
    </button>
  );
}
