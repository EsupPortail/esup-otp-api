import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {   // nodejs
        ignores: ["public/**"],
        extends: compat.extends("eslint:recommended"),
        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": ["error", {
                "args": "all",
                "varsIgnorePattern": "^_",
                "argsIgnorePattern": "^(_|((t|user|req|res)$))", // ignore `(t) => {...}` in ./test/ , and user|req|res
                "caughtErrorsIgnorePattern": "^_",
                "destructuredArrayIgnorePattern": "^_",
            }],
        },
    },
    {   // browser
        files: ["public/**/*.js"],
        extends: compat.extends("eslint:recommended"),
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jquery,
            },

            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": ["warn", {
                "args": "all",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_",
            }],
            "no-empty": ["error", {
                "allowEmptyCatch": true,
            }],
        },
    }
]);
