const fs = require("node:fs/promises");
const zlib = require("node:zlib");
const { test, expect } = require("./fixtures");

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
  const pixel = await probe.locator("svg").evaluate(async svg => {
    const image = new Image();
    image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
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
  test(`renders real 3Dmol data and exports a PNG (${compressed ? "gzip" : "plain"} DX)`, async ({ page, app }) => {
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
  });
}
