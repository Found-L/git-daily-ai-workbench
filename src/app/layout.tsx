import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

import { AntdProvider } from "@/components/antd-provider";

import "antd/dist/reset.css";
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
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body className="antialiased">
        <AntdRegistry>
          <AntdProvider>{children}</AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
