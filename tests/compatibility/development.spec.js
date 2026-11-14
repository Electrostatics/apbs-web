const fs = require("node:fs/promises");
const path = require("node:path");
const { test, expect } = require("./fixtures");

test("serves the app and applies source updates without reloading the document", async ({ page, app }) => {
  const response = await page.goto(app.url);
  expect(response.status()).toBe(200);
  await expect(page.getByText("Welcome to the new home")).toBeVisible();
  expect(await page.evaluate(() => window._env_.OUTPUT_BUCKET_HOST)).toBe("https://outputs.example");
  const route = await page.request.get(`${app.url}/jobstatus/apbs/compatibility-job`, {
    headers: { Accept: "text/html" },
  });
  expect(route.status()).toBe(200);
  expect(await route.text()).toContain('<div id="root">');
  await expect(page.getByTestId("compatibility-probe")).toContainText("compatibility-v1");
  if (app.url.startsWith("https:")) {
    const details = await response.securityDetails();
    expect(details.protocol).toMatch(/^TLS/);
  }
  await page.evaluate(() => { window.compatibilityDocument = "unchanged"; });
  const filename = path.join(app.directory, "src/CompatibilityProbe.jsx");
  const original = await fs.readFile(filename, "utf8");
  await fs.writeFile(filename, original.replace("compatibility-v1", "compatibility-v2"));
  await expect(page.getByTestId("compatibility-probe")).toContainText("compatibility-v2");
  expect(await page.evaluate(() => window.compatibilityDocument)).toBe("unchanged");
});
