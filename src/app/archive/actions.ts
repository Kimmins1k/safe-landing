"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStage } from "@/lib/auth";
import { BOARDS, parseBoard, type Board } from "@/lib/archive";

// 실패하면 이유를 주소에 담아 원래 화면으로 돌려보낸다.
function back(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

// DB 함수가 직접 만든 안내 문구(22023 입력 오류, P0002 없음, 42501 권한)만 그대로 보여 주고 나머지는 일반 문구를 쓴다.
function dbMessage(error: { code?: string; message: string }, fallback: string) {
  return ["22023", "P0002", "42501"].includes(error.code ?? "") ? error.message : fallback;
}

function text(formData: FormData, key: string, max: number) {
  const v = String(formData.get(key) ?? "").trim();
  return v.length > max ? null : v;
}

function readPost(formData: FormData, board: Board, onFail: (m: string) => never) {
  const title = text(formData, "title", 100);
  const body = text(formData, "body", 10000);
  if (!title) onFail("제목을 1~100자로 입력해 주세요.");
  if (!body) onFail("본문을 입력해 주세요. (10000자까지)");

  const review = board === "review";
  const company = review ? text(formData, "company", 100) : "";
  const job = review ? text(formData, "job", 100) : "";
  const appliedAt = review ? text(formData, "applied_at", 30) : "";
  const result = review ? text(formData, "result", 30) : "";
  if (review && (!company || !job)) onFail("회사와 직무를 입력해 주세요.");
  if (appliedAt === null || result === null) onFail("지원 시기와 결과는 30자까지 쓸 수 있어요.");

  return {
    p_title: title,
    p_body: body,
    p_is_anonymous: formData.get("anonymous") === "on",
    p_company: company || null,
    p_job: job || null,
    p_applied_at: appliedAt || null,
    p_result: result || null,
  };
}

export async function createPost(formData: FormData) {
  const board = parseBoard(formData.get("board"));
  const here = `/archive/new?board=${board}`;
  const args = readPost(formData, board, (m) => back(here, m));
  if (board === "review" && formData.get("consent") !== "on") back(here, "합격 자소서·후기는 동아리원에게 공개하는 데 동의해야 올릴 수 있어요.");

  const { supabase } = await requireStage("member");
  const { data, error } = await supabase.rpc("create_post", { p_board: board, ...args, p_share_consent: formData.get("consent") === "on" });
  if (error) back(here, dbMessage(error, "저장하지 못했어요. 잠시 후 다시 시도해 주세요."));

  revalidatePath("/", "layout");
  redirect(`/archive/${data}`);
}

export async function updatePost(id: number, board: Board, formData: FormData) {
  const here = `/archive/${id}/edit`;
  const args = readPost(formData, BOARDS.includes(board) ? board : "review", (m) => back(here, m));
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc("update_post", { p_id: id, ...args });
  if (error) back(here, dbMessage(error, "저장하지 못했어요. 잠시 후 다시 시도해 주세요."));

  revalidatePath("/", "layout");
  redirect(`/archive/${id}`);
}

export async function deletePost(id: number, board: Board) {
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc("delete_post", { p_id: id });
  if (error) back(`/archive/${id}`, dbMessage(error, "삭제하지 못했어요."));
  revalidatePath("/", "layout");
  redirect(`/archive?board=${parseBoard(board)}`);
}

async function change(id: number, fn: "set_post_hidden" | "set_post_answered", args: Record<string, unknown>, fallback: string) {
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc(fn, { p_id: id, ...args });
  if (error) back(`/archive/${id}`, dbMessage(error, fallback));
  revalidatePath("/", "layout");
  redirect(`/archive/${id}`);
}

export async function setPostHidden(id: number, hidden: boolean) {
  await change(id, "set_post_hidden", { p_hidden: hidden }, "숨김 상태를 바꾸지 못했어요.");
}

export async function setPostAnswered(id: number, answered: boolean) {
  await change(id, "set_post_answered", { p_answered: answered }, "답변 상태를 바꾸지 못했어요.");
}

export async function createComment(postId: number, formData: FormData) {
  const body = text(formData, "body", 2000);
  if (!body) back(`/archive/${postId}`, "댓글을 1~2000자로 입력해 주세요.");
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc("create_comment", { p_post_id: postId, p_body: body, p_is_anonymous: formData.get("anonymous") === "on" });
  if (error) back(`/archive/${postId}`, dbMessage(error, "댓글을 쓰지 못했어요."));
  revalidatePath("/", "layout");
  redirect(`/archive/${postId}`);
}

export async function deleteComment(postId: number, id: number) {
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc("delete_comment", { p_id: id });
  if (error) back(`/archive/${postId}`, dbMessage(error, "댓글을 지우지 못했어요."));
  revalidatePath("/", "layout");
  redirect(`/archive/${postId}`);
}

export async function setCommentHidden(postId: number, id: number, hidden: boolean) {
  const { supabase } = await requireStage("member");
  const { error } = await supabase.rpc("set_comment_hidden", { p_id: id, p_hidden: hidden });
  if (error) back(`/archive/${postId}`, dbMessage(error, "숨김 상태를 바꾸지 못했어요."));
  revalidatePath("/", "layout");
  redirect(`/archive/${postId}`);
}
