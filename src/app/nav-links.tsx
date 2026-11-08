"use client";

import { Award, Flag, House, Library, NotebookPen, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; match: string[]; icon: LucideIcon };

// 기획서 7장: 모바일은 하단 탭(홈 / 경험 / 아카이브 / 마이), PC는 왼쪽 사이드바.
const TABS: Item[] = [
  { href: "/", label: "홈", match: [], icon: House },
  { href: "/experiences", label: "경험", match: ["/experiences", "/activities", "/credentials"], icon: NotebookPen },
  { href: "/archive", label: "아카이브", match: ["/archive"], icon: Library },
  { href: "/me", label: "마이", match: ["/me"], icon: UserRound },
];

// PC 사이드바는 화면이 넓어 전부 보여 준다.
const SIDEBAR: Item[] = [
  { href: "/", label: "홈", match: [], icon: House },
  { href: "/experiences", label: "내 경험", match: ["/experiences"], icon: NotebookPen },
  { href: "/experiences/shared", label: "공개 경험", match: ["/experiences/shared"], icon: Users },
  { href: "/activities", label: "동아리 활동", match: ["/activities"], icon: Flag },
  { href: "/credentials", label: "자격증·교육", match: ["/credentials"], icon: Award },
  { href: "/archive", label: "선배 아카이브", match: ["/archive"], icon: Library },
  { href: "/me", label: "마이페이지", match: ["/me"], icon: UserRound },
];

const ADMIN_ITEM: Item = { href: "/admin/approvals", label: "관리", match: ["/admin"], icon: ShieldCheck };

function isActive(item: Item, path: string, items: Item[]) {
  if (item.href === "/") return path === "/";
  // 더 구체적인 메뉴(예: 공개 경험)가 따로 있으면 그쪽이 활성이다.
  const moreSpecific = items.some((o) => o !== item && o.match.some((m) => path === m || path.startsWith(`${m}/`)) && o.href.length > item.href.length);
  if (moreSpecific) return false;
  return item.match.some((m) => path === m || path.startsWith(`${m}/`));
}

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const tabs = isAdmin ? [...TABS, ADMIN_ITEM] : TABS;
  const side = isAdmin ? [...SIDEBAR, ADMIN_ITEM] : SIDEBAR;

  return (
    <>
      <aside className="hidden w-48 shrink-0 border-r border-navy-100 bg-navy-50 p-4 md:block">
        {/* 위쪽 헤더가 고정이라 그 아래에 붙는다 */}
        <nav aria-label="주 메뉴" className="sticky top-16 flex flex-col gap-1">
          {side.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item, path, side) ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isActive(item, path, side) ? "bg-navy-900 text-white shadow-card" : "text-navy-700 hover:bg-navy-100"}`}
            >
              <item.icon aria-hidden size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 아이폰 홈 표시줄에 가리지 않게 safe-area만큼 아래를 띄운다 */}
      <nav
        aria-label="하단 메뉴"
        className="bottom-nav fixed inset-x-0 bottom-0 z-10 flex border-t border-navy-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_14px_rgb(15_31_56/0.06)] backdrop-blur md:hidden"
      >
        {tabs.map((item) => {
          const on = isActive(item, path, tabs);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold ${on ? "text-safety-700" : "text-navy-700"}`}
            >
              {/* 선택된 탭은 아이콘 뒤에 알약 모양 배경이 깔린다 */}
              <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-200 ${on ? "bg-safety-500/15" : ""}`}>
                <item.icon aria-hidden size={20} strokeWidth={on ? 2.25 : 1.75} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
