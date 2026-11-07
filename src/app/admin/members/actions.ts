"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage, type MemberStatus } from "@/lib/auth";

const STATUSES: MemberStatus[] = ["enrolled", "on_leave", "graduated"];

// 실패하면 화면 위쪽에 이유를 보여 준다 (예: 마지막 관리자 해제).
function fail(message: string): never {
  redirect(`/admin/members?error=${encodeURIComponent(message)}`);
}

function done() {
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function updateStatus(target: string, formData: FormData) {
  const { supabase } = await requireStage("admin");
  const status = String(formData.get("status")) as MemberStatus;
  if (!STATUSES.includes(status)) fail("상태 값이 올바르지 않아요.");

  const { data, error } = await supabase.from("profiles").update({ status }).eq("id", target).select("id");
  if (error || !data?.length) fail("상태를 바꾸지 못했어요.");
  done();
}

export async function setAdmin(target: string, makeAdmin: boolean) {
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.rpc("set_member_role", { target, new_role: makeAdmin ? "admin" : "member" });
  if (error) fail(error.message);
  done();
}

export async function removeMember(target: string) {
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.rpc("remove_member", { target });
  if (error) fail(error.message);
  done();
}
