// 서버에서만 쓴다 (비밀 키를 읽는다).
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushSub = { endpoint: string; p256dh: string; auth: string };
type Message = { title: string; body: string; url: string };

// 알림 기기 목록은 회원이 직접 못 다룬다. 호출하는 쪽에서 임원진인지 먼저 확인한다.
export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

// 애플 푸시 서버는 연락처(subject)가 localhost면 거절해서 실제 주소를 쓴다.
function vapid() {
  return {
    subject: "https://safe-landing-tau.vercel.app",
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
  };
}

// 보내고, 없어진 기기(404·410: 알림 해제·앱 삭제)는 목록에서 지운다. 실패해도 오류를 던지지 않는다.
export async function sendPush(subs: PushSub[], message: Message) {
  if (!process.env.VAPID_PRIVATE_KEY || subs.length === 0) return;
  const gone: string[] = [];
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(message), {
          vapidDetails: vapid(),
          TTL: 60 * 60 * 24,
          urgency: "high",
        })
        .catch((e: { statusCode?: number }) => {
          if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint);
          else console.error("푸시 알림 전송 실패", e.statusCode ?? e);
        }),
    ),
  );
  if (gone.length) await serviceClient().from("push_subscriptions").delete().in("endpoint", gone);
}

// 알림을 켠 임원진 기기 모두에 보낸다.
export async function notifyAdmins(message: Message) {
  const { data, error } = await serviceClient()
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, profiles!inner(role)")
    .eq("profiles.role", "admin");
  if (error) return console.error("알림 기기 목록을 못 읽었어요", error.message);
  await sendPush(data, message);
}
