import { expect, test } from "@playwright/test";

test("homepage renders the create project form", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "把提交历史整理成你真正能读的日报。" })).toBeVisible();
  await expect(page.getByLabel("项目名称")).toBeVisible();
  await expect(page.getByRole("button", { name: "创建项目" })).toBeVisible();
});
