import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // This repo is in rapid iteration; keep lint signal high without blocking deploys.
  // Promote common "iteration noise" rules to warnings/off, while keeping the rest intact.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-sync-scripts": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
