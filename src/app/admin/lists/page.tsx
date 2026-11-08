import { PageSkeleton } from "@/app/skeleton";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { createItem, setItemActive, updateItem, type ListTable } from "./actions";

type Item = {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  description?: string;
  is_experience_based?: boolean;
};

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";
const smallButton = "rounded-lg border border-navy-100 px-3 py-1 text-sm";

function Fields({ table, item }: { table: ListTable; item?: Item }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="block sm:col-span-3">
        이름
        <input name="name" required maxLength={40} defaultValue={item?.name} className={inputClass} />
      </label>
      <label className="block">
        순서
        <input name="sort_order" type="number" min={0} max={9999} required defaultValue={item?.sort_order ?? 0} className={inputClass} />
      </label>
      {table === "question_types" && (
        <>
          <label className="block sm:col-span-4">
            설명 (선택)
            <input name="description" maxLength={500} defaultValue={item?.description} className={inputClass} />
          </label>
          <label className="flex items-center gap-2 sm:col-span-4">
            <input name="is_experience_based" type="checkbox" defaultChecked={item?.is_experience_based ?? true} />
            경험 카드로 채우는 문항 (지원 동기처럼 경험이 아닌 문항이면 끄세요)
          </label>
        </>
      )}
    </div>
  );
}

function Section({ title, table, items }: { title: string; table: ListTable; items: Item[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <form action={createItem.bind(null, table)} className="space-y-3 rounded-lg bg-navy-50 p-4">
        <p className="font-bold">새로 추가</p>
        <Fields table={table} />
        <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">추가</button>
      </form>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={`card p-4 ${item.is_active ? "" : "opacity-60"}`}>
            <details>
              <summary className="cursor-pointer">
                <span className="font-bold">{item.name}</span>
                <span className="text-sm text-navy-700">
                  {" "}
                  · 순서 {item.sort_order}
                  {table === "question_types" && !item.is_experience_based && " · 경험 외 문항"}
                  {!item.is_active && " · 사용 안 함"}
                </span>
              </summary>
              <form action={updateItem.bind(null, table, item.id)} className="mt-3 space-y-3">
                <Fields table={table} item={item} />
                <button className={smallButton}>수정 저장</button>
              </form>
            </details>
            <form action={setItemActive.bind(null, table, item.id, !item.is_active)} className="mt-2">
              <button className={smallButton}>{item.is_active ? "사용 안 함으로 바꾸기" : "다시 사용하기"}</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ListsPage({ searchParams }: PageProps<"/admin/lists">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">태그·문항 유형 관리</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Lists searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Lists({ searchParams }: Pick<PageProps<"/admin/lists">, "searchParams">) {
  const { supabase } = await requireStage("admin");
  const { error: errorMessage } = await searchParams;
  const [tags, types] = await Promise.all([
    supabase.from("competency_tags").select("id, name, sort_order, is_active").order("sort_order").order("id"),
    supabase
      .from("question_types")
      .select("id, name, description, sort_order, is_active, is_experience_based")
      .order("sort_order")
      .order("id"),
  ]);
  if (tags.error) throw new Error(tags.error.message);
  if (types.error) throw new Error(types.error.message);

  return (
    <>
      {typeof errorMessage === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-700">
          {errorMessage}
        </p>
      )}
      <p className="text-sm text-navy-700">
        목록은 지우지 않고 &quot;사용 안 함&quot;으로 바꿉니다. 사용 안 함 항목은 새 경험 카드에서 고를 수 없지만, 이미 연결된 카드에는 그대로 보입니다.
      </p>
      <Section title="자소서 문항 유형" table="question_types" items={types.data ?? []} />
      <Section title="역량 태그" table="competency_tags" items={tags.data ?? []} />
    </>
  );
}
