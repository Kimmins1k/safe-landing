import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { BOARD_LABEL, type PostDetail } from "@/lib/archive";
import { updatePost } from "../../actions";
import { PostForm } from "../../post-form";

export default function EditPostPage({ params }: PageProps<"/archive/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: Pick<PageProps<"/archive/[id]/edit">, "params">) {
  const { id: idParam } = await params;
  if (!/^\d{1,15}$/.test(idParam)) notFound();
  const id = Number(idParam);
  const { supabase } = await requireStage("member");

  const { data } = await supabase.rpc("get_post", { p_id: id });
  const post = ((data ?? []) as PostDetail[])[0];
  if (!post) notFound();
  if (!post.is_mine) redirect(`/archive/${id}`); // 수정은 작성자만 (DB도 막는다)

  return (
    <div className="space-y-6">
      <Link href={`/archive/${id}`} className="text-sm text-navy-700 underline">
        ← 글로 돌아가기
      </Link>
      <h1 className="text-2xl font-bold">{BOARD_LABEL[post.board]} 고치기</h1>
      <PostForm board={post.board} post={post} action={updatePost.bind(null, id, post.board)} />
    </div>
  );
}
