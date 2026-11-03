// eslint.config.js
const { defineConfig } = require('eslint/config');
const globals = require('globals');
const { fixupPluginRules } = require('@eslint/compat');
const eslintPluginDiff = require('eslint-plugin-diff');

let stylistic;

const runESMImports = async () => {
  stylistic = await import('@stylistic/eslint-plugin').then((d) => d.default);
};

const isFixMode = process.argv.some((arg) => arg === '--fix' || arg === '--fix-dry-run');

const mainLintFiles = [
  './eslint.config.js',
  'e2e/**/*.{ts,js}',
  'packages/bruno-app/**/*.{js,jsx,ts}',
  'packages/bruno-app/plugins/**/*.{js,cjs,mjs}',
  'packages/bruno-app/src/test-utils/mocks/codemirror.js',
  'packages/bruno-cli/**/*.js',
  'packages/bruno-common/**/*.ts',
  'packages/bruno-converters/**/*.js',
  'packages/bruno-electron/**/*.js',
  'packages/bruno-filestore/**/*.ts',
  'packages/bruno-io/**/*.ts',
  'packages/bruno-schema-types/**/*.ts',
  'packages/bruno-js/**/*.js',
  'packages/bruno-lang/**/*.js',
  'packages/bruno-requests/**/*.ts',
  'packages/bruno-requests/**/*.js',
  'packages/bruno-tests/**/*.{js,ts}',
  'packages/bruno-sqlite/**/*.{js,ts}'
];

module.exports = runESMImports().then(() => defineConfig([
  // Global ignores - must be a standalone object with ONLY ignores
  {
    ignores: [
      '**/node_modules/**/*',
      '**/dist/**/*',
      '**/*.bru',
      'packages/bruno-js/src/sandbox/bundle-browser-rollup.js',
      'packages/bruno-app/public/static/**/*',
      'packages/bruno-app/.next/**/*',
      'packages/bruno-electron/web/**/*'
    ]
  },
  {
    plugins: {
      'diff': fixupPluginRules(eslintPluginDiff),
      '@stylistic': stylistic
    },
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    files: mainLintFiles,
    rules: {
      ...stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: true
      }).rules,
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/curly-newline': ['error', {
        multiline: true,
        minElements: 2,
        consistent: true
      }],
      '@stylistic/function-paren-newline': ['off'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/multiline-ternary': ['off'],
      '@stylistic/padding-line-between-statements': ['off'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/max-len': ['off'],
      '@stylistic/jsx-one-expression-per-line': ['off'],
      '@stylistic/max-statements-per-line': ['off'],
      '@stylistic/no-mixed-operators': ['off'],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-debugger': 'warn',
      'eqeqeq': isFixMode ? 'off' : ['warn', 'always'],
      'prefer-const': isFixMode ? 'off' : 'warn',
      'no-var': 'warn',
      'no-unreachable': 'warn',
      'no-duplicate-imports': 'warn',
      'no-self-compare': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-use-before-define': ['warn', { functions: false }]
    }
  },
  {
    // E2E specs use aliases from e2e/tsconfig.json instead of relative imports.
    files: ['e2e/tests/**/*.{ts,js}'],
    ignores: ['**/test-data/**', '**/init-user-data/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^(\\.\\./)+(playwright|pages|support|data|constants|servers)(/.*)?$',
            message: 'Import shared E2E code through its alias: @e2e/test, @e2e/pages, @e2e/support, @e2e/data, @e2e/constants or @e2e/servers.'
          },
          {
            regex: '^@e2e/(pages|support|data|constants|servers)/.+',
            message: 'Import from the barrel (for example @e2e/pages), not from a file inside it.'
          }
        ]
      }]
    }
  },
  {
    // Use relative imports in shared E2E code. Aliases are for specs only
    // to avoid circular dependencies through the @e2e/pages barrel.
    // Page objects also never import index.ts or locators.ts (both import every page object).
    files: ['e2e/pages/**/*.{ts,js}'],
    ignores: ['e2e/pages/index.ts'], // the barrel re-exports every page object, including locators.ts
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^@e2e/',
            message: 'Shared E2E code imports by relative path. @e2e/* aliases are for specs in e2e/tests/ only.'
          },
          {
            regex: '^(\\.\\.?/)+(index|locators)$|^\\.\\.?/?$|^(\\.\\./)+\\.\\.$',
            message: 'Page objects import the specific file they need, never index.ts or locators.ts (that creates a circular import).'
          }
        ]
      }]
    }
  },
  {
    // Lower layers never import page objects: page objects already depend on them.
    files: ['e2e/{playwright,support,data,constants,servers}/**/*.{ts,js}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^@e2e/',
            message: 'Shared E2E code imports by relative path. @e2e/* aliases are for specs in e2e/tests/ only.'
          },
          {
            regex: '^(\\.\\./)+pages(/.*)?$',
            message: 'Shared infrastructure must not import page objects (pages depend on it, so this creates a circular import).'
          }
        ]
      }]
    }
  },
  {
    files: ['packages/bruno-app/**/*.{js,jsx,ts}'],
    ignores: ['**/*.config.js', '**/public/**/*', '**/plugins/**/*'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        global: false,
        require: false,
        Buffer: false,
        process: false,
        ipcRenderer: false,
        __BRUNO_BENCHMARK__: false
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    // Rsbuild/rspack plugins are Node build tooling (CommonJS + ESM), not browser UI.
    files: ['packages/bruno-app/plugins/**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-app/**/*.{js,jsx,ts}'],
    ignores: ['**/*.config.js', '**/public/**/*', '**/plugins/**/*'],
    plugins: { 'react-hooks': require('eslint-plugin-react-hooks') },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    // It prevents lint errors when using CommonJS exports (module.exports) in Jest mocks.
    files: ['packages/bruno-app/src/test-utils/mocks/codemirror.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    // Storybook config files use CommonJS with __dirname and module.exports
    files: ['packages/bruno-app/storybook/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-cli/**/*.js'],
    ignores: ['**/*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        ecmaVersion: 'latest'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-common/**/*.ts'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './packages/bruno-common/tsconfig.json'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-converters/**/*.js'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-case-declarations': 'error'
    }
  },
  {
    files: ['packages/bruno-electron/**/*.js'],
    ignores: ['**/*.config.js', '**/web/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-filestore/**/*.ts'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './packages/bruno-filestore/tsconfig.json'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-io/**/*.ts'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './packages/bruno-io/tsconfig.json'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-js/**/*.js'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
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
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-lang/**/*.js'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-requests/**/*.ts'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './packages/bruno-requests/tsconfig.json'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  },
  {
    files: ['packages/bruno-requests/**/*.js'],
    ignores: ['**/*.config.js', '**/dist/**/*'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  }
]));
