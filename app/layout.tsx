import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Roulette",
  description: "연인과 함께 설레는 목소리와 벌칙/소원을 뽑아보세요!",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  openGraph: {
    title: "Voice Roulette 💕",
    description: "연인과 함께 설레는 목소리와 벌칙/소원을 뽑아보세요!",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Gowun+Dodum&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] flex flex-col selection:bg-pink-200 selection:text-pink-900 overflow-x-hidden">
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
