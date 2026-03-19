import { expect, test } from "@playwright/test";

test("homepage opens the create project drawer", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "把提交历史整理成真正可读的日报。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "添加项目" }).click();
  await expect(page.getByRole("dialog", { name: "添加项目" })).toBeVisible();
  await expect(page.locator('input[name="project_name"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "创建项目" })).toBeVisible();
});
