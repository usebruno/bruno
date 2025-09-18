// eslint.config.js
const { defineConfig } = require("eslint/config");
const globals = require("globals");
const stylistic = require('@stylistic/eslint-plugin');
const { fixupPluginRules } = require('@eslint/compat');
const eslintPluginDiff = require('eslint-plugin-diff');

module.exports = defineConfig([
  {
    plugins: {
      diff: fixupPluginRules(eslintPluginDiff),
    },
    files: ['*'],
    processor: 'diff/staged',
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/curly-newline': ['error', 'always'],
      '@stylistic/function-paren-newline': ['error', 'never'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
    },
  },
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    arrowParens: false,
    jsx: true,
  }),
  {
    files: ["packages/bruno-app/**/*.{js,jsx,ts}"],
    ignores: ["**/*.config.js", "**/public/**/*"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        global: false,
        require: false,
        Buffer: false,
        process: false,
        ipcRenderer: false
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    // It prevents lint errors when using CommonJS exports (module.exports) in Jest mocks.
    files: ["packages/bruno-app/src/test-utils/mocks/codemirror.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-cli/**/*.js"],
    ignores: ["**/*.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: "latest"
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-common/**/*.ts"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./packages/bruno-common/tsconfig.json",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-converters/**/*.js"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-electron/**/*.js"],
    ignores: ["**/*.config.js", "**/web/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-filestore/**/*.ts"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./packages/bruno-filestore/tsconfig.json",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-js/**/*.js"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        window: false,
        self: false,
        HTMLElement: false,
        typeDetectGlobalObject: false
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-lang/**/*.js"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-requests/**/*.ts"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./packages/bruno-requests/tsconfig.json",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
  {
    files: ["packages/bruno-requests/**/*.js"],
    ignores: ["**/*.config.js", "**/dist/**/*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
]);