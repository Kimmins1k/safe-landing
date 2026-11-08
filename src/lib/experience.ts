// 경험 카드 질문과 초안 재료 (기획서 4.3, 5장). 서버·화면·점검 스크립트가 함께 쓴다 (경로 별칭 없이).

export type ExperienceType = "club" | "class_project" | "internship" | "part_time" | "volunteer" | "contest" | "other";
export type Visibility = "private" | "club";
export type Step = "situation" | "task" | "action" | "result" | "reflection" | "extra";
export type Answer = { step: Step; question: string; answer: string };
type Question = { step: Step; question: string; example: string };

export const STEP_LABEL: Record<Step, string> = {
  situation: "상황",
  task: "역할·과제",
  action: "행동",
  result: "결과",
  reflection: "배운 점",
  extra: "추가 질문",
};

// 작성 화면에서 답변칸 아래에 보여 주는 한 줄 팁
export const STEP_TIP: Partial<Record<Step, string>> = {
  situation: "언제·어디서·무슨 일이었는지 한두 문장이면 충분해요.",
  task: "“저는 ~을 맡았습니다”로 시작하면 역할이 분명해져요.",
  action: "‘우리’보다 ‘제가’ 한 일을 구체적으로 써 주세요.",
  result: "건수·%·시간처럼 숫자로 쓰면 설득력이 커져요.",
  reflection: "생산·안전관리 직무와 이어지는 배운 점이면 더 좋아요.",
};

export const TYPE_LABEL: Record<ExperienceType, string> = {
  club: "동아리 활동",
  class_project: "수업·팀 프로젝트",
  internship: "현장실습·인턴",
  part_time: "아르바이트",
  volunteer: "봉사활동",
  contest: "공모전·대회",
  other: "기타",
};
export const EXPERIENCE_TYPES = Object.keys(TYPE_LABEL) as ExperienceType[];

export const ACTIVITY_CATEGORY_LABEL = {
  project: "프로젝트",
  study: "스터디",
  event: "행사",
  field_trip: "견학",
  contest: "대회",
  other: "기타",
} as const;
export type ActivityCategory = keyof typeof ACTIVITY_CATEGORY_LABEL;

export const STAR: Question[] = [
  {
    step: "situation",
    question: "언제, 어디서, 어떤 상황이었나요?",
    example: "2학년 2학기 동아리 정기 프로젝트에서 학내 실험실 안전점검을 진행했습니다.",
  },
  {
    step: "task",
    question: "내 역할은 무엇이었고, 해결해야 할 문제나 목표는 무엇이었나요?",
    example: "5명 중 점검표 작성을 맡았는데, 기존 점검표가 실제 실험실 환경과 맞지 않는 문제가 있었습니다.",
  },
  {
    step: "action",
    question: "그 문제를 위해 내가 구체적으로 한 일은 무엇인가요?",
    example: "실험실 3곳을 직접 돌며 위험 요소를 사진으로 기록하고, 점검 항목을 12개에서 20개로 새로 구성했습니다.",
  },
  {
    step: "result",
    question: "결과는 어땠나요? 숫자로 말할 수 있다면 더 좋아요.",
    example: "지적 사항 15건을 찾아 학과에 전달했고, 그중 9건이 개선되었습니다.",
  },
  {
    step: "reflection",
    question: "이 경험으로 무엇을 배웠나요? 다시 한다면 무엇을 다르게 할까요?",
    example: "현장을 직접 확인하지 않으면 서류만으로는 위험을 알 수 없다는 것을 배웠습니다.",
  },
];

const TEAM = [
  {
    step: "extra" as const,
    question: "팀에서 의견이 갈리거나 어려웠던 순간이 있었나요? 어떻게 풀었나요?",
    example: "점검 범위를 두고 의견이 갈려, 위험도가 높은 곳부터 먼저 하자는 기준을 제안해 합의했습니다.",
  },
];

