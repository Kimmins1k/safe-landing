"use client"; // 에러 화면은 클라이언트 컴포넌트여야 한다 (Next.js 16: reset 대신 retry)

import { House, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card space-y-4 p-6 text-center">
      <TriangleAlert aria-hidden size={40} strokeWidth={1.5} className="mx-auto text-safety-700" />
      <h1 className="text-xl font-bold">화면을 불러오지 못했어요</h1>
      <p className="text-navy-700">
        잠깐 연결이 불안정했을 수 있어요. 다시 시도해도 계속 안 되면 임원진에게 알려 주세요.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={retry} className="flex items-center gap-1 rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">
          <RotateCw aria-hidden size={18} />
          다시 시도
        </button>
        <Link href="/" className="flex items-center gap-1 rounded-lg border border-navy-100 px-4 py-2 font-bold">
          <House aria-hidden size={18} />
          홈으로
        </Link>
      </div>
    </div>
  );
}
