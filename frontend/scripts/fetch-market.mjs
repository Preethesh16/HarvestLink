// Public report reader: ordinary page navigation, no login, CAPTCHA or private endpoints.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  channel: "chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  const response = await page.goto("https://agmarknet.gov.in/home", {
    waitUntil: "domcontentloaded",
  });
  if (!response?.ok())
    throw Error("Government page returned HTTP " + response?.status());
  await page
    .getByRole("button", { name: "Apply filters and fetch data", exact: true })
    .waitFor()
    .catch(async () => {
      throw Error(
        "Report controls unavailable: " +
          (await page.locator("body").innerText()).slice(0, 150),
      );
    });
  await page
    .getByRole("button", { name: "Apply filters and fetch data", exact: true })
    .click();
  const table = page.getByRole("table");
  await table.waitFor();
  await page.getByLabel("Rows per page", { exact: true }).selectOption("30");
  // Wait until the chosen page size has been applied to the report.
  await page.waitForFunction(
    () =>
      document.querySelectorAll("table tr").length > 12 ||
      document.querySelector('button[aria-label="Next page"]')?.disabled,
  );
  const rows = [];
  for (let n = 0; n < 10; n++) {
    const current = await table
      .locator("tr")
      .evaluateAll((rs) =>
        rs.map((r) =>
          Array.from(r.querySelectorAll("th,td")).map((c) =>
            c.textContent.trim(),
          ),
        ),
      );
    rows.push(...(n === 0 ? current : current.filter((r) => r.length === 9)));
    const next = page.getByRole("button", { name: "Next page", exact: true });
    if (await next.isDisabled()) break;
    if (n === 9)
      throw Error(
        "Report exceeds supported pagination; previous cache retained",
      );
    const first = await table.locator("tr").nth(2).innerText();
    await next.click();
    await page.waitForFunction(
      (old) => document.querySelectorAll("table tr")[2]?.innerText !== old,
      first,
    );
  }
  const text = await page.locator("body").innerText();
  const coverage = await page.locator("#state").innerText();
  process.stdout.write(
    JSON.stringify({
      rows,
      coverage,
      report_text:
        text.match(/data is frozen up to\s+\d{1,2}\s+\w+\s+\d{4}/i)?.[0] || "",
    }),
  );
} catch (e) {
  process.stderr.write(
    "Public government report unavailable: " + e.message.split("\n")[0],
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
