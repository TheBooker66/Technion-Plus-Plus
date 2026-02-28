import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
	{
		ignores: ["node_modules/", "dist/", "dist.zip", "source.zip"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	eslintConfigPrettier,
	{
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
			"no-case-declarations": "off",
			"no-fallthrough": "warn",
			"prefer-template": "warn",
		},
	}
);
