"use client";

// 고르자마자 필터를 적용하는 선택 상자. 감싼 <form>(GET)을 바로 제출한다.
export function AutoSubmitSelect(props: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="ml-1 rounded-xl border border-navy-100 bg-white px-2 py-1.5"
    />
  );
}
