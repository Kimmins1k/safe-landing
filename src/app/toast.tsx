import { CircleCheck } from "lucide-react";

// 잠깐 떴다 사라지는 알림. 타이머 없이 CSS 애니메이션(globals.css의 toast)만으로 사라진다.
// 같은 알림을 다시 띄우려면 key를 바꿔서 새로 그린다.
export function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-8"
    >
      <p className="flex animate-toast items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm font-bold text-white shadow-card-hover">
        <CircleCheck aria-hidden size={18} className="text-safety-500" />
        {children}
      </p>
    </div>
  );
}
