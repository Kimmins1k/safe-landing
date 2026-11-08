import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/app/empty-state";
import { requireStage } from "@/lib/auth";
import { authorLabel, BOARD_LABEL, BOARDS, parseBoard, type PostRow } from "@/lib/archive";

export default function ArchivePage({ searchParams }: PageProps<"/archive">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-navy-700 underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">선배 아카이브</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: Pick<PageProps<"/archive">, "searchParams">) {
  const { supabase } = await requireStage("member");
  const { board: boardParam } = await searchParams;
  const board = parseBoard(boardParam);

  const { data, error } = await supabase.rpc("list_posts", { p_board: board, p_limit: 50 });
  if (error) throw new Error(error.message);
  const posts = (data ?? []) as PostRow[];

  return (
    <>
      <nav className="flex flex-wrap gap-2 text-sm font-bold">
        {BOARDS.map((b) => (
          <Link
            key={b}
            href={`/archive?board=${b}`}
            className={`rounded-lg border px-3 py-1 ${b === board ? "border-navy-900 bg-navy-900 text-white" : "border-navy-100"}`}
          >
            {BOARD_LABEL[b]}
          </Link>
        ))}
      </nav>

      <Link
        href={`/archive/new?board=${board}`}
        className="inline-block rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600"
      >
        글쓰기
      </Link>

      {posts.length === 0 && (
        <EmptyState icon={MessagesSquare} title="아직 글이 없어요">
          <p>{board === "qna" ? "궁금한 점을 첫 질문으로 남겨 주세요." : "위의 글쓰기로 첫 글을 남겨 주세요."}</p>
        </EmptyState>
      )}
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/archive/${p.id}`} className={`block card card-hover p-4 ${p.is_hidden ? "opacity-60" : ""}`}>
              <p className="font-bold">
                {p.title}
                {p.is_hidden && <span className="ml-2 rounded bg-navy-700 px-2 py-0.5 text-xs text-white">숨김</span>}
                {p.board === "qna" && (
                  <span className={`ml-2 rounded px-2 py-0.5 text-xs ${p.is_answered ? "bg-navy-900 text-white" : "bg-safety-500 text-navy-900"}`}>
                    {p.is_answered ? "답변 완료" : "답변 대기"}
                  </span>
                )}
              </p>
              {p.board === "review" && (
                <p className="text-sm">
                  {p.company} · {p.job}
                  {p.applied_at && ` · ${p.applied_at}`}
                  {p.result && ` · ${p.result}`}
                </p>
              )}
              <p className="text-sm text-navy-700">
                {authorLabel(p)} · 댓글 {Number(p.comment_count)}개 · {new Date(p.created_at).toLocaleDateString("ko-KR")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
