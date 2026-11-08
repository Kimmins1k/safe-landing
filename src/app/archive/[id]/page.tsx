import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmButton } from "@/app/confirm-button";
import { requireStage } from "@/lib/auth";
import { authorLabel, BOARD_LABEL, type CommentRow, type PostDetail } from "@/lib/archive";
import {
  createComment,
  deleteComment,
  deletePost,
  setCommentHidden,
  setPostAnswered,
  setPostHidden,
} from "../actions";

const smallButton = "rounded-lg border border-navy-100 px-3 py-1 text-sm";

export default function PostPage({ params, searchParams }: PageProps<"/archive/[id]">) {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Detail({ params, searchParams }: Pick<PageProps<"/archive/[id]">, "params" | "searchParams">) {
  const { id: idParam } = await params;
  if (!/^\d{1,15}$/.test(idParam)) notFound();
  const id = Number(idParam);
  const { supabase, profile } = await requireStage("member");
  const { error: errorMessage } = await searchParams;
  const isAdmin = profile?.role === "admin";

  // 안 보이는 글(숨김, 없는 글)은 DB 함수가 빈 결과를 돌려준다.
  const [post, comments] = await Promise.all([
    supabase.rpc("get_post", { p_id: id }),
    supabase.rpc("list_comments", { p_post_id: id }),
  ]);
  if (post.error) throw new Error(post.error.message);
  const p = ((post.data ?? []) as PostDetail[])[0];
  if (!p) notFound();
  const list = (comments.data ?? []) as CommentRow[];

  return (
    <article className="space-y-6">
      <Link href={`/archive?board=${p.board}`} className="text-sm text-navy-700 underline">
        ← {BOARD_LABEL[p.board]}
      </Link>

      {typeof errorMessage === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
          {errorMessage}
        </p>
      )}
      {p.is_hidden && (
        <p className="rounded-lg bg-safety-500/10 p-3 text-sm text-safety-600">
          관리자가 숨긴 글이에요. 작성자와 관리자만 볼 수 있어요.
        </p>
      )}

      <header className="space-y-1">
        <p className="text-sm text-navy-700">
          {BOARD_LABEL[p.board]}
          {p.board === "qna" && ` · ${p.is_answered ? "답변 완료" : "답변 대기"}`}
        </p>
        <h1 className="text-2xl font-bold">{p.title}</h1>
        {p.board === "review" && (
          <p className="text-sm">
            {p.company} · {p.job}
            {p.applied_at && ` · ${p.applied_at}`}
            {p.result && ` · ${p.result}`}
          </p>
        )}
        <p className="text-sm text-navy-700">
          {authorLabel(p)} · {new Date(p.created_at).toLocaleDateString("ko-KR")}
        </p>
      </header>

      <p className="leading-relaxed whitespace-pre-line">{p.body}</p>

      <div className="flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
        {p.is_mine && (
          <Link href={`/archive/${p.id}/edit`} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600">
            수정
          </Link>
        )}
        {p.is_mine && p.board === "qna" && (
          <form action={setPostAnswered.bind(null, p.id, !p.is_answered)}>
            <button className={smallButton}>{p.is_answered ? "답변 대기로 되돌리기" : "답변 완료로 표시"}</button>
          </form>
        )}
        {isAdmin && (
          <form action={setPostHidden.bind(null, p.id, !p.is_hidden)}>
            <button className={smallButton}>{p.is_hidden ? "숨김 풀기" : "숨기기"}</button>
          </form>
        )}
        {(p.is_mine || isAdmin) && (
          <form action={deletePost.bind(null, p.id, p.board)} className="ml-auto">
            <ConfirmButton message="이 글을 지울까요? 댓글도 함께 지워지고 되돌릴 수 없어요.">삭제</ConfirmButton>
          </form>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">댓글 {list.length}개</h2>
        {list.length === 0 && <p className="text-sm text-navy-700">아직 댓글이 없어요.</p>}
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className={`rounded-lg border border-navy-100 p-3 ${c.is_hidden ? "opacity-60" : ""}`}>
              <p className="text-sm text-navy-700">
                {authorLabel(c)} · {new Date(c.created_at).toLocaleDateString("ko-KR")}
                {c.is_hidden && " · 숨김"}
              </p>
              <p className="whitespace-pre-line">{c.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <form action={setCommentHidden.bind(null, p.id, c.id, !c.is_hidden)}>
                    <button className={smallButton}>{c.is_hidden ? "숨김 풀기" : "숨기기"}</button>
                  </form>
                )}
                {(c.is_mine || isAdmin) && (
                  <form action={deleteComment.bind(null, p.id, c.id)}>
                    <ConfirmButton message="이 댓글을 지울까요?">삭제</ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form action={createComment.bind(null, p.id)} className="space-y-2 rounded-lg bg-navy-50 p-4">
          <label className="block font-bold">
            댓글 쓰기
            <textarea name="body" required maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="anonymous" />
            익명으로 쓰기 (관리자는 작성자를 확인할 수 있어요)
          </label>
          <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600">댓글 올리기</button>
        </form>
      </section>
    </article>
  );
}
