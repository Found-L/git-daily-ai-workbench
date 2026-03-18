import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Git 日报 AI 工作台",
  description: "配置仓库、同步 Git 提交，并生成日/周/月 AI 报告的本地优先工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="app-shell">
          <div className="app-noise" />
          <div className="app-glow app-glow-left" />
          <div className="app-glow app-glow-right" />
          {children}
        </div>
      </body>
    </html>
  );
}
