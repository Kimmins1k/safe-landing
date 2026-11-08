"use client";

import { useActionState } from "react";
import type { CommentValues, FormState } from "../actions";

// 댓글 쓰기. 실패하면 쓴 댓글을 그대로 다시 채우고, 성공하면 비운다.
export function CommentForm({ action }: { action: (prev: FormState<CommentValues>, formData: FormData) => Promise<FormState<CommentValues>> }) {
  const [state, formAction, pending] = useActionState(action, { n: 0 });

  return (
    <form key={state.n} action={formAction} className="space-y-2 rounded-lg bg-navy-50 p-4">
      <label className="block font-bold">
        댓글 쓰기
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={3}
          defaultValue={state.values?.body}
          className="mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 font-normal"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="anonymous" defaultChecked={state.values?.anonymous} />
        익명으로 쓰기 (관리자는 작성자를 확인할 수 있어요)
      </label>
      {/* 오류는 누른 버튼 바로 위에 둔다. 긴 글을 쓰고 아래에서 누르면 위쪽 안내는 안 보인다. */}
      {state.error && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-sm text-safety-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600 disabled:opacity-60">
        {pending ? "올리는 중…" : "댓글 올리기"}
      </button>
    </form>
  );
}
