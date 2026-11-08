import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { ACTIVITY_CATEGORY_LABEL, type ActivityCategory } from "@/lib/experience";
import { CardLink, PUBLIC_CARD_COLUMNS, type PublicCard } from "@/app/experiences/card-link";

type Activity = { id: number; title: string; semester: string; category: ActivityCategory; description: string; is_hidden: boolean };

export default function ActivityPage({ params }: PageProps<"/activities/[id]">) {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/activities/[id]">, "params">) {
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const { supabase } = await requireStage("member");

  const [activity, cards] = await Promise.all([
    supabase.from("activities").select("id, title, semester, category, description, is_hidden").eq("id", id).maybeSingle<Activity>(),
    supabase
      .from("experiences")
      .select(PUBLIC_CARD_COLUMNS)
      .eq("activity_id", id)
      .eq("visibility", "club")
      .eq("is_draft", false)
      .order("updated_at", { ascending: false }),
  ]);
  if (!activity.data) notFound();
  if (cards.error) throw new Error(cards.error.message);
  const a = activity.data;
  const shared = (cards.data ?? []) as unknown as PublicCard[];

  // 문항 유형별로 묶는다. 카드 하나가 여러 문항 유형에 걸리면 각 묶음에 한 번씩 보인다.
  const groups = new Map<number, { name: string; sort: number; cards: PublicCard[] }>();
  for (const c of shared) {
    for (const l of c.experience_question_types) {
      const q = l.question_types;
      if (!q) continue;
      const g = groups.get(q.id) ?? { name: q.name, sort: q.sort_order, cards: [] };
      g.cards.push(c);
      groups.set(q.id, g);
    }
  }
  const sorted = [...groups.values()].sort((x, y) => x.sort - y.sort);

  return (
    <article className="space-y-6">
      <Link href="/activities" className="text-sm text-navy-700 underline">
        ← 동아리 활동
      </Link>
      <header className="space-y-1">
        <p className="text-sm text-navy-700">
          {a.semester} · {ACTIVITY_CATEGORY_LABEL[a.category]}
          {a.is_hidden && " · 숨김 처리된 활동"}
        </p>
        <h1 className="text-2xl font-bold">{a.title}</h1>
        {a.description && <p className="whitespace-pre-line pt-2">{a.description}</p>}
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">선배·동기는 이렇게 썼어요</h2>
        {shared.length === 0 ? (
          <p className="rounded-lg bg-navy-50 p-4">
            아직 이 활동의 공개 경험이 없어요. 이 활동으로 경험 카드를 쓰고 <b>동아리원 공개</b>로 바꾸면 여기에 보여요.
          </p>
        ) : (
          sorted.map((g) => (
            <div key={g.name} className="space-y-2">
              <h3 className="font-bold">
                &quot;{g.name}&quot; 문항에 쓴 카드 <span className="text-navy-700">{g.cards.length}개</span>
              </h3>
              <ul className="space-y-2">
                {g.cards.map((c) => (
                  <li key={c.id}>
                    <CardLink card={c} showActivity={false} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </article>
  );
}
