// 데이터를 불러오는 동안 보여 주는 카드 모양 뼈대. 동작 줄이기를 켜면 깜빡이지 않는다.
export function PageSkeleton() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">불러오는 중…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden className="card space-y-3 p-4">
          <div className="h-4 w-2/3 rounded-full bg-navy-50 motion-safe:animate-pulse" />
          <div className="h-3 w-1/3 rounded-full bg-navy-50 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
