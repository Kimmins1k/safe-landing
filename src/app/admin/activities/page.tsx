import { PageSkeleton } from "@/app/skeleton";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import { ACTIVITY_CATEGORY_LABEL, type ActivityCategory } from "@/lib/experience";
import { createActivity, setActivityHidden, updateActivity } from "./actions";

type Activity = {
  id: number;
  title: string;
  semester: string;
  category: ActivityCategory;
  description: string;
  is_hidden: boolean;
};

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";
const smallButton = "rounded-lg border border-navy-100 px-3 py-1 text-sm";

function ActivityFields({ activity }: { activity?: Activity }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        활동명
        <input name="title" required maxLength={100} defaultValue={activity?.title} placeholder="정기 안전점검 프로젝트" className={inputClass} />
      </label>
      <label className="block">
        학기
        <input name="semester" required maxLength={20} defaultValue={activity?.semester} placeholder="2026-2" className={inputClass} />
      </label>
      <label className="block">
        분류
        <select name="category" defaultValue={activity?.category ?? "project"} className={inputClass}>
          {Object.entries(ACTIVITY_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        설명 (선택)
        <textarea name="description" maxLength={2000} rows={2} defaultValue={activity?.description} className={inputClass} />
      </label>
    </div>
  );
}

export default function ActivitiesPage({ searchParams }: PageProps<"/admin/activities">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">활동 관리</h1>
      <Suspense fallback={<PageSkeleton />}>
        <ActivityList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ActivityList({ searchParams }: Pick<PageProps<"/admin/activities">, "searchParams">) {
  const { supabase } = await requireStage("admin");
  const { error: errorMessage } = await searchParams;
  const { data, error } = await supabase
    .from("activities")
    .select("id, title, semester, category, description, is_hidden")
    .order("semester", { ascending: false })
    .order("title");
  if (error) throw new Error(error.message);
  const activities = (data ?? []) as Activity[];

  return (
    <>
      {typeof errorMessage === "string" && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-700">
          {errorMessage}
        </p>
      )}

      <form action={createActivity} className="space-y-3 rounded-lg bg-navy-50 p-4">
        <p className="font-bold">새 활동 등록</p>
        <ActivityFields />
        <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">등록</button>
      </form>

      <p className="text-sm text-navy-700">
        활동은 지우지 않고 숨깁니다. 숨긴 활동은 새 경험 카드에서 고를 수 없지만, 이미 연결된 카드에는 그대로 보입니다.
      </p>
      {activities.length === 0 && <p>아직 등록된 활동이 없어요. 과거 기수의 활동도 미리 등록해 두세요.</p>}
      <ul className="space-y-3">
        {activities.map((a) => (
          <li key={a.id} className={`card p-4 ${a.is_hidden ? "opacity-60" : ""}`}>
            <details>
              <summary className="cursor-pointer">
                <span className="font-bold">{a.title}</span>
                <span className="text-sm text-navy-700">
                  {" "}
                  · {a.semester} · {ACTIVITY_CATEGORY_LABEL[a.category]}
                  {a.is_hidden && " · 숨김"}
                </span>
              </summary>
              <form action={updateActivity.bind(null, a.id)} className="mt-3 space-y-3">
                <ActivityFields activity={a} />
                <button className={smallButton}>수정 저장</button>
              </form>
            </details>
            <form action={setActivityHidden.bind(null, a.id, !a.is_hidden)} className="mt-2">
              <button className={smallButton}>{a.is_hidden ? "다시 보이기" : "숨기기"}</button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
