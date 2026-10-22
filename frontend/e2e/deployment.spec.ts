import { test, expect } from "@playwright/test";
import { loginAs } from "./auth";
test("Hosted farmer and buyer workspace navigation", async ({ page }) => {
  test.setTimeout(120000);
  await loginAs(page);
  await expect(
    page.getByRole("heading", { name: "What buyers need now" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Demand now", exact: true }).click();
  await expect(page.locator(".demand-now")).toContainText("demo buyers");
  await page.getByRole("button", { name: "My harvest", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Import Excel / CSV", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "../var/hosted-farmer.png", fullPage: true });
  await loginAs(page, "r1");
  await expect(
    page.getByRole("button", { name: "My harvest", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Demand now", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Inventory & forecast", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Marketplace", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "../var/hosted-buyer.png", fullPage: true });
});
