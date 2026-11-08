"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";
import { DONE_STATUSES, KIND_LABEL, STATUSES_BY_KIND, type CredentialKind, type CredentialStatus } from "@/lib/credential";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): never {
  redirect(`/credentials?error=${encodeURIComponent(message)}`);
}

function done() {
  revalidatePath("/", "layout");
  redirect("/credentials");
}

// 화면에서 온 값은 믿지 않고 다시 확인한다. DB 규칙도 한 번 더 막는다.
function readForm(formData: FormData) {
  const kind = String(formData.get("kind")) as CredentialKind;
  const status = String(formData.get("status")) as CredentialStatus;
  const name = String(formData.get("name") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();
  const visibility = formData.get("visibility") === "club" ? "club" : "private";
  const date = (key: string) => {
    const v = String(formData.get(key) ?? "");
    if (v && !DATE.test(v)) fail("날짜를 다시 입력해 주세요.");
    return v || null;
  };

  if (!(kind in KIND_LABEL)) fail("구분을 골라 주세요.");
  if (!STATUSES_BY_KIND[kind].includes(status)) fail("구분에 맞는 상태를 골라 주세요.");
  if (name.length < 1 || name.length > 100) fail("이름을 1~100자로 입력해 주세요.");
  if (memo.length > 1000) fail("메모는 1000자까지 쓸 수 있어요.");

  return {
    kind,
    status,
    name,
    memo,
    visibility,
    exam_date: date("exam_date"),
    // 취득일·이수일은 끝난 상태일 때만 저장한다.
    acquired_date: DONE_STATUSES.includes(status) ? date("acquired_date") : null,
  };
}

export async function createCredential(formData: FormData) {
  const { supabase } = await requireStage("member");
  const { error } = await supabase.from("credentials").insert(readForm(formData));
  if (error) fail("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  done();
}

export async function updateCredential(id: string, formData: FormData) {
  const { supabase, userId } = await requireStage("member");
  const { data, error } = await supabase.from("credentials").update(readForm(formData)).eq("id", id).eq("user_id", userId).select("id");
  if (error || !data?.length) fail("고치지 못했어요. 잠시 후 다시 시도해 주세요.");
  done();
}

export async function deleteCredential(id: string) {
  const { supabase, userId } = await requireStage("member");
  const { error } = await supabase.from("credentials").delete().eq("id", id).eq("user_id", userId);
  if (error) fail("삭제하지 못했어요.");
  done();
}
