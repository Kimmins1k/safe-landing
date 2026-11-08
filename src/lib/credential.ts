// 자격증·교육 기록 (기획서 4.5). 서버·화면이 함께 쓴다.
import type { Visibility } from "./experience";

export type CredentialKind = "certificate" | "training";
export type CredentialStatus = "preparing" | "written_passed" | "acquired" | "planned" | "completed";

export const KIND_LABEL: Record<CredentialKind, string> = { certificate: "자격증", training: "교육·연수" };

export const STATUS_LABEL: Record<CredentialStatus, string> = {
  preparing: "준비 중",
  written_passed: "필기 합격",
  acquired: "최종 취득",
  planned: "수강 예정",
  completed: "이수 완료",
};

// 구분마다 고를 수 있는 상태 (진행 순서대로)
export const STATUSES_BY_KIND: Record<CredentialKind, CredentialStatus[]> = {
  certificate: ["preparing", "written_passed", "acquired"],
  training: ["planned", "completed"],
};

// 끝난 상태에서만 취득일·이수일을 쓴다.
export const DONE_STATUSES: CredentialStatus[] = ["acquired", "completed"];

export type Credential = {
  id: string;
  kind: CredentialKind;
  name: string;
  status: CredentialStatus;
  exam_date: string | null;
  acquired_date: string | null;
  memo: string;
  visibility: Visibility;
};
