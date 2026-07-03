// @ts-check
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "coverage", "node_modules"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {"@stylistic": stylistic}
  },
  {
    // Type-aware linting for the TypeScript source.
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      globals: {...globals.node, ...globals.jest},
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "no-explicit-any": "off",
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
      globals: {...globals.node},
      sourceType: "module"
    }
  },
  {
    rules: {
      "arrow-spacing": ["warn"],
      "block-spacing": ["warn"],
      "camelcase": ["warn", {properties: "never", ignoreImports: true, ignoreGlobals: true, ignoreDestructuring: true}],
      "func-call-spacing": ["warn", "never"],
      "id-length": ["warn", {"min": 2, "exceptions": ["a", "b", "i", "j", "_"]}],
      "no-multiple-empty-lines": ["warn", {"max": 1, "maxEOF": 0}],
      "no-multi-spaces": ["warn"],
      "no-whitespace-before-property": ["warn"],
      "spaced-comment": ["warn", "always"],
      "object-curly-spacing": ["warn"],
      "quotes": ["warn", "double"],
      "semi-spacing": ["warn"],
      "space-in-parens": ["warn", "never"],
      "space-infix-ops": ["warn"],
      "space-unary-ops": ["warn"],
      "brace-style": ["warn", "1tbs", {"allowSingleLine": true}],
      "indent": ["warn", 2, {"SwitchCase": 1}],
      "semi": ["warn"],
      "keyword-spacing": ["warn"],
      "key-spacing": ["warn", {"afterColon": true, "beforeColon": false}],
      "comma-spacing": ["warn"],
      "comma-dangle": ["warn", "never"],
      "space-before-blocks": ["warn"],
      "space-before-function-paren": ["warn", {"anonymous": "never", "named": "never", "asyncArrow": "always"}],
      "@stylistic/type-annotation-spacing": ["warn"],
      "@stylistic/padded-blocks": ["warn", {"classes": "always"}]
    }
  }
);
