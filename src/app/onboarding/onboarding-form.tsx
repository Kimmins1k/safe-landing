"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitOnboarding } from "./actions";

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(submitOnboarding, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        이름
        <input name="name" required maxLength={30} className={inputClass} />
      </label>
      <label className="block">
        기수 (입학년도)
        <input name="cohort" required inputMode="numeric" pattern="[0-9]{4}" placeholder="2025" className={inputClass} />
      </label>
      <label className="block">
        상태
        <select name="status" defaultValue="enrolled" className={inputClass}>
          <option value="enrolled">재학</option>
          <option value="on_leave">휴학</option>
          <option value="graduated">졸업</option>
        </select>
      </label>

      <div className="rounded-lg bg-navy-50 p-4 text-sm leading-relaxed">
        <p className="font-bold">개인정보 수집·이용 안내</p>
        <ul className="mt-2 list-disc pl-5">
          <li>수집 항목: 이름, 기수, 상태, 구글 이메일</li>
          <li>목적: 동아리원 확인과 가입 승인, 서비스 제공</li>
          <li>보관 기간: 탈퇴할 때까지 (거절되면 바로 삭제)</li>
          <li>탈퇴해도 동아리원 공개로 완성한 경험 카드는 이름·기수를 지우고 &quot;탈퇴한 회원&quot;으로 남습니다.</li>
          <li>모든 정보는 승인된 동아리원에게만 보이고, 이메일은 임원진만 봅니다.</li>
        </ul>
        <Link href="/privacy" className="mt-2 inline-block underline">
          개인정보 처리방침 전체 보기
        </Link>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="consent" required />
        개인정보 수집·이용에 동의합니다.
      </label>

      {state.error && (
        <p role="alert" className="text-safety-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-safety-500 px-4 py-3 font-bold text-navy-900 hover:bg-safety-600 disabled:opacity-60"
      >
        가입 신청하기
      </button>
    </form>
  );
}
