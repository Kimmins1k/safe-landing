"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";
import { ACTIVITY_CATEGORY_LABEL, type ActivityCategory } from "@/lib/experience";

function fail(message: string): never {
  redirect(`/admin/activities?error=${encodeURIComponent(message)}`);
}

function done() {
  revalidatePath("/admin/activities");
  redirect("/admin/activities");
}

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const category = String(formData.get("category")) as ActivityCategory;
  const description = String(formData.get("description") ?? "").trim();
  if (title.length < 1 || title.length > 100) fail("활동명을 1~100자로 입력해 주세요.");
  if (semester.length < 1 || semester.length > 20) fail("학기를 입력해 주세요. 예: 2026-2");
  if (!Object.hasOwn(ACTIVITY_CATEGORY_LABEL, category)) fail("분류를 골라 주세요.");
  if (description.length > 2000) fail("설명은 2000자까지 쓸 수 있어요.");
  return { title, semester, category, description };
}

export async function createActivity(formData: FormData) {
  const { supabase } = await requireStage("admin");
  const { error } = await supabase.from("activities").insert(readForm(formData));
  if (error) fail("활동을 등록하지 못했어요.");
  done();
}

export async function updateActivity(id: number, formData: FormData) {
  const { supabase } = await requireStage("admin");
  const { data, error } = await supabase.from("activities").update(readForm(formData)).eq("id", id).select("id");
  if (error || !data?.length) fail("활동을 고치지 못했어요.");
  done();
}

export async function setActivityHidden(id: number, hidden: boolean) {
  const { supabase } = await requireStage("admin");
  const { data, error } = await supabase.from("activities").update({ is_hidden: hidden }).eq("id", id).select("id");
  if (error || !data?.length) fail("숨김 상태를 바꾸지 못했어요.");
  done();
}
