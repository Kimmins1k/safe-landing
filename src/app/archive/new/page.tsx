import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { BOARD_LABEL, parseBoard } from "@/lib/archive";
import { createPost } from "../actions";
import { PostForm } from "../post-form";

export default function NewPostPage({ searchParams }: PageProps<"/archive/new">) {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <New searchParams={searchParams} />
    </Suspense>
  );
}

async function New({ searchParams }: Pick<PageProps<"/archive/new">, "searchParams">) {
  await requireStage("member");
  const { board: boardParam, error } = await searchParams;
  const board = parseBoard(boardParam);

  return (
    <div className="space-y-6">
      <Link href={`/archive?board=${board}`} className="text-sm text-navy-700 underline">
        ← {BOARD_LABEL[board]}
      </Link>
      <h1 className="text-2xl font-bold">{BOARD_LABEL[board]} 쓰기</h1>
      {typeof error === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
          {error}
        </p>
      )}
      <PostForm board={board} action={createPost} />
    </div>
  );
}
