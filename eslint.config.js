import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettierPlugin from 'eslint-plugin-prettier';

export default defineConfig([
  {
    files: ["**/*.ts"],
    ignores: ["**/node_modules/", ".git/", "dist/"],
    plugins: { js, prettier: prettierPlugin },
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    },
    languageOptions: { globals: globals.browser },
  },
]);
