"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; match: string[] };

// 기획서 7장: 모바일은 하단 탭(홈 / 경험 / 아카이브 / 마이), PC는 왼쪽 사이드바.
const TABS: Item[] = [
  { href: "/", label: "홈", match: [] },
  { href: "/experiences", label: "경험", match: ["/experiences", "/activities", "/credentials"] },
  { href: "/archive", label: "아카이브", match: ["/archive"] },
  { href: "/me", label: "마이", match: ["/me"] },
];

// PC 사이드바는 화면이 넓어 전부 보여 준다.
const SIDEBAR: Item[] = [
  { href: "/", label: "홈", match: [] },
  { href: "/experiences", label: "내 경험", match: ["/experiences"] },
  { href: "/experiences/shared", label: "공개 경험", match: ["/experiences/shared"] },
  { href: "/activities", label: "동아리 활동", match: ["/activities"] },
  { href: "/credentials", label: "자격증·교육", match: ["/credentials"] },
  { href: "/archive", label: "선배 아카이브", match: ["/archive"] },
  { href: "/me", label: "마이페이지", match: ["/me"] },
];

const ADMIN_ITEM: Item = { href: "/admin/approvals", label: "관리", match: ["/admin"] };

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
        <nav aria-label="주 메뉴" className="sticky top-4 flex flex-col gap-1">
          {side.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item, path, side) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${isActive(item, path, side) ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-100"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-navy-100 bg-white md:hidden">
        {tabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item, path, tabs) ? "page" : undefined}
            className={`flex-1 py-3 text-center text-sm font-bold ${isActive(item, path, tabs) ? "text-safety-600" : "text-navy-700"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
