import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
    {   // nodejs
        ignores: ["public/**"],
        extends: [js.configs.recommended],
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
        extends: [js.configs.recommended],
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
                "argsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_",
            }],
            "no-empty": ["error", {
                "allowEmptyCatch": true,
            }],
            // we must be backward compatible with pre-Chromium MS-Edge, used in Microsoft apps (Office 365, Onedrive...)
            // (user-agent : Mozilla/5.0 (Windows NT 10.0; Win64; x64; WebView/3.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.22631)
            // so disallow modern JS syntax:
            "no-restricted-syntax": ["error",
                "ChainExpression", "ObjectExpression > SpreadElement", "LogicalExpression[operator='??']"
            ],
        },
    }
]);