const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const JSZip = require("jszip");
const zlib = require("node:zlib");
const { test, expect } = require("./fixtures");

test("compiles with the CI command without generating deployment configuration", async ({ app }) => {
  const filename = path.join(app.directory, "public/env-config.js");
  const original = await fs.readFile(filename, "utf8");
  try {
    await fs.unlink(filename);
    execFileSync("npm", ["run", "build:app", "--", "--outDir", "build-without-config"], {
      cwd: app.directory,
      env: { ...process.env, CI: "true" },
    });
    const output = path.join(app.directory, "build-without-config");
    expect(await fs.readFile(path.join(output, "index.html"), "utf8")).toContain('<div id="root">');
    await expect(fs.access(path.join(output, "env-config.js"))).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    await fs.writeFile(filename, original);
  }
});

test("generates escaped public settings without exporting unlisted environment variables", async ({ app }) => {
  const filename = path.join(app.directory, "public/env-config.js");
  const original = await fs.readFile(filename, "utf8");
  const value = 'https://outputs.example/"quoted"\\path\nnext-line';
  try {
    execFileSync(process.execPath, [path.join(app.directory, "scripts/generate-env.cjs")], {
      cwd: app.directory,
      env: { ...process.env, OUTPUT_BUCKET_HOST: value, UNLISTED_SETTING: "not-public" },
    });
    const script = await fs.readFile(filename, "utf8");
    const settings = JSON.parse(script.slice("window._env_ = ".length, -2));
    expect(settings.OUTPUT_BUCKET_HOST).toBe(value);
    expect(settings).not.toHaveProperty("UNLISTED_SETTING");
  } finally {
    await fs.writeFile(filename, original);
  }
});

test("ships Azure navigation fallback and uses analytics settings from runtime configuration", async ({ page, app }) => {
  const response = await page.request.get(`${app.url}/staticwebapp.config.json`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ navigationFallback: { rewrite: "/index.html" } });
  const config = await (await page.request.get(`${app.url}/env-config.js`)).text();
  await page.route("**/env-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: `${config}\nwindow._env_.REACT_APP_GA_MEASUREMENT_ID = "G-RUNTIME123";`,
  }));
  await page.route("https://www.googletagmanager.com/**", route =>
    route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.goto(app.url);
  await expect(page.getByText("Welcome to the new home")).toBeVisible();
  await expect(page.locator('script[src="https://www.googletagmanager.com/gtag/js?id=G-RUNTIME123"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.dataLayer.some(entry =>
    entry[0] === "config" && entry[1] === "G-RUNTIME123"))).toBe(true);
});

for (const failure of ["download", "initialization"]) {
  test(`shows a startup error when viewer ${failure} fails`, async ({ page, app }) => {
    await page.route("**/assets/3Dmol-nojquery-min-*.js", route =>
      failure === "download" ? route.abort() :
        route.fulfill({ contentType: "application/javascript", body: "window.$3Dmol = {};" }));
    await page.goto(app.url);
    await expect(page.getByRole("alert")).toHaveText("Unable to load the application. Please reload the page.");
    await expect(page.getByText("Welcome to the new home")).toHaveCount(0);
  });
}

const pqr = [
  "ATOM      1  N   GLY     1       0.000   0.000   0.000 -0.3000 1.5500",
  "ATOM      2  CA  GLY     1       1.500   0.000   0.000  0.1000 1.7000",
  "ATOM      3  C   GLY     1       2.500   1.000   0.000  0.5000 1.7000",
  "ATOM      4  O   GLY     1       3.500   1.000   0.000 -0.3000 1.5000",
].join("\n");
const dx = [
  "object 1 class gridpositions counts 2 2 2", "origin -5 -5 -5",
  "delta 10 0 0", "delta 0 10 0", "delta 0 0 10",
  "object 2 class gridconnections counts 2 2 2",
  "object 3 class array type double rank 0 items 8 data follows",
  "-2 -1 0 1 2 1 0 -1", 'attribute "dep" string "positions"',
  'object "potential" class field', 'component "positions" value 1',
  'component "connections" value 2', 'component "data" value 3',
].join("\n");

async function countColoredPixels(page, imageURL) {
  return page.evaluate(async url => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 0 && pixels[i + 3] > 0) count++;
    }
    return count;
  }, imageURL);
}

