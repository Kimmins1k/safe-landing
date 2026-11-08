import type { LucideIcon } from "lucide-react";

// 목록이 비었을 때 보여 주는 안내. 무엇을 하면 채워지는지와 버튼(children)을 함께 둔다.
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-navy-50">
        <Icon aria-hidden size={24} strokeWidth={1.5} className="text-navy-700" />
      </span>
      <p className="font-bold">{title}</p>
      {children && <div className="space-y-3 text-sm text-navy-700">{children}</div>}
    </div>
  );
}
