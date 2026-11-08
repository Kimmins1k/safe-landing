"use client";

import { useState } from "react";
import {
  DONE_STATUSES,
  KIND_LABEL,
  STATUS_LABEL,
  STATUSES_BY_KIND,
  type Credential,
  type CredentialKind,
  type CredentialStatus,
} from "@/lib/credential";

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";

// 구분에 따라 고를 수 있는 상태와 날짜 칸이 바뀐다.
export function CredentialFields({ item }: { item?: Credential }) {
  const [kind, setKind] = useState<CredentialKind>(item?.kind ?? "certificate");
  const [status, setStatus] = useState<CredentialStatus>(item?.status ?? "preparing");

  const changeKind = (k: CredentialKind) => {
    setKind(k);
    if (!STATUSES_BY_KIND[k].includes(status)) setStatus(STATUSES_BY_KIND[k][0]);
  };
  const isDone = DONE_STATUSES.includes(status);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        구분
        <select name="kind" value={kind} onChange={(e) => changeKind(e.target.value as CredentialKind)} className={inputClass}>
          {(Object.keys(KIND_LABEL) as CredentialKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        상태
        <select name="status" value={status} onChange={(e) => setStatus(e.target.value as CredentialStatus)} className={inputClass}>
          {STATUSES_BY_KIND[kind].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        이름
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name}
          placeholder={kind === "certificate" ? "산업안전기사" : "산업안전보건 교육"}
          className={inputClass}
        />
      </label>
      <label className="block">
        {kind === "certificate" ? "시험일" : "교육일"} (선택)
        <input name="exam_date" type="date" defaultValue={item?.exam_date ?? ""} className={inputClass} />
      </label>
      {isDone && (
        <label className="block">
          {kind === "certificate" ? "취득일" : "이수일"} (선택)
          <input name="acquired_date" type="date" defaultValue={item?.acquired_date ?? ""} className={inputClass} />
        </label>
      )}
      <label className="block sm:col-span-2">
        메모 (선택)
        <textarea name="memo" maxLength={1000} rows={2} defaultValue={item?.memo} className={inputClass} />
      </label>
      <label className="block">
        공개 범위
        <select name="visibility" defaultValue={item?.visibility ?? "private"} className={inputClass}>
          <option value="private">비공개 (나만 보기)</option>
          <option value="club">동아리원 공개</option>
        </select>
      </label>
    </div>
  );
}
