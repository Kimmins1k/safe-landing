"use server";

import { requireStage } from "@/lib/auth";
import { sendPush, serviceClient, type PushSub } from "@/lib/push";

const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

// 임원진만 이 기기에 알림을 켠다. 켜지면 확인 알림을 한 번 보낸다.
export async function subscribePush(sub: PushSub): Promise<{ error?: string }> {
  const { userId } = await requireStage("admin");
  if (!isText(sub?.endpoint, 1000) || !sub.endpoint.startsWith("https://") || !isText(sub.p256dh, 200) || !isText(sub.auth, 100))
    return { error: "알림을 켜지 못했어요. 다시 시도해 주세요." };

  const row = { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_id: userId };
  const { error } = await serviceClient().from("push_subscriptions").upsert(row);
  if (error) return { error: "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요." };

  await sendPush([row], { title: "세이프랜딩 알림을 켰어요", body: "가입 신청이 들어오면 이렇게 알려 드릴게요.", url: "/admin/approvals" });
  return {};
}

// 본인이 켠 기기만 끈다.
export async function unsubscribePush(endpoint: string) {
  const { userId } = await requireStage("admin");
  if (!isText(endpoint, 1000)) return;
  await serviceClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
}
