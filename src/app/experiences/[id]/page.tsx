import { PageSkeleton } from "@/app/skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PartyPopper } from "lucide-react";
import { ConfirmButton } from "@/app/confirm-button";
import { Toast } from "@/app/toast";
import { requireStage } from "@/lib/auth";
import { draftMaterial, STEP_LABEL, TYPE_LABEL, type Answer, type ExperienceType, type Visibility } from "@/lib/experience";
import { deleteExperience, setVisibility } from "../actions";
import { CopyButton } from "./copy-button";

type Row = {
  id: string;
  user_id: string | null; // 탈퇴한 회원의 공개 카드는 비어 있다
  type: ExperienceType | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  answers: Answer[];
  visibility: Visibility;
  is_draft: boolean;
  activities: { title: string; semester: string } | null;
  profiles: { name: string; cohort: number } | null;
  experience_question_types: { question_types: { id: number; name: string; is_experience_based: boolean } | null }[];
  experience_tags: { competency_tags: { name: string } | null }[];
};

export default function ExperiencePage({ params, searchParams }: PageProps<"/experiences/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Detail({ params, searchParams }: Pick<PageProps<"/experiences/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { done, saved } = await searchParams;
  const { supabase, userId } = await requireStage("member");

  // 남의 카드는 공개(완료)된 것만 DB 규칙이 돌려준다.
  const { data: card } = await supabase
    .from("experiences")
    .select(
      "id, user_id, type, title, start_date, end_date, answers, visibility, is_draft, activities(title, semester), profiles(name, cohort), experience_question_types(question_types(id, name, is_experience_based)), experience_tags(competency_tags(name))",
    )
    .eq("id", id)
    .maybeSingle<Row>();
  if (!card) notFound();

  const mine = card.user_id === userId;

  // 위저드에서 처음 완성하고 넘어왔으면(?done=1) 축하하면서, 이 카드로 처음 채워진 문항 유형을 알려 준다.
  // shortcut: 새로고침해도 다시 축하한다. 거슬린다는 의견이 나오면 주소에서 done을 지운다.
  const celebrate = mine && done === "1" && !card.is_draft;
  let newlyFilled: string[] = [];
  if (celebrate) {
    const { data: others } = await supabase
      .from("experiences")
      .select("experience_question_types(question_type_id)")
      .eq("user_id", userId)
      .eq("is_draft", false)
      .neq("id", id);
    const taken = new Set(
      ((others ?? []) as { experience_question_types: { question_type_id: number }[] }[]).flatMap((o) =>
        o.experience_question_types.map((l) => l.question_type_id),
      ),
    );
    newlyFilled = card.experience_question_types.flatMap((l) =>
      l.question_types?.is_experience_based && !taken.has(l.question_types.id) ? [l.question_types.name] : [],
    );
  }
  const material = draftMaterial(card.answers);
  const star = card.answers.filter((a) => a.step !== "extra");
  const extra = card.answers.filter((a) => a.step === "extra" && a.answer.trim());
  const period = [card.start_date, card.end_date].filter(Boolean).join(" ~ ");
  const questionTypes = card.experience_question_types.flatMap((l) => (l.question_types ? [l.question_types.name] : []));
  const tags = card.experience_tags.flatMap((l) => (l.competency_tags ? [l.competency_tags.name] : []));

  return (
    <article className="space-y-6">
      <Link href={mine ? "/experiences" : "/experiences/shared"} className="text-sm text-navy-700 underline">
        {mine ? "← 내 경험 목록" : "← 공개 경험 목록"}
      </Link>

      {celebrate && (
        <section role="status" className="flex items-start gap-3 rounded-2xl border border-safety-500 bg-safety-500/10 p-4 shadow-card">
          <PartyPopper aria-hidden size={36} strokeWidth={1.5} className="shrink-0 animate-pop text-safety-700" />
          <div className="space-y-1">
            <p className="text-lg font-bold">경험 카드 완성!</p>
            <p className="text-sm">
              {newlyFilled.length > 0
                ? `비어 있던 문항 유형 ${newlyFilled.length}개가 채워졌어요: ${newlyFilled.join(", ")}.`
                : "자소서에 쓸 재료가 하나 더 생겼어요."}{" "}
              아래 초안 재료를 복사해 자소서의 시작점으로 써 보세요.
            </p>
          </div>
        </section>
      )}
      {mine && saved === "1" && <Toast>저장했어요</Toast>}

      {card.is_draft && (
        <p className="rounded-lg bg-safety-500/10 p-3 text-sm text-safety-700">
          임시 저장 중인 카드예요. 공개 범위와 상관없이 나만 볼 수 있어요.
        </p>
      )}

      <header className="space-y-1">
        <p className="text-sm text-navy-700">
          {card.type ? TYPE_LABEL[card.type] : "유형 미선택"}
          {card.activities && ` · ${card.activities.semester} ${card.activities.title}`}
          {period && ` · ${period}`}
        </p>
        <h1 className="text-2xl font-bold">{card.title || "(제목 없음)"}</h1>
        {!mine && (
          <p className="text-sm text-navy-700">
            {card.profiles ? `${card.profiles.cohort}학번 ${card.profiles.name}님` : "탈퇴한 회원"}의 공개 카드 (읽기 전용)
          </p>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {questionTypes.map((n) => (
            <span key={n} className="rounded-full bg-navy-900 px-2 py-0.5 text-xs text-white">
              {n}
            </span>
          ))}
          {tags.map((n) => (
            <span key={n} className="rounded-full border border-navy-100 px-2 py-0.5 text-xs">
              #{n}
            </span>
          ))}
        </div>
      </header>

      <section className="space-y-2 rounded-lg border-2 border-safety-500 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">초안 재료</h2>
          {material && <CopyButton text={material} />}
        </div>
        <p className="text-sm text-safety-700">완성된 자소서 문장이 아니라, 다듬기 전의 재료예요. 문항에 맞게 고쳐 쓰세요.</p>
        <p className="leading-relaxed whitespace-pre-line">{material || "아직 답변이 없어요. 질문에 답하면 재료가 만들어져요."}</p>
      </section>

      <section className="space-y-4">
        {star.map((a) => (
          <div key={a.step}>
            <h3 className="text-sm font-bold text-navy-700">
              {STEP_LABEL[a.step]} · {a.question}
            </h3>
            <p className="whitespace-pre-line">{a.answer.trim() || <span className="text-navy-700">(건너뜀)</span>}</p>
          </div>
        ))}
      </section>

      {extra.length > 0 && (
        <section className="space-y-4 rounded-lg bg-navy-50 p-4">
          <h2 className="font-bold">유형별 추가 질문</h2>
          {extra.map((a) => (
            <div key={a.question}>
              <h3 className="text-sm font-bold text-navy-700">{a.question}</h3>
              <p className="whitespace-pre-line">{a.answer}</p>
            </div>
          ))}
        </section>
      )}

      {mine && (
        <div className="flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
          <Link href={`/experiences/${card.id}/edit`} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">
            {card.is_draft ? "이어 쓰기" : "수정"}
          </Link>
          {!card.is_draft && (
            <form action={setVisibility.bind(null, card.id, card.visibility === "club" ? "private" : "club")}>
              <button className="rounded-lg border border-navy-100 px-3 py-2 text-sm">
                {card.visibility === "club" ? "동아리원 공개 중 → 비공개로" : "비공개 → 동아리원 공개로"}
              </button>
            </form>
          )}
          <form action={deleteExperience.bind(null, card.id)} className="ml-auto">
            <ConfirmButton message="이 카드를 지울까요? 되돌릴 수 없어요.">삭제</ConfirmButton>
          </form>
        </div>
      )}
    </article>
  );
}
