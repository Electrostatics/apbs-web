const base = require("@playwright/test");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");

const root = path.resolve(__dirname, "../..");
const env = {
  GA_TRACKING_ID: "",
  REACT_APP_GA_MEASUREMENT_ID: "",
  API_TOKEN_URL: "/api/upload",
  OUTPUT_BUCKET_HOST: "https://outputs.example",
  ANNOUNCEMENTS_URL: "/info/announcements.json",
  PROJECT_HOME_URL: "/",
  REGISTRATION_URL: "/register",
  VIZ_URL: "/viz/3dmol",
};

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}

async function createApp() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "apbs-compatibility-"));
  try {
    for (const name of [
      "src", "public", "env", "scripts", "package.json", "tsconfig.json",
      "index.html", "vite.config.mjs", "postcss.config.cjs",
    ]) {
      await fs.cp(path.join(root, name), path.join(directory, name), { recursive: true });
    }
    const modules = path.join(directory, "node_modules");
    await fs.mkdir(modules);
    const entries = await fs.readdir(path.join(root, "node_modules"), { withFileTypes: true });
    // Keep generated certificates and build caches isolated from the checkout.
    await Promise.all(entries.filter(entry => ![".cache", ".vite", ".vite-temp"].includes(entry.name)).map(entry =>
      fs.symlink(path.join(root, "node_modules", entry.name), path.join(modules, entry.name),
        entry.isDirectory() ? "dir" : "file")));
    execFileSync(process.execPath, [path.join(directory, "scripts/generate-env.cjs")], {
      cwd: directory,
      env: { ...process.env, ...env },
    });
    await fs.writeFile(path.join(directory, "src/CompatibilityProbe.jsx"), `
import React from "react";
import image from "./compatibility.svg";
import "./compatibility.css";
export default function CompatibilityProbe() {
  return <div data-testid="compatibility-probe"><img src={image} alt="SVG probe" /><span>compatibility-v1</span></div>;
}
`);
    await fs.writeFile(path.join(directory, "src/compatibility.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#e02040"/></svg>');
    await fs.writeFile(path.join(directory, "src/compatibility.css"),
      '[data-testid="compatibility-probe"] { display: flex; background: rgb(12, 34, 56); color: white; gap: 8px; user-select: none; }');
    await fs.appendFile(path.join(directory, "src/index.jsx"), `
import CompatibilityProbe from "./CompatibilityProbe";
ReactDOM.render(<CompatibilityProbe />, document.body.appendChild(document.createElement("div")));
`);
    return directory;
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
}

function startScript(directory, name, extraEnv = {}) {
  const script = path.join(path.dirname(require.resolve("vite/package.json")), "bin/vite.js");
  const child = spawn(process.execPath,
    [script, ...(name === "build" ? ["build"] : [])], {
      cwd: directory,
      env: {
        ...process.env, CI: "true", BROWSER: "none", HOST: "127.0.0.1",
        SSL_CRT_FILE: "", SSL_KEY_FILE: "", HTTPS: "false",
        REACT_APP_GA_MEASUREMENT_ID: "", ...extraEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  const capture = data => { output = (output + data.toString()).slice(-20000); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  return { child, output: () => output };
}

const test = base.test.extend({
  app: [async ({ playwright }, use, workerInfo) => {
    const directory = await createApp();
    let server;
    let process;
    try {
      if (workerInfo.project.name === "production") {
        process = startScript(directory, "build", { CI: "false", NODE_ENV: "production" });
        const [code] = await once(process.child, "exit");
        if (code !== 0) throw new Error(process.output());
        const build = path.join(directory, "build");
        const types = {
          ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
          ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json",
        };
        server = http.createServer(async (req, res) => {
          const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
          const filename = path.resolve(build, `.${pathname}`);
          if (filename !== build && !filename.startsWith(build + path.sep)) {
            res.writeHead(400).end();
            return;
          }
          try {
            const file = await fs.readFile(filename);
            res.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
            res.end(file);
          } catch {
            if (path.extname(pathname)) res.writeHead(404).end();
            else {
              res.setHeader("Content-Type", "text/html");
              res.end(await fs.readFile(path.join(build, "index.html")));
            }
          }
        });
        const url = await listen(server);
        await use({ directory, url });
      } else {
        const portServer = http.createServer();
        const portUrl = await listen(portServer);
        const port = new URL(portUrl).port;
        await close(portServer);
        const https = workerInfo.project.name.includes("https");
        const url = `${https ? "https" : "http"}://127.0.0.1:${port}`;
        const serverEnv = {
          NODE_ENV: "development", HTTPS: String(https), PORT: port,
        };
        let certificate;
        if (workerInfo.project.name === "development-custom-https") {
          const selfsigned = require("selfsigned");
          const pems = await selfsigned.generate(
            [{ name: "commonName", value: "apbs-compatibility-custom" }],
            {
              algorithm: "sha256",
              keySize: 2048,
              extensions: [{ name: "subjectAltName", altNames: [{ type: 7, ip: "127.0.0.1" }] }],
            }
          );
          certificate = pems.cert;
          await fs.writeFile(path.join(directory, "custom-cert.pem"), pems.cert);
          await fs.writeFile(path.join(directory, "custom-key.pem"), pems.private, { mode: 0o600 });
          serverEnv.SSL_CRT_FILE = "custom-cert.pem";
          serverEnv.SSL_KEY_FILE = "custom-key.pem";
        }
        process = startScript(directory, "start", serverEnv);
        const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
        try {
          await base.expect.poll(async () => {
            if (process.child.exitCode !== null || process.child.signalCode !== null) {
              throw new Error(process.output());
            }
            try {
              return (await request.get(url, { timeout: 2000 })).status();
            } catch {
              return 0;
            }
          }, { timeout: 180000, message: "Vite development server must become responsive" }).toBe(200);
        } catch (error) {
          throw new Error(`${error.message}\n${process.output()}`);
        } finally {
          await request.dispose();
        }
        await use({ directory, url, certificate });
      }
    } finally {
      try {
        if (process) {
          await stop(process.child);
          if (process.child.signalCode === null) {
            base.expect([0, 143], process.output()).toContain(process.child.exitCode);
          } else {
            base.expect(process.child.signalCode, process.output()).toBe("SIGTERM");
          }
        }
      } finally {
        if (server) await close(server);
        await fs.rm(directory, { recursive: true, force: true });
      }
    }
  }, { scope: "worker", timeout: 300000 }],
  context: async ({ context, app }, use) => {
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin === app.url) return route.continue();
      // Tests never depend on external analytics, CDNs, or live cloud services.
      return route.abort();
    });
    await context.route("**/info/announcements.json", route =>
      route.fulfill({ json: [] }));
    const jquery = await fs.readFile(require.resolve("jquery/dist/jquery.min.js"), "utf8");
    await context.route("https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js",
      route => route.fulfill({ contentType: "application/javascript", body: jquery }));
    await use(context);
  },
  runtimeErrors: [async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(errors);
    base.expect(errors).toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect: base.expect, listen, close, startScript, stop };
