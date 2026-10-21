import type { Page } from "@playwright/test";
const API = process.env.TEST_API_URL || "http://127.0.0.1:8000";
export async function loginAs(page: Page, actor = "farmer") {
  const username =
    actor === "farmer" ? "farmer" : `restaurant${actor.slice(1)}`;
  const login = await page.request.post(API + "/api/auth/login", {
    data: { username, password: "Harvest@123" },
  });
  if (!login.ok()) throw Error("Test login failed");
  await page.request.post(API + "/api/auth/onboard", {
    data: {
      name:
        actor === "farmer"
          ? "Ananya Farms"
          : actor === "r1"
            ? "The Green Table"
            : actor === "r2"
              ? "Coastal Kitchen"
              : "Roots & Grains",
      location: "Mangaluru",
    },
  });
  await page.goto("/");
}