export const EXTRA: Record<ExperienceType, Question[]> = {
  club: TEAM,
  class_project: TEAM,
  internship: [
    {
      step: "extra",
      question: "현장에서 본 위험 요소나 안전 수칙 중 기억에 남는 것은?",
      example: "설비 정비 전 전원을 차단하고 잠금 표지를 거는 절차를 매번 지키는 모습이 기억에 남습니다.",
    },
    {
      step: "extra",
      question: "현장에서 직접 배운 점은?",
      example: "작은 이상 징후도 바로 보고해야 큰 사고를 막을 수 있다는 것을 배웠습니다.",
    },
  ],
  part_time: [
    {
      step: "extra",
      question: "반복되는 일을 정확하게 하기 위해 한 노력은?",
      example: "재고 확인 순서를 체크리스트로 만들어 매번 같은 순서로 확인했습니다.",
    },
    {
      step: "extra",
      question: "실수를 줄이거나 개선한 경험이 있나요?",
      example: "계산 실수가 잦은 시간대를 찾아 동료와 교차 확인하도록 바꿔 오차를 줄였습니다.",
    },
  ],
  volunteer: [
    {
      step: "extra",
      question: "이 활동을 시작한 계기는?",
      example: "지역 복지관의 일손이 부족하다는 이야기를 듣고 시작했습니다.",
    },
    {
      step: "extra",
      question: "다른 사람과 함께하며 느낀 점은?",
      example: "역할을 미리 나누고 서로 확인할 때 일이 훨씬 안전하고 빠르게 끝난다는 것을 느꼈습니다.",
    },
  ],
  contest: [
    {
      step: "extra",
      question: "아이디어는 어디서 시작됐나요?",
      example: "실습 중 보호구를 제대로 착용하지 않는 경우가 많다는 점에서 시작했습니다.",
    },
    {
      step: "extra",
      question: "결과나 수상 내역은?",
      example: "교내 안전 아이디어 공모전에서 우수상을 받았습니다.",
    },
  ],
  other: [
    {
      step: "extra",
      question: "이 경험이 지원하고 싶은 직무와 어떻게 연결되나요?",
      example: "꾸준히 같은 기준을 지키는 습관이 생산 현장의 표준 작업 준수와 이어진다고 생각합니다.",
    },
  ],
};

// 저장된 답변을 지금 유형의 질문 목록에 맞춘다.
// 예전 카드의 질문 문장은 그대로 두고(기획서 8장), 유형이 바뀌면 추가 질문만 새 유형 것으로 바꾼다.
export function alignAnswers(type: ExperienceType | null, stored: Answer[], storedType: ExperienceType | null): Answer[] {
  const star = STAR.map(
    (q) => stored.find((a) => a.step === q.step) ?? { step: q.step, question: q.question, answer: "" },
  );
  const storedExtra = stored.filter((a) => a.step === "extra");
  const extra =
    type === storedType && storedExtra.length > 0
      ? storedExtra
      : type
        ? EXTRA[type].map((q) => ({ step: q.step, question: q.question, answer: "" }))
        : [];
  return [...star, ...extra];
}

export function exampleFor(a: Answer): string {
  const all = [...STAR, ...Object.values(EXTRA).flat()];
  return all.find((q) => q.question === a.question)?.example ?? "";
}

// 초안 재료: S → T → A → R → 배운 점 순서로 잇고, 건너뛴 단계는 뺀다. 추가 질문은 넣지 않는다.
export function draftMaterial(answers: Answer[]): string {
  const get = (step: Step) => answers.find((a) => a.step === step)?.answer.trim() ?? "";
  const lead = (prefix: string, text: string) => (!text || text.startsWith(prefix.trim()) ? text : `${prefix}${text}`);
  return [get("situation"), get("task"), get("action"), lead("그 결과 ", get("result")), lead("이 경험으로 ", get("reflection"))]
    .filter(Boolean)
    .join(" ");
}
