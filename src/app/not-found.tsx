import { House, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card space-y-4 p-6 text-center">
      <SearchX aria-hidden size={40} strokeWidth={1.5} className="mx-auto text-navy-700" />
      <h1 className="text-xl font-bold">찾는 화면이 없어요</h1>
      <p className="text-navy-700">주소가 바뀌었거나, 지워졌거나, 볼 수 있는 권한이 없는 글일 수 있어요.</p>
      <Link href="/" className="mx-auto flex w-fit items-center gap-1 rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600">
        <House aria-hidden size={18} />
        홈으로
      </Link>
    </div>
  );
}
