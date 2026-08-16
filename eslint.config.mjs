import js from "@eslint/js";
import globals from "globals";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/**
 * Single flat config for every workspace. Each package's `lint` script points
 * at this file with `--config`, so rules can't drift between packages.
 */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs",
      // Service worker and migrations are plain JS with their own globals.
      "packages/web/public/**",
      "packages/api/src/migrations/**",
      "packages/api/src/seeders/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TypeScript already resolves identifiers; the base rule reports false
      // positives on type-only names and ambient declarations.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // `interface Foo extends Bar {}` is the established pattern for Sequelize
      // creation attributes and for shadcn component prop types.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
];
