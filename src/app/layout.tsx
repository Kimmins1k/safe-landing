import { PlaneLanding } from "lucide-react";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MemberNav } from "./member-nav";
// 직접 배포하는 Pretendard. 화면에 나온 글자 구간만 내려받는다 (외부 CDN을 쓰지 않음)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "세이프랜딩",
  description: "경험을 기록하고 자소서로 연결하는 동아리 취업 준비 공간",
};

// 주소창 색을 헤더 네이비와 맞추고, 아이폰 홈 표시줄 영역(safe-area)을 쓸 수 있게 한다.
export const viewport: Viewport = {
  themeColor: "#0f1f38",
  viewportFit: "cover",
  // 안드로이드 크롬: 키보드가 올라오면 화면 높이를 줄여 위저드 하단 버튼이 키보드 위에 붙게 한다.
  // shortcut: 아이폰 사파리는 이 설정을 무시해 버튼이 키보드에 가려질 수 있다. 불편 신고가 오면 visualViewport로 위치를 맞춘다.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      {/* 모바일 하단 탭(--bottom-nav, globals.css)에 본문·푸터가 가리지 않도록 body 아래를 띄운다 */}
      <body className="flex min-h-full flex-col pb-(--bottom-nav) font-sans break-keep">
        <header className="sticky top-0 z-20 bg-navy-900 px-4 py-3 text-white shadow-md">
          <Link href="/" className="flex w-fit items-center gap-2 font-bold">
            <PlaneLanding aria-hidden size={22} strokeWidth={1.75} className="text-safety-500" />
            세이프랜딩 <span className="text-safety-500">Safe Landing</span>
          </Link>
        </header>
        <div className="flex flex-1">
          <Suspense fallback={null}>
            <MemberNav />
          </Suspense>
          <main className="mx-auto w-full max-w-2xl flex-1 overflow-x-clip px-4 pt-8 pb-8">{children}</main>
        </div>
        <footer className="border-t border-navy-100 px-4 py-4 text-center text-sm text-navy-700">
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
        </footer>
      </body>
    </html>
  );
}
