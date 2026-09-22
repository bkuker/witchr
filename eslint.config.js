import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "lib/emulator.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    // Let <script lang="ts"> blocks in .vue files be parsed as TypeScript
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: {
        ...globals.browser,
      },
    },
  },
  // Must be last: turns off ESLint rules that would fight Prettier
  prettier,
];
