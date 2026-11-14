import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import browserslistToEsbuild from "browserslist-to-esbuild";

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const useHttps = command === "serve" && env.HTTPS === "true";
  const customCertificate = useHttps && (env.SSL_CRT_FILE || env.SSL_KEY_FILE);
  if (customCertificate && (!env.SSL_CRT_FILE || !env.SSL_KEY_FILE)) {
    throw new Error("HTTPS requires both SSL_CRT_FILE and SSL_KEY_FILE.");
  }

  return {
    plugins: [
      react({ jsxRuntime: "classic" }),
      ...(useHttps && !customCertificate ? [basicSsl()] : []),
    ],
    optimizeDeps: {
      exclude: ["react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    build: {
      outDir: "build",
      target: browserslistToEsbuild(),
    },
    server: {
      host: env.HOST || "localhost",
      port: Number(env.PORT || 3000),
      strictPort: true,
      https: customCertificate ? {
        cert: readFileSync(env.SSL_CRT_FILE),
        key: readFileSync(env.SSL_KEY_FILE),
      } : undefined,
    },
  };
});
