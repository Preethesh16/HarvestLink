import { test, expect } from "@playwright/test";
test("farm responds to drag, keyboard and reset with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const farm = page.locator(".welcome-scene .farm-scene");
  await expect(farm.locator("canvas")).toBeVisible();
  const box = await farm.boundingBox();
  if (!box) throw Error("Missing farm");
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(farm).not.toHaveAttribute("data-yaw", "0.000");
  await farm.focus();await page.keyboard.press("Home");
  await farm.focus();
  await page.keyboard.press("ArrowRight");
  await expect(farm).toHaveAttribute("data-yaw", "0.180");
  await page.keyboard.press("Home");
  await expect(farm).toHaveAttribute("data-yaw", "0.000");
  await page.setViewportSize({ width: 390, height: 844 });
  await farm.focus();await page.keyboard.press("ArrowLeft");
  await expect(farm).toHaveAttribute("data-yaw", "-0.180");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
