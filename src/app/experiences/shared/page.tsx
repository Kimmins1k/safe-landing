import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { CardLink, PUBLIC_CARD_COLUMNS, type PublicCard } from "../card-link";

export default function SharedExperiencesPage({ searchParams }: PageProps<"/experiences/shared">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-navy-700 underline">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">공개 경험 목록</h1>
      <p className="text-sm text-navy-700">동아리원이 공개한 경험 카드예요. 읽기만 할 수 있어요.</p>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function List({ searchParams }: Pick<PageProps<"/experiences/shared">, "searchParams">) {
  const { supabase } = await requireStage("member");
  const { qt, activity } = await searchParams;

  // 내 카드도 DB가 함께 돌려주므로 공개·완료 조건을 직접 건다.
  const [cards, types, activities] = await Promise.all([
    supabase
      .from("experiences")
      .select(PUBLIC_CARD_COLUMNS)
      .eq("visibility", "club")
      .eq("is_draft", false)
      .order("updated_at", { ascending: false }),
    supabase.from("question_types").select("id, name").order("sort_order"),
    supabase.from("activities").select("id, title, semester").order("semester", { ascending: false }).order("title"),
  ]);
  if (cards.error) throw new Error(cards.error.message);

  // shortcut: 필터는 공개 카드를 다 받은 뒤 화면에서 거른다. 공개 카드가 수백 개가 되면 DB 조건으로 옮긴다.
  const all = (cards.data ?? []) as unknown as PublicCard[];
  const shown = all.filter(
    (c) =>
      (typeof qt !== "string" || !qt || c.experience_question_types.some((l) => String(l.question_types?.id) === qt)) &&
      (typeof activity !== "string" || !activity || String(c.activities?.id) === activity),
  );

  if (all.length === 0) {
    return (
      <p className="rounded-lg bg-navy-50 p-4">
        아직 공개된 카드가 없어요. 내 경험 카드를 <b>동아리원 공개</b>로 바꾸면 여기에 보여요.
      </p>
    );
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label>
          문항 유형
          <select name="qt" defaultValue={typeof qt === "string" ? qt : ""} className="ml-1 rounded-lg border border-navy-100 px-2 py-1">
            <option value="">전체</option>
            {(types.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          활동
          <select name="activity" defaultValue={typeof activity === "string" ? activity : ""} className="ml-1 rounded-lg border border-navy-100 px-2 py-1">
            <option value="">전체</option>
            {(activities.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.semester} {a.title}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg border border-navy-100 px-3 py-1">보기</button>
      </form>

      {shown.length === 0 && <p>조건에 맞는 카드가 없어요.</p>}
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.id}>
            <CardLink card={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
