import { Suspense } from "react";
import { headers } from "next/headers";
import { LoginButton } from "./login-button";

// 카카오톡·네이버·인스타그램 등 앱 안 브라우저. 구글이 이 환경의 로그인을 막는다 (403 disallowed_useragent).
const IN_APP_BROWSER = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i;

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">세이프랜딩에 오신 것을 환영해요</h1>
      <p>경험을 질문에 답하듯 기록하고, 자소서 문항과 연결해 두는 동아리 공간입니다.</p>
      <Suspense fallback={<p>불러오는 중…</p>}>
        <LoginError searchParams={searchParams} />
        <LoginArea />
      </Suspense>
    </div>
  );
}

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if (!(await searchParams).error) return null;
  return (
    <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-safety-600">
      로그인을 마치지 못했어요. 다시 시도해 주세요. 계속 안 되면 임원진에게 알려 주세요.
    </p>
  );
}

async function LoginArea() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  if (IN_APP_BROWSER.test(userAgent)) {
    return (
      <div className="space-y-3 rounded-lg border-2 border-safety-500 p-4">
        <p className="font-bold">앱 안의 브라우저에서는 구글 로그인이 막혀 있어요.</p>
        <p>
          오른쪽 위(또는 아래) 메뉴에서 <b>&quot;다른 브라우저로 열기&quot;</b>를 누르거나, 주소를 복사해서
          크롬·사파리에 붙여 넣어 주세요.
        </p>
        <LoginButton mode="copy" />
      </div>
    );
  }
  return <LoginButton mode="google" />;
}
