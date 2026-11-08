import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { Flag } from "lucide-react";
import { EmptyState } from "@/app/empty-state";
import { requireStage } from "@/lib/auth";
import { ACTIVITY_CATEGORY_LABEL, type ActivityCategory } from "@/lib/experience";

type Row = { id: number; title: string; semester: string; category: ActivityCategory; description: string };

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-navy-700 underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">동아리 활동</h1>
      <p className="text-sm text-navy-700">활동을 누르면 선배·동기가 이 활동을 자소서에 어떻게 썼는지 볼 수 있어요.</p>
      <Suspense fallback={<PageSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const { supabase } = await requireStage("member");
  const [activities, cards] = await Promise.all([
    supabase
      .from("activities")
      .select("id, title, semester, category, description")
      .eq("is_hidden", false)
      .order("semester", { ascending: false })
      .order("title"),
    supabase.from("experiences").select("activity_id").eq("visibility", "club").eq("is_draft", false).not("activity_id", "is", null),
  ]);
  if (activities.error) throw new Error(activities.error.message);
  if (cards.error) throw new Error(cards.error.message);

  const counts = new Map<number, number>();
  for (const c of cards.data ?? []) counts.set(c.activity_id, (counts.get(c.activity_id) ?? 0) + 1);
  const rows = (activities.data ?? []) as Row[];

  if (rows.length === 0)
    return (
      <EmptyState icon={Flag} title="아직 등록된 활동이 없어요">
        <p>임원진이 활동을 등록하면 여기에 보여요.</p>
      </EmptyState>
    );

  return (
    <ul className="space-y-2">
      {rows.map((a) => (
        <li key={a.id}>
          <Link href={`/activities/${a.id}`} className="block card card-hover p-4">
            <p className="font-bold">{a.title}</p>
            <p className="text-sm text-navy-700">
              {a.semester} · {ACTIVITY_CATEGORY_LABEL[a.category]} · 공개 경험 {counts.get(a.id) ?? 0}개
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
