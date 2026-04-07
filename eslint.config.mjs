import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const MAGIC_NUMBER_IGNORES = [-1, 0, 1, 2];

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "assets"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "no-unused-vars": "off",
      "no-magic-numbers": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: MAGIC_NUMBER_IGNORES,
          ignoreArrayIndexes: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
    },
  },
);
