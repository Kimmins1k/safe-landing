"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";
import { EXPERIENCE_TYPES, type Answer, type ExperienceType, type Visibility } from "@/lib/experience";

export type ExperienceInput = {
  id: string;
  type: ExperienceType | null;
  activityId: number | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  answers: Answer[];
  visibility: Visibility;
  isDraft: boolean;
  questionTypeIds: number[];
  tagIds: number[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STEPS = new Set(["situation", "task", "action", "result", "reflection", "extra"]);
const isIdList = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length <= 30 && v.every((n) => Number.isSafeInteger(n) && n > 0);

// 화면에서 오는 값은 믿지 않고 다시 확인한다. DB 규칙도 한 번 더 막는다.
function check(input: ExperienceInput): string | null {
  if (typeof input !== "object" || input === null || !UUID.test(String(input.id))) return "잘못된 요청이에요.";
  if (input.type !== null && !EXPERIENCE_TYPES.includes(input.type)) return "경험 유형을 다시 골라 주세요.";
  if (input.activityId !== null && !(Number.isSafeInteger(input.activityId) && input.activityId > 0)) return "활동을 다시 골라 주세요.";
  if (typeof input.title !== "string" || input.title.length > 100) return "제목은 100자까지 쓸 수 있어요.";
  for (const d of [input.startDate, input.endDate]) if (d !== null && !(typeof d === "string" && DATE.test(d))) return "기간을 다시 입력해 주세요.";
  if (input.startDate && input.endDate && input.endDate < input.startDate) return "끝난 날이 시작한 날보다 빨라요.";
  if (!Array.isArray(input.answers) || input.answers.length > 12) return "답변을 저장하지 못했어요.";
  for (const a of input.answers) {
    if (!a || !STEPS.has(a.step) || typeof a.question !== "string" || typeof a.answer !== "string") return "답변을 저장하지 못했어요.";
    if (a.question.length > 300 || a.answer.length > 3000) return "답변은 질문마다 3000자까지 쓸 수 있어요.";
  }
  if (input.visibility !== "private" && input.visibility !== "club") return "공개 범위를 다시 골라 주세요.";
  if (typeof input.isDraft !== "boolean" || !isIdList(input.questionTypeIds) || !isIdList(input.tagIds)) return "잘못된 요청이에요.";
  if (!input.isDraft) {
    if (!input.type) return "경험 유형을 골라 주세요.";
    if (!input.title.trim()) return "제목을 입력해 주세요.";
    if (input.questionTypeIds.length === 0) return "자소서 문항 유형을 하나 이상 골라 주세요.";
  }
  return null;
}

export async function createExperience(formData?: FormData) {
  const { supabase } = await requireStage("member");
  const { data, error } = await supabase.from("experiences").insert({ is_draft: true }).select("id").single();
  if (error) throw new Error("경험 카드를 만들지 못했어요.");
  // 홈의 "빈 문항" 버튼에서 왔으면 그 문항 유형을 미리 골라 둔다. 막히면(숨긴 문항 등) 작성 화면에서 고르면 되니 넘어간다.
  const qt = Number(formData?.get("qt"));
  if (Number.isSafeInteger(qt) && qt > 0) await supabase.from("experience_question_types").insert({ experience_id: data.id, question_type_id: qt });
  redirect(`/experiences/${data.id}/edit`);
}

// 활동 상세의 "이 활동으로 내 경험 쓰기": 유형(동아리 활동)과 활동을 미리 고른 임시 카드를 만든다.
// 숨긴 활동이나 없는 활동은 DB 트리거(check_new_links)가 막는다.
export async function createExperienceForActivity(activityId: number) {
  if (!Number.isSafeInteger(activityId) || activityId <= 0) throw new Error("활동을 찾지 못했어요.");
  const { supabase } = await requireStage("member");
  const { data, error } = await supabase
    .from("experiences")
    .insert({ is_draft: true, type: "club", activity_id: activityId })
    .select("id")
    .single();
  if (error) throw new Error("경험 카드를 만들지 못했어요.");
  redirect(`/experiences/${data.id}/edit`);
}

export async function saveExperience(input: ExperienceInput): Promise<{ error?: string }> {
  const message = check(input);
  if (message) return { error: message };
  const { supabase } = await requireStage("member");

  const { error } = await supabase.rpc("save_experience", {
    p_id: input.id,
    p_type: input.type,
    p_activity_id: input.type === "club" ? input.activityId : null,
    p_title: input.title.trim(),
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_answers: input.answers.map(({ step, question, answer }) => ({ step, question, answer })),
    p_visibility: input.visibility,
    p_is_draft: input.isDraft,
    p_question_type_ids: input.questionTypeIds,
    p_tag_ids: input.tagIds,
  });
  if (error) return { error: error.code === "22023" || error.code === "P0002" ? error.message : "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  if (!input.isDraft) revalidatePath("/experiences", "layout");
  return {};
}

export async function setVisibility(id: string, visibility: Visibility) {
  const { supabase, userId } = await requireStage("member");
  if (visibility !== "private" && visibility !== "club") return;
  await supabase.from("experiences").update({ visibility }).eq("id", id).eq("user_id", userId).eq("is_draft", false);
  revalidatePath("/experiences", "layout");
  redirect(`/experiences/${id}`);
}

export async function deleteExperience(id: string) {
  const { supabase, userId } = await requireStage("member");
  const { error } = await supabase.from("experiences").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error("삭제하지 못했어요.");
  revalidatePath("/experiences", "layout");
  redirect("/experiences");
}
