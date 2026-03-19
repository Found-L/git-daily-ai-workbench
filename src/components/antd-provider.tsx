"use client";

import type { ReactNode } from "react";

import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 16,
          colorBgBase: "#f5f7fb",
          colorBgLayout: "#f5f7fb",
          colorBorderSecondary: "#e5eaf3",
          colorPrimary: "#1677ff",
          colorText: "#1f2937",
          colorTextSecondary: "#66758c",
          controlHeight: 44,
          fontFamily:
            "\"PingFang SC\", \"Microsoft YaHei\", \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
        },
        components: {
          Button: {
            controlHeight: 42,
          },
          Card: {
            borderRadiusLG: 24,
          },
          Input: {
            activeBorderColor: "#1677ff",
            hoverBorderColor: "#4096ff",
          },
          Select: {
            optionSelectedBg: "#e6f4ff",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
