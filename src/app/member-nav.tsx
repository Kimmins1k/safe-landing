import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NavLinks } from "./nav-links";

// 승인된 회원에게만 메뉴를 보인다. 로그인 전이나 승인 대기 중이면 아무것도 그리지 않는다.
// 이동을 막는 것은 아니다. 접근 제한은 각 화면과 DB 규칙이 한다.
export async function MemberNav() {
  await connection(); // 로그인 정보는 요청마다 다르다 (auth.ts와 같은 이유)
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  if (profile?.role !== "member" && profile?.role !== "admin") return null;

  return <NavLinks isAdmin={profile.role === "admin"} />;
}
