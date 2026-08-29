import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        NodeJS: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    files: ["tests/fixtures/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        setInterval: "readonly"
      }
    }
  },
  {
    ignores: ["dist/**", "node_modules/**", "logs/**", "data/**", "backups/**", "outputs/**", "work/**"]
  }
];
