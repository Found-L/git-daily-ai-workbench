import { expect, test } from "@playwright/test";

test("homepage opens the create project drawer", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "把提交历史整理成真正可读的日报。" }),
  ).toBeVisible();
  await page.getByTestId("hero-add-project-button").click();
  await expect(page.locator('input[name="project_name"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "创建项目" })).toBeVisible();
});
