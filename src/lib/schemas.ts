import { z } from "zod";

import {
  BRANCH_MODES,
  PROJECT_SOURCE_TYPES,
  REPORT_PERIODS,
  type NormalizedProjectInput,
} from "@/lib/types";
import { splitMultiValueInput } from "@/lib/serialization";

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const projectPayloadSchema = z
  .object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(2, "项目名称至少需要 2 个字符"),
    sourceType: z.enum(PROJECT_SOURCE_TYPES),
    localPath: z.string().optional().default(""),
    remoteUrl: z.string().optional().default(""),
    cacheDir: z.string().optional().default(""),
    branchMode: z.enum(BRANCH_MODES),
    selectedBranches: z.string().optional().default(""),
    authorNames: z.string().optional().default(""),
    authorEmails: z.string().optional().default(""),
    defaultPeriod: z.enum(REPORT_PERIODS).optional().default("day"),
    timezone: z.string().trim().min(1, "需要时区"),
    llmBaseUrl: z.string().optional().default(""),
    llmApiKey: z.string().optional().default(""),
    llmModel: z.string().optional().default(""),
    llmTemperature: z.union([z.string(), z.number()]).optional().default("0.3"),
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === "local" && !value.localPath.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "本地仓库模式需要提供仓库路径",
        path: ["localPath"],
      });
    }

    if (value.sourceType === "remote" && !value.remoteUrl.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "远程仓库模式需要提供仓库地址",
        path: ["remoteUrl"],
      });
    }

    if (value.branchMode === "selected" && splitMultiValueInput(value.selectedBranches).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "指定分支模式至少需要填写一个分支",
        path: ["selectedBranches"],
      });
    }
  });

export function normalizeProjectInput(input: unknown): NormalizedProjectInput {
  const parsed = projectPayloadSchema.parse(input);
  const temperature = Number(parsed.llmTemperature);

  return {
    id: parsed.id,
    name: parsed.name,
    sourceType: parsed.sourceType,
    localPath: emptyToNull(parsed.localPath),
    remoteUrl: emptyToNull(parsed.remoteUrl),
    cacheDir: emptyToNull(parsed.cacheDir),
    branchMode: parsed.branchMode,
    selectedBranches: splitMultiValueInput(parsed.selectedBranches),
    authorNames: splitMultiValueInput(parsed.authorNames),
    authorEmails: splitMultiValueInput(parsed.authorEmails),
    defaultPeriod: parsed.defaultPeriod,
    timezone: parsed.timezone,
    llmBaseUrl: emptyToNull(parsed.llmBaseUrl),
    llmApiKey: emptyToNull(parsed.llmApiKey),
    llmModel: emptyToNull(parsed.llmModel),
    llmTemperature: Number.isFinite(temperature) ? temperature : 0.3,
  };
}
