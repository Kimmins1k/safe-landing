import { signOut } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="text-sm text-navy-700 underline">로그아웃</button>
    </form>
  );
}
