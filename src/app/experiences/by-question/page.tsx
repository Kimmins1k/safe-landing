import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";

type QuestionType = { id: number; name: string; is_active: boolean };
type Card = { id: string; title: string; is_draft: boolean; experience_question_types: { question_type_id: number }[] };

export default function ByQuestionPage() {
  return (
    <div className="space-y-6">
      <Link href="/experiences" className="text-sm text-navy-700 underline">
        ← 내 경험 목록
      </Link>
      <h1 className="text-2xl font-bold">문항 유형별 보기</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Groups />
      </Suspense>
    </div>
  );
}

async function Groups() {
  const { supabase, userId } = await requireStage("member");
  const [types, cards] = await Promise.all([
    supabase.from("question_types").select("id, name, is_active").order("sort_order"),
    supabase
      .from("experiences")
      .select("id, title, is_draft, experience_question_types(question_type_id)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);
  if (types.error) throw new Error(types.error.message);
  if (cards.error) throw new Error(cards.error.message);
  const mine = (cards.data ?? []) as Card[];

  const groups = ((types.data ?? []) as QuestionType[])
    .map((q) => ({ ...q, cards: mine.filter((c) => c.experience_question_types.some((l) => l.question_type_id === q.id)) }))
    .filter((q) => q.is_active || q.cards.length > 0);

  return (
    <ul className="space-y-3">
      {groups.map((q) => (
        <li key={q.id} className="card p-4">
          <p className="flex justify-between font-bold">
            <span>{q.name}</span>
            <span className={q.cards.length ? "text-navy-900" : "text-navy-700"}>{q.cards.length}개</span>
          </p>
          {q.cards.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {q.cards.map((c) => (
                <li key={c.id}>
                  <Link href={`/experiences/${c.id}`} className="underline">
                    {c.title || "(제목 없음)"}
                  </Link>
                  {c.is_draft && <span className="ml-1 text-safety-700">(임시 저장)</span>}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
