import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://voiceroulette.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "보이스 룰렛 💕",
  description: "세상에 단 하나뿐인 우리만의 룰렛을 돌려보세요!",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "보이스 룰렛",
    title: "보이스 룰렛 💕",
    description: "세상에 단 하나뿐인 우리만의 룰렛을 돌려보세요!",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "보이스 룰렛 썸네일",
        type: "image/jpeg",
      },
      {
        url: "/og-image.png",
        width: 1200,
        height: 675,
        alt: "보이스 룰렛 썸네일",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "보이스 룰렛 💕",
    description: "세상에 단 하나뿐인 우리만의 룰렛을 돌려보세요!",
    images: ["/og-image.jpg"],
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
