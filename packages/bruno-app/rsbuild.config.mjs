import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginStyledComponents } from '@rsbuild/plugin-styled-components';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'

const withBundleAnalyzer = process.env.BUNDLE_ANALYZE === 'true';

export default defineConfig({
  ...(withBundleAnalyzer && {
    performance: {
      bundleAnalyze: {
        analyzerMode: 'static',
        openAnalyzer: true,
        reportFilename: 'bundle-report.html',
      },
    },
  }),
  plugins: [
    pluginNodePolyfill(),
    pluginReact(),
    pluginStyledComponents(),
    pluginSass(),
    pluginBabel({
      include: /\.(?:js|jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      }
    })
  ],
  source: {
    tsconfigPath: './jsconfig.json', // Specifies the path to the JavaScript/TypeScript configuration file,
    exclude: [
      '**/test-utils/**',
      '**/*.test.*',
      '**/*.spec.*'
    ]
  },
  html: {
    title: 'Bruno'
  },
  output: {
    // Use relative paths so chunks load correctly from file:// in Electron production builds.
    // Without this, split chunks would request /chunk.js which fails under file:// protocol.
    assetPrefix: './',
  },
  tools: {
    rspack: {
      module: {
        rules: [
          { test: /\.md$/, type: 'asset/source' },
          // react-player uses dynamic import() internally to lazy-load player
          // implementations (YouTube, Vimeo, HLS, etc.). Rspack splits those into
          // separate chunks that fail to load in Electron's file:// context even
          // with assetPrefix set. Scoping eager mode to react-player only avoids
          // the loading failure without collapsing the rest of our code splitting.
          {
            test: /node_modules\/react-player/,
            parser: {
              javascript: {
                dynamicImportMode: 'eager',
              },
            },
          },
        ]
      },
      ignoreWarnings: [
        (warning) =>  warning.message.includes('Critical dependency: the request of a dependency is an expression') && warning?.moduleDescriptor?.name?.includes('flow-parser')
      ],
      // Add externals configuration to exclude Node.js libraries
      externals: {
        // List specific Node.js modules you want to exclude
        // Format: 'module-name': 'commonjs module-name'
        'worker_threads': 'commonjs worker_threads',
        // 'path': 'commonjs path'
      }
    },
  }
});
