export const PROJECT_SOURCE_TYPES = ["local", "remote"] as const;
export type ProjectSourceType = (typeof PROJECT_SOURCE_TYPES)[number];

export const BRANCH_MODES = ["all", "selected"] as const;
export type BranchMode = (typeof BRANCH_MODES)[number];

export const REPORT_PERIODS = ["day", "week", "month"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export type NormalizedProjectInput = {
  id?: string;
  name: string;
  sourceType: ProjectSourceType;
  localPath: string | null;
  remoteUrl: string | null;
  cacheDir: string | null;
  branchMode: BranchMode;
  selectedBranches: string[];
  authorNames: string[];
  authorEmails: string[];
  defaultPeriod: ReportPeriod;
  timezone: string;
  llmBaseUrl: string | null;
  llmApiKey: string | null;
  llmModel: string | null;
  llmTemperature: number;
};

export type PeriodWindow = {
  period: ReportPeriod;
  timezone: string;
  label: string;
  start: Date;
  end: Date;
};

export type CommitRecordView = {
  id: string;
  hash: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  subject: string;
  body: string | null;
  files: string[];
  additions: number;
  deletions: number;
  refNames: string[];
};

export type StructuredReport = {
  periodLabel: string;
  period: ReportPeriod;
  timezone: string;
  branchScope: string[];
  authorScope: {
    names: string[];
    emails: string[];
  };
  totals: {
    commits: number;
    authors: number;
    additions: number;
    deletions: number;
    filesTouched: number;
  };
  topAuthors: Array<{
    name: string;
    commits: number;
  }>;
  hotspots: Array<{
    file: string;
    touches: number;
  }>;
  highlights: string[];
  risks: string[];
  nextSteps: string[];
  commitReferences: Array<{
    hash: string;
    shortHash: string;
    authorName: string;
    committedAt: string;
    subject: string;
    files: string[];
  }>;
};
