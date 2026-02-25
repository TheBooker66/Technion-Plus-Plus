import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier, {
	languageOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		globals: {
			...globals.browser,
			...globals.webextensions,
		},
	},
	rules: {
		"@typescript-eslint/no-explicit-any": "warn",
		"no-async-promise-executor": "off",
		"no-case-declarations": "off",
		"no-fallthrough": "warn",
	},
});
