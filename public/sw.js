// 세이프랜딩 서비스 워커: 푸시 알림을 띄우고, 누르면 해당 화면을 연다. 화면 캐시는 하지 않는다.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "세이프랜딩", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // 이미 열린 세이프랜딩 창이 있으면 그 창을 쓴다.
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "navigate" in client) {
          return client.focus().then((c) => c.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
