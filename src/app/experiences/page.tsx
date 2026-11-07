import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { EXPERIENCE_TYPES, TYPE_LABEL, type ExperienceType, type Visibility } from "@/lib/experience";
import { createExperience } from "./actions";

type Row = {
  id: string;
  title: string;
  type: ExperienceType | null;
  is_draft: boolean;
  visibility: Visibility;
  updated_at: string;
  experience_tags: { tag_id: number }[];
};

export default function ExperiencesPage({ searchParams }: PageProps<"/experiences">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">내 경험 카드</h1>
        <form action={createExperience}>
          <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600">새 경험 쓰기</button>
        </form>
      </div>
      <Link href="/experiences/by-question" className="inline-block text-sm text-navy-700 underline">
        문항 유형별로 보기 →
      </Link>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function List({ searchParams }: Pick<PageProps<"/experiences">, "searchParams">) {
  const { supabase, userId } = await requireStage("member");
  const { type, tag } = await searchParams;

  const [cards, tags] = await Promise.all([
    supabase
      .from("experiences")
      .select("id, title, type, is_draft, visibility, updated_at, experience_tags(tag_id)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase.from("competency_tags").select("id, name").order("sort_order"),
  ]);
  if (cards.error) throw new Error(cards.error.message);

  // shortcut: 필터는 내 카드를 다 받은 뒤 화면에서 거른다. 한 사람 카드가 수백 개가 되면 DB 조건으로 옮긴다.
  const all = (cards.data ?? []) as Row[];
  const shown = all.filter(
    (c) => (!type || c.type === type) && (!tag || c.experience_tags.some((t) => String(t.tag_id) === tag)),
  );

  if (all.length === 0) {
    return (
      <p className="rounded-lg bg-navy-50 p-4">
        아직 경험 카드가 없어요. <b>새 경험 쓰기</b>를 누르면 질문에 하나씩 답하면서 카드를 만들 수 있어요.
      </p>
    );
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label>
          유형
          <select name="type" defaultValue={typeof type === "string" ? type : ""} className="ml-1 rounded-lg border border-navy-100 px-2 py-1">
            <option value="">전체</option>
            {EXPERIENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          태그
          <select name="tag" defaultValue={typeof tag === "string" ? tag : ""} className="ml-1 rounded-lg border border-navy-100 px-2 py-1">
            <option value="">전체</option>
            {(tags.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
            <Link href={`/experiences/${c.id}`} className="block rounded-lg border border-navy-100 p-4 hover:border-navy-700">
              <p className="font-bold">
                {c.title || "(제목 없음)"}
                {c.is_draft && <span className="ml-2 rounded bg-safety-500 px-2 py-0.5 text-xs text-white">임시 저장</span>}
              </p>
              <p className="text-sm text-navy-700">
                {c.type ? TYPE_LABEL[c.type] : "유형 미선택"} · {c.visibility === "club" ? "동아리원 공개" : "비공개"} ·{" "}
                {new Date(c.updated_at).toLocaleDateString("ko-KR")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
