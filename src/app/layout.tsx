import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "세이프랜딩",
  description: "경험을 기록하고 자소서로 연결하는 동아리 취업 준비 공간",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans break-keep">
        <header className="bg-navy-900 px-4 py-3 text-white">
          <Link href="/" className="font-bold">
            세이프랜딩 <span className="text-safety-500">Safe Landing</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-navy-100 px-4 py-4 text-center text-sm text-navy-700">
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>
        </footer>
      </body>
    </html>
  );
}
