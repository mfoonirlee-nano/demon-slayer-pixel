import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const BASE_NO_MAGIC_NUMBERS_OPTIONS = {
  ignore: [-1, 0, 1, 2, 0.5],
  ignoreArrayIndexes: true,
};

const TS_NO_MAGIC_NUMBERS_OPTIONS = {
  ...BASE_NO_MAGIC_NUMBERS_OPTIONS,
  ignoreEnums: true,
  ignoreNumericLiteralTypes: true,
  ignoreTypeIndexes: true,
};

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
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
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
      "@typescript-eslint/no-magic-numbers": ["error", TS_NO_MAGIC_NUMBERS_OPTIONS],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-magic-numbers": ["error", BASE_NO_MAGIC_NUMBERS_OPTIONS],
    },
  },
);
