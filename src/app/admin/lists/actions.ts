"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";

export type ListTable = "competency_tags" | "question_types";

function fail(message: string): never {
  redirect(`/admin/lists?error=${encodeURIComponent(message)}`);
}

function done() {
  // 경험 작성·문항 유형별 보기에서도 이 목록을 쓴다.
  revalidatePath("/", "layout");
  redirect("/admin/lists");
}

// 화면에서 온 테이블 이름은 믿지 않고 두 개 중 하나인지 확인한다.
function checkTable(table: string): ListTable {
  if (table !== "competency_tags" && table !== "question_types") fail("잘못된 요청이에요.");
  return table;
}

function readForm(table: ListTable, formData: FormData): Record<string, string | number | boolean> {
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  if (name.length < 1 || name.length > 40) fail("이름을 1~40자로 입력해 주세요.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) fail("순서는 0~9999 사이의 정수로 입력해 주세요.");
  if (table === "competency_tags") return { name, sort_order: sortOrder };

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > 500) fail("설명은 500자까지 쓸 수 있어요.");
  return { name, sort_order: sortOrder, description, is_experience_based: formData.get("is_experience_based") === "on" };
}

function failFromDb(error: { code?: string }, fallback: string): never {
  fail(error.code === "23505" ? "같은 이름이 이미 있어요." : fallback);
}

export async function createItem(table: string, formData: FormData) {
  const t = checkTable(table);
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.from(t).insert(readForm(t, formData));
  if (error) failFromDb(error, "등록하지 못했어요.");
  done();
}

export async function updateItem(table: string, id: number, formData: FormData) {
  const t = checkTable(table);
  const { supabase } = await requireStage("admin");
  const { data, error } = await supabase.from(t).update(readForm(t, formData)).eq("id", id).select("id");
  if (error) failFromDb(error, "고치지 못했어요.");
  if (!data?.length) fail("고치지 못했어요.");
  done();
}

export async function setItemActive(table: string, id: number, active: boolean) {
  const t = checkTable(table);
  const { supabase } = await requireStage("admin");
  const { data, error } = await supabase.from(t).update({ is_active: active }).eq("id", id).select("id");
  if (error || !data?.length) fail("사용 상태를 바꾸지 못했어요.");
  done();
}
