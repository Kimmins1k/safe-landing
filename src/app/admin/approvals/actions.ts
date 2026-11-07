"use server";

import { revalidatePath } from "next/cache";
import { requireStage } from "@/lib/auth";

// 관리자 확인은 DB 함수 안에서도 한 번 더 한다 (화면 확인만 믿지 않는다).
export async function approveMember(target: string) {
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.rpc("set_member_role", { target, new_role: "member" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approvals");
}

export async function rejectMember(target: string) {
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.rpc("reject_member", { target });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approvals");
}
