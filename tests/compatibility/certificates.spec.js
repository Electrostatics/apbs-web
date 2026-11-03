const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { X509Certificate, generateKeyPairSync } = require("node:crypto");
const { test, expect, listen, close, startScript, stop } = require("./fixtures");

test("serves the configured certificate through a trusted HTTPS connection", async ({ app }) => {
  const fingerprint = await new Promise((resolve, reject) => {
    const request = https.get(app.url, { ca: app.certificate }, response => {
      const fingerprint = response.socket.getPeerCertificate().fingerprint256;
      response.resume();
      response.on("end", () => resolve(fingerprint));
      response.on("error", reject);
    });
    request.on("error", reject);
  });
  expect(fingerprint).toBe(new X509Certificate(app.certificate).fingerprint256);
});

async function rejectCertificate(app, extraEnv, message) {
  const portServer = http.createServer();
  const port = new URL(await listen(portServer)).port;
  await close(portServer);
  const process = startScript(app.directory, "start", {
    NODE_ENV: "development", HTTPS: "true", PORT: port,
    SSL_CRT_FILE: "custom-cert.pem", SSL_KEY_FILE: "custom-key.pem", ...extraEnv,
  });
  try {
    await expect.poll(() => process.child.exitCode, { timeout: 30000 }).toBe(1);
    expect(process.output()).toMatch(message);
  } finally {
    await stop(process.child);
  }
}

test("rejects a configured certificate with a mismatched private key", async ({ app }) => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  await fs.writeFile(path.join(app.directory, "mismatched-key.pem"), privateKey, { mode: 0o600 });
  await rejectCertificate(app, { SSL_KEY_FILE: "mismatched-key.pem" }, /certificate key[\s\S]*is invalid/);
});

test("rejects a missing configured certificate instead of silently generating one", async ({ app }) => {
  await rejectCertificate(app, { SSL_CRT_FILE: "missing-cert.pem" }, /SSL_CRT_FILE[\s\S]*can't be found/);
});
