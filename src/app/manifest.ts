import type { MetadataRoute } from "next";

// 휴대폰 홈 화면에 추가할 때 쓰는 앱 정보. 아이폰은 홈 화면 앱에서만 푸시 알림을 받는다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "세이프랜딩",
    short_name: "세이프랜딩",
    description: "경험을 기록하고 자소서로 연결하는 동아리 취업 준비 공간",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f1f38",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
