import Link from "next/link";
import { TYPE_LABEL, type ExperienceType } from "@/lib/experience";

export type PublicCard = {
  id: string;
  title: string;
  type: ExperienceType | null;
  updated_at: string;
  activities: { id: number; title: string; semester: string } | null;
  profiles: { name: string; cohort: number } | null;
  experience_question_types: { question_types: { id: number; name: string; sort_order: number } | null }[];
};

// 다른 회원이 공개한 경험 카드 한 줄. 공개 경험 목록과 활동 상세가 함께 쓴다.
export const PUBLIC_CARD_COLUMNS =
  "id, title, type, updated_at, activities(id, title, semester), profiles(name, cohort), experience_question_types(question_types(id, name, sort_order))";

export function CardLink({ card, showActivity = true }: { card: PublicCard; showActivity?: boolean }) {
  const names = card.experience_question_types.flatMap((l) => (l.question_types ? [l.question_types.name] : []));
  return (
    <Link href={`/experiences/${card.id}`} className="block card card-hover p-4">
      <p className="font-bold">{card.title || "(제목 없음)"}</p>
      <p className="text-sm text-navy-700">
        {card.type ? TYPE_LABEL[card.type] : "유형 미선택"}
        {showActivity && card.activities && ` · ${card.activities.semester} ${card.activities.title}`}
        {card.profiles ? ` · ${card.profiles.cohort}학번 ${card.profiles.name}` : " · 탈퇴한 회원"}
      </p>
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {names.map((n) => (
            <span key={n} className="rounded-full bg-navy-900 px-2 py-0.5 text-xs text-white">
              {n}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
