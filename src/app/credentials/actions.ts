"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";
import { DONE_STATUSES, KIND_LABEL, STATUSES_BY_KIND, type Credential, type CredentialKind, type CredentialStatus } from "@/lib/credential";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): never {
  redirect(`/credentials?error=${encodeURIComponent(message)}`);
}

function done() {
  revalidatePath("/", "layout");
  redirect("/credentials");
}

// 추가·수정이 실패하면 이동하지 않고 쓴 내용을 돌려준다. n이 바뀌면 폼을 새로 그린다 (성공하면 values 없이 비운다).
export type CredentialValues = Pick<Credential, "kind" | "status" | "name" | "memo" | "visibility" | "exam_date" | "acquired_date">;
export type CredentialState = { error?: string; values?: CredentialValues; n: number; savedAt?: number };

function formValues(formData: FormData): CredentialValues {
  const raw = (k: string) => String(formData.get(k) ?? "");
  return {
    kind: raw("kind") as CredentialKind,
    status: raw("status") as CredentialStatus,
    name: raw("name"),
    memo: raw("memo"),
    visibility: raw("visibility") === "club" ? "club" : "private",
    exam_date: raw("exam_date") || null,
    acquired_date: raw("acquired_date") || null,
  };
}

// 화면에서 온 값은 믿지 않고 다시 확인한다. DB 규칙도 한 번 더 막는다.
function check(v: CredentialValues): string | null {
  if (!Object.hasOwn(KIND_LABEL, v.kind)) return "구분을 골라 주세요.";
  if (!STATUSES_BY_KIND[v.kind].includes(v.status)) return "구분에 맞는 상태를 골라 주세요.";
  const name = v.name.trim();
  if (name.length < 1 || name.length > 100) return "이름을 1~100자로 입력해 주세요.";
  if (v.memo.trim().length > 1000) return "메모는 1000자까지 쓸 수 있어요.";
  for (const d of [v.exam_date, v.acquired_date]) if (d && !DATE.test(d)) return "날짜를 다시 입력해 주세요.";
  return null;
}

function toRow(v: CredentialValues) {
  return {
    kind: v.kind,
    status: v.status,
    name: v.name.trim(),
    memo: v.memo.trim(),
    visibility: v.visibility,
    exam_date: v.exam_date,
    // 취득일·이수일은 끝난 상태일 때만 저장한다.
    acquired_date: DONE_STATUSES.includes(v.status) ? v.acquired_date : null,
  };
}

export async function createCredential(prev: CredentialState, formData: FormData): Promise<CredentialState> {
  const v = formValues(formData);
  const message = check(v);
  if (message) return { error: message, values: v, n: prev.n + 1 };
  const { supabase } = await requireStage("member");
  const { error } = await supabase.from("credentials").insert(toRow(v));
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", values: v, n: prev.n + 1 };
  revalidatePath("/", "layout");
  return { n: prev.n + 1, savedAt: Date.now() };
}

export async function updateCredential(id: string, prev: CredentialState, formData: FormData): Promise<CredentialState> {
  const v = formValues(formData);
  const message = check(v);
  if (message) return { error: message, values: v, n: prev.n + 1 };
  const { supabase, userId } = await requireStage("member");
  const { data, error } = await supabase.from("credentials").update(toRow(v)).eq("id", id).eq("user_id", userId).select("id");
  if (error || !data?.length) return { error: "고치지 못했어요. 잠시 후 다시 시도해 주세요.", values: v, n: prev.n + 1 };
  revalidatePath("/", "layout");
  return { n: prev.n + 1, savedAt: Date.now() };
}

export async function deleteCredential(id: string) {
  const { supabase, userId } = await requireStage("member");
  const { error } = await supabase.from("credentials").delete().eq("id", id).eq("user_id", userId);
  if (error) fail("삭제하지 못했어요.");
  done();
}
