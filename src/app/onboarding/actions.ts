"use server";

import { redirect } from "next/navigation";
import { requireStage, type MemberStatus } from "@/lib/auth";

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

  redirect("/pending");
}
