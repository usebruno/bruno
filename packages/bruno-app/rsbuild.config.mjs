import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginStyledComponents } from '@rsbuild/plugin-styled-components';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill';
import { pluginRemoteImages } from './plugins/remote-images/index.mjs';

const remoteImageDomains = (process.env.BRUNO_REMOTE_IMAGE_DOMAINS || '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

export default defineConfig({
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
    }),
    pluginRemoteImages({
      domains: remoteImageDomains,
      include: [/\.md$/]
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
  tools: {
    rspack: {
      module: {
        parser: {
          javascript: {
            // This loads the JavaScript contents from a library along with the main JavaScript bundle.
            dynamicImportMode: "eager",
          },
        }
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
