// 선배 아카이브 (기획서 4.6). 서버·화면이 함께 쓴다.

export type Board = "review" | "qna" | "tip";

export const BOARD_LABEL: Record<Board, string> = {
  review: "합격 자소서·면접 후기",
  qna: "질문",
  tip: "진로·준비 팁",
};
export const BOARDS = Object.keys(BOARD_LABEL) as Board[];

export function parseBoard(value: unknown): Board {
  return BOARDS.includes(value as Board) ? (value as Board) : "review";
}

// DB 함수(list_posts, get_post, list_comments)가 돌려주는 작성자 정보.
// 익명 글은 일반 회원에게 author_name이 비어 오고, 관리자에게만 채워 온다.
type Author = {
  author_name: string | null;
  author_cohort: number | null;
  is_anonymous: boolean;
  is_mine: boolean;
  is_withdrawn: boolean;
};

export type PostRow = Author & {
  id: number;
  board: Board;
  title: string;
  company: string | null;
  job: string | null;
  applied_at: string | null;
  result: string | null;
  is_answered: boolean;
  is_hidden: boolean;
  comment_count: number;
  created_at: string;
};

export type PostDetail = Omit<PostRow, "comment_count"> & { body: string; share_consent: boolean; updated_at: string };

export type CommentRow = Author & { id: number; body: string; is_hidden: boolean; created_at: string };

export function authorLabel(a: Author): string {
  if (a.is_withdrawn) return "탈퇴한 회원";
  if (a.author_name !== null) {
    const who = `${a.author_cohort}학번 ${a.author_name}`;
    return a.is_anonymous ? `익명 (관리자에게만 ${who}로 보여요)` : who;
  }
  return a.is_mine ? "익명 (내 글)" : "익명";
}