test("runs minified application code and preserves optimized CSS and SVG rendering", async ({ page, app }) => {
  await page.goto(app.url);
  await expect(page.getByText("Welcome to the new home")).toBeVisible();
  const probe = page.getByTestId("compatibility-probe");
  await expect(probe).toHaveCSS("display", "flex");
  await expect(probe).toHaveCSS("background-color", "rgb(12, 34, 56)");
  await expect(probe).toHaveCSS("gap", "8px");
  const pixel = await probe.locator("img").evaluate(async element => {
    const image = new Image();
    image.src = element.src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 20;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(20, 10, 1, 1).data);
  });
  expect(pixel).toEqual([224, 32, 64, 255]);
  const logo = page.locator("img.logo").first();
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.goto(`${app.url}/pdb2pqr`);
  await expect(page.getByRole("button", { name: "Start Job" })).toBeVisible();
  await page.getByRole("button", { name: "Start Job" }).click();
  await expect(page.getByText("Please input a PDB ID")).toBeVisible();
});

for (const compressed of [false, true]) {
  test(`renders real 3Dmol data and exports PNG and script archives (${compressed ? "gzip" : "plain"} DX)`, async ({ page, app }) => {
    const prefix = "2026-10-24/test-job";
    const volumeName = compressed ? "potential.gz.dx" : "potential.dx";
    await page.route("https://outputs.example/**", route => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      if (name === "apbs-status.json") {
        return route.fulfill({ json: { apbs: { outputFiles: [`${prefix}/${volumeName}`] } } });
      }
      if (name === "test-job.pqr") return route.fulfill({ contentType: "text/plain", body: pqr });
      if (name === volumeName) return route.fulfill({
        contentType: "application/octet-stream",
        body: compressed ? zlib.gzipSync(dx) : dx,
      });
      return route.fulfill({ status: 404 });
    });
    const structureResponse = page.waitForResponse(response => response.url().endsWith("/test-job.pqr"));
    const volumeResponse = page.waitForResponse(response => response.url().endsWith(`/${volumeName}`));
    await page.goto(`${app.url}/viz/3dmol?jobid=test-job&pqr=test-job&date=2026-10-24`);
    await Promise.all([structureResponse, volumeResponse]);
    const canvas = page.locator("#gldiv canvas").first();
    await expect(canvas).toBeVisible();
    // Surfaces finish asynchronously; a canvas element alone doesn't prove rendering works.
    await expect.poll(async () => countColoredPixels(
      page, await canvas.evaluate(element => element.toDataURL())
    )).toBeGreaterThan(100);
    await page.locator(".ant-select").filter({ has: page.locator("#selected_vis") }).click();
    await page.getByText("Sphere", { exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("test-job_3dmol.png");
    const png = await fs.readFile(await download.path());
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const nonBlackPixels = await countColoredPixels(page, `data:image/png;base64,${png.toString("base64")}`);
    expect(nonBlackPixels).toBeGreaterThan(100);

    for (const [format, extension] of [["PyMol", "pml"], ["UnityMol", "py"]]) {
      await page.locator(".ant-select").filter({ has: page.locator("#select_export_type") }).click();
      await page.getByText(format, { exact: true }).click();
      const archiveDownloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export", exact: true }).click();
      const archiveDownload = await archiveDownloadPromise;
      const basename = `test-job_${format}`;
      expect(archiveDownload.suggestedFilename()).toBe(`${basename}.zip`);
      const archive = await JSZip.loadAsync(await fs.readFile(await archiveDownload.path()));
      expect(Object.keys(archive.files).filter(name => !archive.files[name].dir).sort()).toEqual([
        `${basename}/${basename}.${extension}`,
        `${basename}/test-job.pqr`,
        `${basename}/${volumeName}`,
      ].sort());
      expect(await archive.file(`${basename}/test-job.pqr`).async("string")).toBe(pqr);
      const potential = await archive.file(`${basename}/${volumeName}`).async("nodebuffer");
      expect((compressed ? zlib.gunzipSync(potential) : potential).toString()).toBe(dx);
      const script = await archive.file(`${basename}/${basename}.${extension}`).async("string");
      expect(script).toContain("test-job.pqr");
      expect(script).toContain(volumeName);
      await expect(page.getByRole("button", { name: "Export", exact: true })).toBeEnabled();
    }
  });
}
