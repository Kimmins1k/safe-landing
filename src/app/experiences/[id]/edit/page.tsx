import { PageSkeleton } from "@/app/skeleton";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStage } from "@/lib/auth";
import type { Answer, ExperienceType, Visibility } from "@/lib/experience";
import { Wizard, type ActivityOption, type Option } from "./wizard";

type Row = {
  id: string;
  type: ExperienceType | null;
  activity_id: number | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  answers: Answer[];
  visibility: Visibility;
  is_draft: boolean;
  experience_question_types: { question_type_id: number }[];
  experience_tags: { tag_id: number }[];
};

export default function EditExperiencePage({ params }: PageProps<"/experiences/[id]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: Pick<PageProps<"/experiences/[id]/edit">, "params">) {
  const { id } = await params;
  const { supabase, userId } = await requireStage("member");

  const { data: row } = await supabase
    .from("experiences")
    .select(
      "id, type, activity_id, title, start_date, end_date, answers, visibility, is_draft, experience_question_types(question_type_id), experience_tags(tag_id)",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle<Row>();
  if (!row) notFound();

  const linkedQt = row.experience_question_types.map((l) => l.question_type_id);
  const linkedTags = row.experience_tags.map((l) => l.tag_id);

  // 숨김·비활성 항목은 새로 고를 수 없지만, 이미 연결된 것은 목록에 남긴다.
  const [activities, questionTypes, tags] = await Promise.all([
    supabase
      .from("activities")
      .select("id, title, semester, is_hidden")
      .order("semester", { ascending: false })
      .order("title"),
    supabase.from("question_types").select("id, name, is_active").order("sort_order"),
    supabase.from("competency_tags").select("id, name, is_active").order("sort_order"),
  ]);
  for (const r of [activities, questionTypes, tags]) if (r.error) throw new Error(r.error.message);

  return (
    <Wizard
      initial={{
        id: row.id,
        type: row.type,
        activityId: row.activity_id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        answers: row.answers,
        visibility: row.visibility,
        isDraft: row.is_draft,
        questionTypeIds: linkedQt,
        tagIds: linkedTags,
      }}
      storedType={row.type}
      activities={(activities.data as (ActivityOption & { is_hidden: boolean })[]).filter(
        (a) => !a.is_hidden || a.id === row.activity_id,
      )}
      questionTypes={(questionTypes.data as (Option & { is_active: boolean })[]).filter(
        (q) => q.is_active || linkedQt.includes(q.id),
      )}
      tags={(tags.data as (Option & { is_active: boolean })[]).filter((t) => t.is_active || linkedTags.includes(t.id))}
    />
  );
}
