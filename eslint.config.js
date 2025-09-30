// eslint.config.js
const { defineConfig } = require("eslint/config");
const globals = require("globals");
const { fixupPluginRules } = require('@eslint/compat');
const eslintPluginDiff = require('eslint-plugin-diff');

let stylistic;

const runESMImports = async () => {
  stylistic = await import('@stylistic/eslint-plugin').then(d => d.default);
};

module.exports = runESMImports().then(() => defineConfig([
  {
    plugins: {
      'diff': fixupPluginRules(eslintPluginDiff),
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    files: [
      './eslint.config.js',
      'tests/**/*.{ts,js}',
      'packages/bruno-app/**/*.{js,jsx,ts}',
      'packages/bruno-app/src/test-utils/mocks/codemirror.js',
      'packages/bruno-cli/**/*.js',
      'packages/bruno-common/**/*.ts',
      'packages/bruno-converters/**/*.js',
      'packages/bruno-electron/**/*.js',
      'packages/bruno-filestore/**/*.ts',
      'packages/bruno-js/**/*.js',
      'packages/bruno-lang/**/*.js',
      'packages/bruno-requests/**/*.ts',
      'packages/bruno-requests/**/*.js',
    ],
    processor: 'diff/diff',
    rules: {
      ...stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: true,
      }).rules,
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/curly-newline': ['error', {
        multiline: true,
        minElements: 2,
        consistent: true,
      }],
      '@stylistic/function-paren-newline': ['error', 'never'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/multiline-ternary': ['off'],
      '@stylistic/padding-line-between-statements': ['off'],
      '@stylistic/jsx-one-expression-per-line': ['off'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/max-len': ['off'],
    },
  },
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
]));
