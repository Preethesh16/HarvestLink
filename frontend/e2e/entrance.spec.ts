import { test, expect } from "@playwright/test";
import { loginAs } from "./auth";
test("landing sign-in onboarding, separate buyer workspace and logout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter your workspace" }).click();
  await page.getByLabel("Username", { exact: true }).fill("restaurant2");
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page
    .getByRole("button", { name: "Sign in to workspace", exact: true })
    .last()
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("Harvest@123");
  await page
    .getByRole("button", { name: "Sign in to workspace", exact: true })
    .last()
    .click();
  await expect(
    page
      .locator(".restaurant-workspace")
      .or(page.locator('input[name="name"]')),
  ).toBeVisible();
  if (await page.locator('input[name="name"]').isVisible()) {
    await page.getByRole("textbox").first().fill("Coastal Kitchen");
    await page.getByRole("textbox").nth(1).fill("Surathkal");
    await page.getByRole("button", { name: /Open my workspace/ }).click();
  }
  await expect(page.locator(".restaurant-workspace")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "List a harvest", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enter your workspace" }),
  ).toBeVisible();
});
test("language selection and farmer helper interactions", async ({ page }) => {
  await loginAs(page);
  await page.route("**/api/localize", async (route) => {
    const d = route.request().postDataJSON();
    await route.fulfill({
      json: {
        translations: Object.fromEntries(
          d.texts.map((s: string) => [s, s === "My harvest" ? "ನನ್ನ ಬೆಳೆ" : s]),
        ),
      },
    });
  });
  await page.getByLabel("Language / भाषा").selectOption("kn-IN");
  await expect(
    page.getByRole("button", { name: "ನನ್ನ ಬೆಳೆ", exact: true }),
  ).toBeVisible();
  await page.route("**/api/assistant", (route) =>
    route.fulfill({ json: { text: "ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಸೇರಿಸಿ." } }),
  );
  await page.locator(".bee-toggle").click();
  await page.locator(".bee-suggestions button").first().click();
  await expect(page.locator(".bee-answer")).toContainText(
    "ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಸೇರಿಸಿ.",
  );
  await page.locator(".bee-panel header button").click();
  await page.reload();
  await expect(page.getByLabel("Language / भाषा")).toHaveValue("kn-IN");
});
