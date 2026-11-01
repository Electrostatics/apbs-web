const fs = require("node:fs/promises");
const path = require("node:path");
const { test, expect } = require("./fixtures");

test("serves the app and applies source updates over the live-reload WebSocket", async ({ page, app }) => {
  const frames = [];
  page.on("websocket", socket => {
    if (new URL(socket.url()).pathname === "/ws") {
      socket.on("framereceived", frame => frames.push(JSON.parse(frame.payload)));
    }
  });
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
  await expect.poll(() => frames.some(frame => ["ok", "warnings"].includes(frame.type))).toBe(true);
  if (app.url.startsWith("https:")) {
    const details = await response.securityDetails();
    expect(details.protocol).toMatch(/^TLS/);
  }
  await page.evaluate(() => { window.compatibilityDocument = "unchanged"; });
  const filename = path.join(app.directory, "src/CompatibilityProbe.js");
  const original = await fs.readFile(filename, "utf8");
  await fs.writeFile(filename, original.replace("compatibility-v1", "compatibility-v2"));
  await expect(page.getByTestId("compatibility-probe")).toContainText("compatibility-v2");
  expect(await page.evaluate(() => window.compatibilityDocument)).toBe("unchanged");
});

test("proxies HTTP bodies and SockJS WebSocket messages to a local backend", async ({ page, app }) => {
  await page.goto(app.url);
  const response = await page.evaluate(async () => {
    const result = await fetch("/compat-api/ping", { method: "POST", body: "request-body" });
    return result.json();
  });
  expect(response).toEqual({ method: "POST", path: "/compat-api/ping", body: "request-body" });
  const defaultProxy = await page.evaluate(async () => {
    const result = await fetch("/default-proxy/ping");
    return result.json();
  });
  expect(defaultProxy).toEqual({ method: "GET", path: "/default-proxy/ping", body: "" });
  const echoed = await page.evaluate(() => new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/compat-sockjs/websocket`
    );
    const timeout = setTimeout(() => { socket.close(); reject(new Error("WebSocket echo timed out")); }, 10000);
    socket.onopen = () => socket.send("compatibility-echo");
    socket.onerror = () => reject(new Error("WebSocket proxy failed"));
    socket.onmessage = event => {
      clearTimeout(timeout);
      socket.close();
      resolve(event.data);
    };
  }));
  expect(echoed).toBe("compatibility-echo");
});
