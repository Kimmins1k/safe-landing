"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const buttonClass =
  "w-full rounded-lg bg-safety-500 px-4 py-3 font-bold text-white hover:bg-safety-600 disabled:opacity-60";

export function LoginButton({ mode }: { mode: "google" | "copy" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (mode === "copy") {
    return (
      <>
        <button
          className={buttonClass}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.origin);
              setMessage("주소를 복사했어요. 크롬이나 사파리에 붙여 넣어 주세요.");
            } catch {
              setMessage(`주소: ${window.location.origin}`);
            }
          }}
        >
          주소 복사하기
        </button>
        {message && <p role="status">{message}</p>}
      </>
    );
  }

  return (
    <>
      <button
        className={buttonClass}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { error } = await createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) {
            setMessage("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
            setBusy(false);
          }
        }}
      >
        구글로 로그인
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
