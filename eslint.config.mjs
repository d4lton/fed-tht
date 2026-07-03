// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "coverage", "node_modules"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: { "@stylistic": stylistic }
  },
  {
    // Type-aware linting for the TypeScript source.
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn"
    }
  },
  {
    // JS/ESM files (this config file included): parse as modules, and no
    // type-aware rules — they aren't part of the TypeScript project.
    files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      sourceType: "module"
    }
  },
  {
    // Style rules that don't need type information — apply everywhere.
    rules: {
      curly: ["error", "all"],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "never", prev: "*", next: "*" },
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "never", prev: "import", next: "import" },
        {
          blankLine: "any",
          prev: "*",
          next: ["function", "class", "export", "interface", "type", "enum"]
        },
        {
          blankLine: "any",
          prev: ["function", "class", "export", "interface", "type", "enum"],
          next: "*"
        }
      ]
    }
  }
);
