import { BOARD_LABEL, type Board, type PostDetail } from "@/lib/archive";

const inputClass = "mt-1 w-full rounded-lg border border-navy-100 px-3 py-2";

// 글쓰기·고치기 공용 폼. 게시판은 정해진 상태로 들어온다.
export function PostForm({
  board,
  post,
  action,
}: {
  board: Board;
  post?: PostDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="board" value={board} />
      <label className="block">
        제목
        <input name="title" required maxLength={100} defaultValue={post?.title} className={inputClass} />
      </label>

      {board === "review" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            회사
            <input name="company" required maxLength={100} defaultValue={post?.company ?? ""} className={inputClass} />
          </label>
          <label className="block">
            직무
            <input name="job" required maxLength={100} defaultValue={post?.job ?? ""} className={inputClass} />
          </label>
          <label className="block">
            지원 시기 (선택)
            <input name="applied_at" maxLength={30} defaultValue={post?.applied_at ?? ""} placeholder="2027 상반기" className={inputClass} />
          </label>
          <label className="block">
            결과 (선택)
            <input name="result" maxLength={30} defaultValue={post?.result ?? ""} placeholder="최종 합격" className={inputClass} />
          </label>
        </div>
      )}

      <label className="block">
        본문
        <textarea name="body" required maxLength={10000} rows={10} defaultValue={post?.body} className={inputClass} />
      </label>

      <div className="space-y-2 rounded-lg bg-navy-50 p-4 text-sm leading-relaxed">
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="anonymous" defaultChecked={post?.is_anonymous} />
          익명으로 쓰기
        </label>
        <p>익명으로 표시되지만 관리자(임원진)는 작성자를 확인할 수 있어요.</p>
        <p>인원이 적어 회사·지원 시기·결과만으로 누군지 짐작될 수 있어요.</p>
      </div>

      {board === "review" && !post && (
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>이 합격 자소서·후기를 동아리원에게 공개하는 데 동의합니다.</span>
        </label>
      )}

      <button className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-white hover:bg-safety-600">
        {post ? "저장" : `${BOARD_LABEL[board]} 올리기`}
      </button>
    </form>
  );
}
