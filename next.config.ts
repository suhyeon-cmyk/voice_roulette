import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드 좌측 하단 Dev Tools / Preference 인디케이터 숨김
  devIndicators: false,

  // 모바일 및 동일 네트워크(LAN) 기기 접속 시 HMR/웹소켓 허용
  allowedDevOrigins: [
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
};

export default nextConfig;
