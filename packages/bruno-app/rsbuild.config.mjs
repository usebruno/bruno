import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginStyledComponents } from '@rsbuild/plugin-styled-components';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginNodePolyfill } from '@rsbuild/plugin-node-polyfill'

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
    })
  ],
  source: {
    tsconfigPath: './jsconfig.json', // Specifies the path to the JavaScript/TypeScript configuration file
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
        },
      },
      ignoreWarnings: [
        (warning) =>  warning.message.includes('Critical dependency: the request of a dependency is an expression') && warning?.moduleDescriptor?.name?.includes('flow-parser')
      ]
    },
  }
});
