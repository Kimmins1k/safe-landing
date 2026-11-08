"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireStage, type MemberStatus } from "@/lib/auth";
import { notifyAdmins } from "@/lib/push";

const STATUSES: MemberStatus[] = ["enrolled", "on_leave", "graduated"];

export type OnboardingState = { error?: string };

export async function submitOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { supabase, userId } = await requireStage("none");

  const name = String(formData.get("name") ?? "").trim();
  const cohort = Number(formData.get("cohort"));
  const status = String(formData.get("status")) as MemberStatus;

  if (name.length < 1 || name.length > 30) return { error: "이름을 1~30자로 입력해 주세요." };
  if (!Number.isInteger(cohort) || cohort < 2000 || cohort > 2100)
    return { error: "기수(입학년도)를 4자리 숫자로 입력해 주세요. 예: 2025" };
  if (!STATUSES.includes(status)) return { error: "상태를 골라 주세요." };
  if (formData.get("consent") !== "on") return { error: "개인정보 수집·이용에 동의해야 가입할 수 있어요." };

  // role은 DB 기본값(pending)으로만 들어간다. 직접 넣을 권한이 없다.
  const { error } = await supabase.from("profiles").insert({ id: userId, name, cohort, status });
  if (error && error.code !== "23505") return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  // 새 신청일 때만 임원진 휴대폰에 알린다. 화면 이동을 기다리게 하지 않도록 응답을 보낸 뒤 보낸다.
  if (!error) after(() => notifyAdmins({ title: "새 가입 신청", body: `${name} (${cohort}학번)님이 가입 승인을 기다려요.`, url: "/admin/approvals" }));

  redirect("/pending");
}
