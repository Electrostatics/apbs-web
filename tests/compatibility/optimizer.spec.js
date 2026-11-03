const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const resolveUrlLoader = require("resolve-url-loader");

test("resolves CSS asset URLs from source maps while preserving query strings and fragments", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "apbs-loader-"));
  try {
    const styles = path.join(directory, "styles");
    await fs.mkdir(styles);
    await fs.writeFile(path.join(styles, "icon.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
    const content = '.probe { background: url("./icon.svg?color=red#shape"); }';
    const sourceMap = {
      version: 3,
      sources: [path.join(styles, "source.scss")],
      sourcesContent: [content],
      names: [],
      mappings: "AAAA",
    };
    const warnings = [];
    const result = await new Promise((resolve, reject) => {
      resolveUrlLoader.call({
        context: directory,
        rootContext: directory,
        resourcePath: path.join(directory, "compiled.css"),
        fs: require("node:fs"),
        sourceMap: true,
        getOptions: () => ({ sourceMap: true }),
        cacheable: () => {},
        emitWarning: warning => warnings.push(warning.message),
        emitError: reject,
        async: () => (error, css, map) => {
          if (error) reject(error);
          else resolve({ css, map });
        },
      }, content, sourceMap);
    });
    expect(warnings).toEqual([]);
    expect(result.css).toContain("./styles/icon.svg?color=red#shape");
    expect(result.map.sources.map(source => path.resolve(directory, source)))
      .toContain(path.join(styles, "source.scss"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
