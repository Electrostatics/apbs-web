import babelParser from "@babel/eslint-parser";
import react from "eslint-plugin-react";

export default [
  { ignores: ["build/**", "node_modules/**", "src/**/*.d.ts"] },
  {
    files: ["**/*.{js,jsx,ts,tsx,cjs,mjs}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: { requireConfigFile: true },
    },
    plugins: { react },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-vars": "warn",
      "react/jsx-uses-react": "warn",
      "react/jsx-no-undef": "error",
    },
  },
];
