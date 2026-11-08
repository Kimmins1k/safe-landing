import { PageSkeleton } from "@/app/skeleton";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { NotebookPen, SearchX } from "lucide-react";
import { EmptyState } from "@/app/empty-state";
import { AutoSubmitSelect } from "@/app/auto-submit-select";
import { EXPERIENCE_TYPES, TYPE_LABEL, type Answer, type ExperienceType, type Step, type Visibility } from "@/lib/experience";
import { createExperience } from "./actions";

type Row = {
  id: string;
  title: string;
  type: ExperienceType | null;
  is_draft: boolean;
  visibility: Visibility;
  updated_at: string;
  experience_tags: { tag_id: number }[];
  answers: Answer[];
};

const STAR: Step[] = ["situation", "task", "action", "result", "reflection"];

export default function ExperiencesPage({ searchParams }: PageProps<"/experiences">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">내 경험 카드</h1>
        <form action={createExperience}>
          <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">새 경험 쓰기</button>
        </form>
      </div>
      <Link href="/experiences/by-question" className="inline-block text-sm text-navy-700 underline">
        문항 유형별로 보기 →
      </Link>
      <Suspense fallback={<PageSkeleton />}>
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
      .select("id, title, type, is_draft, visibility, updated_at, answers, experience_tags(tag_id)")
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
      <EmptyState icon={NotebookPen} title="아직 경험 카드가 없어요">
        <p>질문에 하나씩 답하다 보면 자소서에 쓸 경험 카드가 만들어져요.</p>
        <form action={createExperience}>
          <button className="rounded-xl bg-safety-500 px-4 py-2.5 font-bold text-navy-900 hover:bg-safety-600">첫 경험 쓰기</button>
        </form>
      </EmptyState>
    );
  }

  return (
    <>
      {/* 화면 이동으로 필터가 바뀌어도 선택 상자가 이전 값을 붙들지 않도록 key로 새로 그린다. */}
      <Form key={`${type}|${tag}`} action="/experiences" className="flex flex-wrap items-end gap-2 text-sm">
        <label>
          유형
          <AutoSubmitSelect name="type" defaultValue={typeof type === "string" ? type : ""}>
            <option value="">전체</option>
            {EXPERIENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        <label>
          태그
          <AutoSubmitSelect name="tag" defaultValue={typeof tag === "string" ? tag : ""}>
            <option value="">전체</option>
            {(tags.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
      </Form>

      {shown.length === 0 && (
        <EmptyState icon={SearchX} title="조건에 맞는 카드가 없어요">
          <Link href="/experiences" className="inline-block rounded-xl border border-navy-100 px-4 py-2 font-bold text-navy-900 hover:border-navy-700">
            필터 지우기
          </Link>
        </EmptyState>
      )}
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.id}>
            <Link href={`/experiences/${c.id}`} className="block card card-hover p-4">
              <p className="font-bold">
                {c.title || "(제목 없음)"}
                {c.is_draft && <span className="ml-2 rounded bg-safety-500 px-2 py-0.5 text-xs text-navy-900">임시 저장</span>}
              </p>
              <StarFill answers={c.answers} />
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

// STAR 다섯 단계 중 몇 개를 채웠는지 점으로 보여 준다.
function StarFill({ answers }: { answers: Answer[] }) {
  const done = STAR.filter((step) => answers.some((a) => a.step === step && a.answer.trim()));
  return (
    <p className="my-1 flex items-center gap-1 text-xs text-navy-700">
      {STAR.map((step) => (
        <span key={step} aria-hidden className={`size-2 rounded-full ${done.includes(step) ? "bg-navy-900" : "bg-navy-100"}`} />
      ))}
      <span className="ml-1 tabular-nums">STAR {done.length}/5</span>
    </p>
  );
}
