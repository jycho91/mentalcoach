import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "RegulMate · 실시간 법령-사내규정 동기화",
  description:
    "법령이 바뀌면 우리 회사 규정이 스스로 바뀐다. RegulMate는 국가법령정보센터와 실시간 연동되는 컴플라이언스 자동화 SaaS입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="bg-background">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <SiteHeader />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
