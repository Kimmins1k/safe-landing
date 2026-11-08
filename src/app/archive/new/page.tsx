import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { BOARD_LABEL, parseBoard } from "@/lib/archive";
import { createPost } from "../actions";
import { PostForm } from "../post-form";

export default function NewPostPage({ searchParams }: PageProps<"/archive/new">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <New searchParams={searchParams} />
    </Suspense>
  );
}

async function New({ searchParams }: Pick<PageProps<"/archive/new">, "searchParams">) {
  await requireStage("member");
  const { board: boardParam } = await searchParams;
  const board = parseBoard(boardParam);

  return (
    <div className="space-y-6">
      <Link href={`/archive?board=${board}`} className="text-sm text-navy-700 underline">
        ← {BOARD_LABEL[board]}
      </Link>
      <h1 className="text-2xl font-bold">{BOARD_LABEL[board]} 쓰기</h1>
      <PostForm board={board} action={createPost} />
    </div>
  );
}
