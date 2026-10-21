import { test, expect } from "@playwright/test";
import { loginAs } from "./auth";
test("farmer gets seasonal shortlist with demand evidence and constraints", async ({
  page,
}) => {
  await loginAs(page);
  await page
    .getByRole("button", { name: "What to grow next", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suggest crops", exact: true })
    .click();
  await expect(page.locator(".crop-option")).toHaveCount(4);
  await expect(page.locator(".plan-summary")).toContainText(
    "Planning scenario",
  );
  await expect(
    page
      .locator(".crop-option")
      .filter({
        has: page.getByRole("heading", { name: "Tomato", exact: true }),
      }),
  ).toContainText("demo kitchens");
  await page.getByLabel("Water availability").selectOption("limited");
  await page
    .getByRole("button", { name: "Suggest crops", exact: true })
    .click();
  await expect(
    page.getByText("Resolve growing constraints first", { exact: true }),
  ).toHaveCount(4);
  await page.screenshot({
    path: "../docs/images/crop-planning.png",
    fullPage: true,
  });
  await loginAs(page, "r1");
  await expect(
    page.getByRole("button", { name: "What to grow next", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post(
        (process.env.TEST_API_URL || "http://127.0.0.1:8000") +
          "/api/crop-plan",
        { data: { location: "Bantwal" } },
      )
    ).status(),
  ).toBe(403);
});
