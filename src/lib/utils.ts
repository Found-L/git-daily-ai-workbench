import { clsx } from "clsx";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function shortHash(hash: string) {
  return hash.slice(0, 7);
}

export function maskSecret(value: string | null | undefined) {
  if (!value) {
    return "未配置";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}****`;
  }

  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

export function formatLocalDateTime(
  value: Date | string,
  locale = "zh-CN",
  timeZone?: string,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
