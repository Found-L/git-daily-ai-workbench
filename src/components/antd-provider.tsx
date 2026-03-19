"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { App, Button, ConfigProvider, theme, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";

const THEME_STORAGE_KEY = "git-daily-ai-workbench-theme";
const THEME_CHANGE_EVENT = "git-daily-ai-workbench-theme-change";

type ThemeMode = "light" | "dark";

function readStoredTheme() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
}

function getThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  return readStoredTheme() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    if (!readStoredTheme()) {
      onStoreChange();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };
  const handleThemeChange = () => {
    onStoreChange();
  };

  mediaQuery.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleMediaChange);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

function writeTheme(themeMode: ThemeMode) {
  window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function AntdProvider({ children }: { children: ReactNode }) {
  const themeMode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  const isDarkMode = themeMode === "dark";

  const configTheme = useMemo(
    () => ({
      algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        borderRadius: 18,
        colorBgBase: isDarkMode ? "#08101d" : "#f7efe4",
        colorBgLayout: isDarkMode ? "#060d17" : "#f6efe7",
        colorBorderSecondary: isDarkMode ? "rgba(157, 186, 255, 0.16)" : "#e5d7c8",
        colorPrimary: isDarkMode ? "#78a6ff" : "#1f6fff",
        colorText: isDarkMode ? "#edf3ff" : "#1f2937",
        colorTextSecondary: isDarkMode ? "#95a7c4" : "#66758c",
        controlHeight: 46,
        fontFamily:
          "\"PingFang SC\", \"Microsoft YaHei\", \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
      },
      components: {
        Button: {
          controlHeight: 44,
          primaryShadow: isDarkMode
            ? "0 12px 30px rgba(52, 121, 255, 0.28)"
            : "0 12px 28px rgba(31, 111, 255, 0.2)",
        },
        Card: {
          borderRadiusLG: 26,
        },
        Input: {
          activeBorderColor: isDarkMode ? "#78a6ff" : "#1677ff",
          hoverBorderColor: isDarkMode ? "#91b6ff" : "#4096ff",
        },
        Select: {
          optionSelectedBg: isDarkMode ? "rgba(120, 166, 255, 0.18)" : "#e6f4ff",
        },
        DatePicker: {
          activeBorderColor: isDarkMode ? "#78a6ff" : "#1677ff",
          hoverBorderColor: isDarkMode ? "#91b6ff" : "#4096ff",
        },
      },
    }),
    [isDarkMode],
  );

  return (
    <ConfigProvider locale={zhCN} theme={configTheme}>
      <App notification={{ placement: "bottomRight", duration: 2.6, stack: { threshold: 4 } }}>
        {children}
        <Tooltip title={isDarkMode ? "切换到亮色模式" : "切换到暗黑模式"}>
          <Button
            className="theme-toggle"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => writeTheme(isDarkMode ? "light" : "dark")}
            size="large"
          >
            {isDarkMode ? "亮色" : "暗黑"}
          </Button>
        </Tooltip>
      </App>
    </ConfigProvider>
  );
}
