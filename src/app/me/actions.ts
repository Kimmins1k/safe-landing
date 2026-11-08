"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage, type MemberStatus } from "@/lib/auth";

const STATUSES: MemberStatus[] = ["enrolled", "on_leave", "graduated"];

export type MeState = { error?: string; saved?: boolean };

// 이름·기수·상태만 고칠 수 있다. 권한(role)은 DB가 막는다.
export async function updateProfile(_prev: MeState, formData: FormData): Promise<MeState> {
  const { supabase, userId } = await requireStage("member");

  const name = String(formData.get("name") ?? "").trim();
  const cohort = Number(formData.get("cohort"));
  const status = String(formData.get("status")) as MemberStatus;
  if (name.length < 1 || name.length > 30) return { error: "이름을 1~30자로 입력해 주세요." };
  if (!Number.isInteger(cohort) || cohort < 2000 || cohort > 2100) return { error: "기수(입학년도)를 4자리 숫자로 입력해 주세요. 예: 2025" };
  if (!STATUSES.includes(status)) return { error: "상태를 골라 주세요." };

  const { data, error } = await supabase.from("profiles").update({ name, cohort, status }).eq("id", userId).select("id");
  if (error || !data?.length) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/", "layout");
  return { saved: true };
}

// 탈퇴: 로그인 계정을 지우면 프로필과 경험 카드가 함께 지워진다 (DB 연쇄 삭제).
// 계정 삭제는 서버 전용 키가 필요해서 여기서만 쓴다. 마지막 관리자는 DB 트리거가 막는다.
export async function deleteAccount() {
  const { supabase, userId, profile } = await requireStage("member");

  if (profile?.role === "admin") {
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) {
      redirect(`/me?error=${encodeURIComponent("마지막 관리자는 탈퇴할 수 없어요. 먼저 다른 회원에게 관리자 권한을 넘겨 주세요.")}`);
    }
  }

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) redirect(`/me?error=${encodeURIComponent("탈퇴하지 못했어요. 잠시 후 다시 시도하거나 임원진에게 문의해 주세요.")}`);

  await supabase.auth.signOut({ scope: "local" }); // 서버 호출 없이 이 브라우저의 로그인 쿠키만 지운다
  redirect("/login");
}
