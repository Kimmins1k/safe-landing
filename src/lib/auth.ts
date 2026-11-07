import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = "pending" | "member" | "admin";
export type MemberStatus = "enrolled" | "on_leave" | "graduated";

export const STATUS_LABEL: Record<MemberStatus, string> = {
  enrolled: "재학",
  on_leave: "휴학",
  graduated: "졸업",
};

export type Profile = {
  id: string;
  name: string;
  cohort: number;
  status: MemberStatus;
  role: MemberRole;
};

// 로그인한 사용자와 프로필. 단계에 맞지 않으면 알맞은 화면으로 보낸다.
// need: "none" = 프로필이 아직 없어야 함(가입 정보 입력), "pending" = 승인 대기, "member" = 회원 이상, "admin" = 관리자
export async function requireStage(need: "none" | "pending" | "member" | "admin") {
  // 로그인 정보는 요청마다 다르다. 미리 렌더링하지 않도록 먼저 표시한다 (supabase가 내부에서 Date.now()를 쓴다).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, cohort, status, role")
    .eq("id", userId)
    .maybeSingle<Profile>();
  if (error) throw error;

  const stage = !profile ? "none" : profile.role === "pending" ? "pending" : "member";
  if (need === "none" && stage !== "none") redirect("/");
  if (need === "pending" && stage !== "pending") redirect("/");
  if ((need === "member" || need === "admin") && stage === "none") redirect("/onboarding");
  if ((need === "member" || need === "admin") && stage === "pending") redirect("/pending");
  if (need === "admin" && profile?.role !== "admin") redirect("/");

  return { supabase, userId, profile };
}
