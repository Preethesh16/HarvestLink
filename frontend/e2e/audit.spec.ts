import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

// Independent exploratory regressions; no database reset or paid AI requests.
async function uiLogin(page: import("@playwright/test").Page, user: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter your workspace" }).click();
  await page
    .getByRole("radio", {
      name: user === "farmer" ? /I’m a farmer/ : /I’m a buyer/,
    })
    .check();
  await page.getByLabel("Username", { exact: true }).fill(user);
  await page.getByLabel("Password", { exact: true }).fill("Harvest@123");
  await page
    .getByRole("button", { name: "Sign in to workspace", exact: true })
    .click();
  await expect(
    page.locator(".app").or(page.locator('input[name="name"]')),
  ).toBeVisible();
  if (await page.locator('input[name="name"]').isVisible()) {
    await page
      .locator('input[name="name"]')
      .fill(user === "farmer" ? "Ananya Farms" : `Audit ${user}`);
    await page.locator('input[name="location"]').fill("Mangaluru");
    await page
      .getByRole("button", { name: "Open my workspace", exact: true })
      .click();
  }
  await expect(page.locator(".app")).toBeVisible();
}

test("all four accounts enter separate workspaces and sign out", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const user of ["farmer", "restaurant1", "restaurant2", "restaurant3"]) {
    await uiLogin(page, user);
    await expect(
      page.locator(
        user === "farmer" ? ".farmer-workspace" : ".restaurant-workspace",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "List a harvest", exact: true }),
    ).toHaveCount(user === "farmer" ? 1 : 0);
    if (user !== "farmer") {
      await page
        .getByRole("button", { name: "Inventory & forecast", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Inventory batches" }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Enter your workspace" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Enter your workspace" }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("assistant Escape returns keyboard focus without an AI call", async ({
  page,
}) => {
  await uiLogin(page, "farmer");
  await page.locator(".bee-toggle").click();
  await expect(
    page.getByRole("textbox", { name: "Ask Madhu", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".bee-panel")).toHaveCount(0);
  await expect(page.locator(".bee-toggle")).toBeFocused();
});

test("320px farmer workspace keeps branding and role badge separate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await uiLogin(page, "farmer");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const brand = await page.locator(".sidebar .brand").boundingBox();
  const role = await page.locator(".sidebar .role-select").boundingBox();
  expect(brand).not.toBeNull();
  expect(role).not.toBeNull();
  expect(
    brand!.x + brand!.width <= role!.x ||
      brand!.y + brand!.height <= role!.y ||
      role!.y + role!.height <= brand!.y,
  ).toBeTruthy();
});

test("desktop landing language control does not cover Sign in", async ({
  page,
}) => {
  await page.goto("/");
  const language = await page.getByLabel("Language / भाषा").boundingBox();
  const signin = await page
    .getByRole("button", { name: "Sign in", exact: true })
    .boundingBox();
  expect(language).not.toBeNull();
  expect(signin).not.toBeNull();
  expect(
    language!.x + language!.width <= signin!.x ||
      language!.y + language!.height <= signin!.y,
  ).toBeTruthy();
});

test("missing forecast is an honest empty state", async ({ page }) => {
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, forecasts: {} } });
  });
  await uiLogin(page, "restaurant1");
  await page
    .getByRole("button", { name: "Inventory & forecast", exact: true })
    .click();
  await expect(page.locator(".empty-forecast")).toBeVisible();
  await expect(page.locator(".bar-column")).toHaveCount(0);
  await expect(
    page.getByText("No shortage projected", { exact: true }),
  ).toHaveCount(0);
});
