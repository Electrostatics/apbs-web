const { test, expect } = require("@playwright/test");
const http = require("node:http");
const path = require("node:path");
const { listen, close } = require("./fixtures");

test("Jest's jsdom loads documents and scripts through its real HTTP proxy agent", async () => {
  const requests = [];
  const target = http.createServer((req, res) => {
    if (req.url === "/probe.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end('window.proxyProbe = "script-loaded";');
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><script src="/probe.js"></script>');
    }
  });
  let proxy;
  let dom;
  try {
    const targetUrl = await listen(target);
    proxy = http.createServer((req, res) => {
      requests.push(req.url);
      const upstreamPath = req.url === `${targetUrl}/probe.js` ? "/probe.js"
        : req.url === `${targetUrl}/` ? "/" : null;
      if (upstreamPath === null) {
        res.writeHead(502).end();
        return;
      }
      const upstream = http.get(`${targetUrl}${upstreamPath}`, response => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on("error", () => res.writeHead(502).end());
    });
    const proxyUrl = await listen(proxy);
    const environment = require.resolve("jest-environment-jsdom", {
      paths: [path.dirname(require.resolve("react-scripts/package.json"))],
    });
    const { JSDOM, ResourceLoader } = require(require.resolve("jsdom", {
      paths: [path.dirname(environment)],
    }));
    dom = await JSDOM.fromURL(targetUrl, {
      resources: new ResourceLoader({ proxy: proxyUrl }),
      runScripts: "dangerously",
    });
    await new Promise(resolve => {
      if (dom.window.document.readyState === "complete") resolve();
      else dom.window.addEventListener("load", resolve, { once: true });
    });
    expect(dom.window.proxyProbe).toBe("script-loaded");
    expect(requests).toEqual([`${targetUrl}/`, `${targetUrl}/probe.js`]);
    await expect(new ResourceLoader({ proxy: proxyUrl }).fetch("http://not-a-real-host.invalid/"))
      .rejects.toThrow("Status: 502");
    await expect(new ResourceLoader({ proxy: proxyUrl }).fetch(`${targetUrl}/not-allowed`))
      .rejects.toThrow("Status: 502");
  } finally {
    if (dom) dom.window.close();
    if (proxy) await close(proxy);
    await close(target);
  }
});
