import { test, expect } from "@playwright/test";
import { loginAs } from "./auth";
test("Farmer sees demand and can explore; buyer has no demand navigation", async ({
  page,
}) => {
  await loginAs(page);
  await page.request.post(
    (process.env.TEST_API_URL || "http://127.0.0.1:8001") + "/api/reset",
  );
  await loginAs(page);
  await expect(
    page.getByRole("heading", { name: "What buyers need now" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demand now", exact: true }).click();
  const panel = page.locator(".demand-now");
  await expect(panel).toContainText("100");
  await expect(panel).toContainText("3 interested buyers");
  await expect(panel).toContainText("demo buyers");
  await panel.getByRole("button", { name: "Refresh demand" }).click();
  await panel
    .getByRole("button", { name: "Explore buyer offers" })
    .first()
    .click();
  await expect(panel).toHaveCount(0);
  await loginAs(page, "r1");
  await expect(
    page.getByRole("button", { name: "Demand now", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".demand-now")).toHaveCount(0);
});
