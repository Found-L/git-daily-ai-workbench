import { describe, expect, it } from "vitest";

import { parseGitLogOutput } from "@/lib/git";

describe("parseGitLogOutput", () => {
  it("parses custom git log output into commits", () => {
    const output = "\u001eabc123\u001fAlice\u001falice@example.com\u001f2026-03-18T08:00:00+08:00\u001ffeat: init\u001fbody line\u001fmain\u001d10\t2\tsrc/app/page.tsx\n5\t1\tsrc/lib/git.ts";
    const commits = parseGitLogOutput(output);

    expect(commits).toHaveLength(1);
    expect(commits[0]?.hash).toBe("abc123");
    expect(commits[0]?.files).toEqual(["src/app/page.tsx", "src/lib/git.ts"]);
    expect(commits[0]?.additions).toBe(15);
    expect(commits[0]?.deletions).toBe(3);
  });
});
