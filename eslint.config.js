import js from "@eslint/js";
import jest from "eslint-plugin-jest";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.*"] },
  js.configs.recommended,
  prettier,
  jest.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "no-constant-condition": ["error", { checkLoops: "all" }],
      "no-inner-declarations": [
        "error",
        "functions",
        { blockScopedFunctions: "disallow" },
      ],
      strict: ["error", "global"],
    },
  },
];
