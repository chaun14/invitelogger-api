import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const nodeGlobals = {
  Buffer: "readonly",
  console: "readonly",
  process: "readonly",
  setImmediate: "readonly",
};

const commonJsGlobals = {
  __dirname: "readonly",
  module: "readonly",
  require: "readonly",
};

const jestGlobals = {
  beforeEach: "readonly",
  describe: "readonly",
  expect: "readonly",
  it: "readonly",
  jest: "readonly",
};

const baseRules = {
  indent: ["error", 2, { SwitchCase: 1, ignoredNodes: ["PropertyDefinition"] }],
  "linebreak-style": ["error", "unix"],
  quotes: ["error", "double"],
  semi: ["error", "always"],
  "no-case-declarations": "off",
  "prettier/prettier": "error",
};

export default [
  {
    ignores: ["bin/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,cjs}"],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...nodeGlobals,
        ...commonJsGlobals,
        ...jestGlobals,
      },
    },
    rules: baseRules,
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: nodeGlobals,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...baseRules,
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettierConfig,
];
