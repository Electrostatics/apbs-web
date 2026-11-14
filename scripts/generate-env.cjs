const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { parse } = require("dotenv");

const root = path.resolve(__dirname, "..");
const defaults = parse(readFileSync(path.join(root, "env/.env")));
// Only explicitly listed public settings may enter the browser configuration.
const config = Object.fromEntries(Object.entries(defaults).map(([key, value]) =>
  [key, process.env[key] || value]));
writeFileSync(path.join(root, "public/env-config.js"),
  `window._env_ = ${JSON.stringify(config, null, 2)};\n`);
