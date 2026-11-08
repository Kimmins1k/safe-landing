"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "../push-actions";

type Status = "loading" | "ios-install" | "unsupported" | "denied" | "off" | "on";

// 공개 키(base64url)를 브라우저가 받는 바이트로 바꾼다.
function toBytes(base64: string) {
  const raw = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// 이 기기(브라우저)에서 가입 신청 알림을 켜고 끈다.
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // 아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있다.
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        return setStatus(ios ? "ios-install" : "unsupported");
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : Notification.permission === "denied" ? "denied" : "off");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return setError("알림 설정이 아직 준비되지 않았어요. 임원진(개발 담당)에게 알려 주세요. (공개 키 없음)");
      if ((await Notification.requestPermission()) !== "granted") return setStatus("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(key),
      });
      const json = sub.toJSON();
      const result = await subscribePush({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
      if (result.error) {
        await sub.unsubscribe();
        return setError(result.error);
      }
      setStatus("on");
    } catch (e) {
      // 휴대폰마다 막히는 이유가 달라서, 문의받을 때 원인을 알 수 있게 오류 이름을 같이 보여 준다.
      setError(`알림을 켜지 못했어요. 다시 시도해 주세요. (${e instanceof Error ? e.name : "오류"})`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setError("");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("알림을 끄지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  return (
    <section className="card space-y-2 p-4" aria-label="가입 신청 알림">
      <p className="flex items-center gap-2 font-bold">
        {status === "on" ? <Bell aria-hidden size={18} className="text-safety-700" /> : <BellOff aria-hidden size={18} className="text-navy-700" />}
        가입 신청 알림
      </p>
      {status === "on" && <p className="text-sm text-navy-700">이 기기로 가입 신청 알림을 받고 있어요.</p>}
      {status === "off" && <p className="text-sm text-navy-700">새 가입 신청이 들어오면 이 기기로 바로 알려 드려요.</p>}
      {status === "denied" && (
        <p className="text-sm text-navy-700">
          이 기기에서 세이프랜딩 알림이 차단돼 있어요. 브라우저(또는 휴대폰) 설정에서 알림을 허용한 뒤 이 화면을 다시 열어 주세요.
        </p>
      )}
      {status === "ios-install" && (
        <p className="text-sm text-navy-700">
          아이폰은 사파리 아래쪽 공유 버튼 → <b>홈 화면에 추가</b>를 누른 뒤, 홈 화면의 세이프랜딩 아이콘으로 열어야 알림을 켤 수 있어요. (iOS 16.4 이상)
        </p>
      )}
      {status === "unsupported" && <p className="text-sm text-navy-700">이 브라우저는 알림을 지원하지 않아요. 휴대폰의 크롬이나 사파리에서 열어 주세요.</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-safety-500/10 p-3 text-sm text-safety-700">
          {error}
        </p>
      )}
      {status === "off" && (
        <button onClick={turnOn} disabled={busy} className="rounded-lg bg-safety-500 px-4 py-2 font-bold text-navy-900 hover:bg-safety-600 disabled:opacity-60">
          {busy ? "켜는 중…" : "이 기기로 알림 받기"}
        </button>
      )}
      {status === "on" && (
        <button onClick={turnOff} disabled={busy} className="rounded-lg border border-navy-100 px-4 py-2 font-bold text-navy-700 hover:bg-navy-50 disabled:opacity-60">
          {busy ? "끄는 중…" : "알림 끄기"}
        </button>
      )}
    </section>
  );
}
