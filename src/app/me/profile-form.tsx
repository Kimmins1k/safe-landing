"use client";

import { useActionState } from "react";
import type { MemberStatus } from "@/lib/auth";
import { updateProfile } from "./actions";

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";

export function ProfileForm({ name, cohort, status }: { name: string; cohort: number; status: MemberStatus }) {
  const [state, action, pending] = useActionState(updateProfile, {});

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        이름
        <input name="name" required maxLength={30} defaultValue={name} className={inputClass} />
      </label>
      <label className="block">
        기수 (입학년도)
        <input name="cohort" required inputMode="numeric" pattern="[0-9]{4}" defaultValue={cohort} className={inputClass} />
      </label>
      <label className="block">
        상태
        <select name="status" defaultValue={status} className={inputClass}>
          <option value="enrolled">재학</option>
          <option value="on_leave">휴학</option>
          <option value="graduated">졸업</option>
        </select>
      </label>
      {state.error && (
        <p role="alert" className="text-safety-600">
          {state.error}
        </p>
      )}
      {state.saved && <p role="status">저장했어요.</p>}
      <button disabled={pending} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600 disabled:opacity-60">
        저장
      </button>
    </form>
  );
}
