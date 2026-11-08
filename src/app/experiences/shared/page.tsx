import { PageSkeleton } from "@/app/skeleton";
import Form from "next/form";
import Link from "next/link";
import { Library, SearchX } from "lucide-react";
import { EmptyState } from "@/app/empty-state";
import { AutoSubmitSelect } from "@/app/auto-submit-select";
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
      <Suspense fallback={<PageSkeleton />}>
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
      <EmptyState icon={Library} title="아직 공개된 카드가 없어요">
        <p>
          내 경험 카드를 <b>동아리원 공개</b>로 바꾸면 여기에 보여요.
        </p>
        <Link href="/experiences" className="inline-block rounded-xl border border-navy-100 px-4 py-2 font-bold text-navy-900 hover:border-navy-700">
          내 경험 카드 보기
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      {/* 화면 이동으로 필터가 바뀌어도 선택 상자가 이전 값을 붙들지 않도록 key로 새로 그린다. */}
      <Form key={`${qt}|${activity}`} action="/experiences/shared" className="flex flex-wrap items-end gap-2 text-sm">
        <label>
          문항 유형
          <AutoSubmitSelect name="qt" defaultValue={typeof qt === "string" ? qt : ""}>
            <option value="">전체</option>
            {(types.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        <label>
          활동
          <AutoSubmitSelect name="activity" defaultValue={typeof activity === "string" ? activity : ""}>
            <option value="">전체</option>
            {(activities.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.semester} {a.title}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
      </Form>

      {shown.length === 0 && (
        <EmptyState icon={SearchX} title="조건에 맞는 카드가 없어요">
          <Link href="/experiences/shared" className="inline-block rounded-xl border border-navy-100 px-4 py-2 font-bold text-navy-900 hover:border-navy-700">
            필터 지우기
          </Link>
        </EmptyState>
      )}
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
