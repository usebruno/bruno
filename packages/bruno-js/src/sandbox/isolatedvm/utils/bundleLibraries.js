const rollup = require('rollup');
const json = require('@rollup/plugin-json');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs').default;
const nodePolyfills = require('rollup-plugin-polyfill-node');
const builtins = require('rollup-plugin-node-builtins');
const globals = require('rollup-plugin-node-globals');
const fs = require('fs');

const bundleLibraries = async () => {
  const codeScript = `
  import isNumber from "is-number";
  import { expect, assert } from "chai";

  global.require = (module) => {
    if (module === 'is-number') {
      return isNumber;
    }
    if (module === 'chai') {
      return { expect, assert };
    }
  }
`;

  const config = {
    input: {
      input: 'inline-code',
      plugins: [
        {
          name: 'inline-code-plugin',
          resolveId(id) {
            if (id === 'inline-code') {
              return id;
            }
            return null;
          },
          load(id) {
            if (id === 'inline-code') {
              return codeScript;
            }
            return null;
          }
        },
        nodePolyfills(),
        resolve({
          preferBuiltins: false,
          browser: true
        }),
        json(),
        commonjs(),
        globals(),
        builtins()
      ]
    },
    output: {
      format: 'iife',
      name: 'MyBundle'
    }
  };

  try {
    const bundle = await rollup.rollup(config.input);
    const { output } = await bundle.generate(config.output);
    // fs.writeFileSync('bundle.js', output?.map((o) => o.code).join('\n'));
    return output?.map((o) => o.code).join('\n');
  } catch (error) {
    console.error('Error while bundling:', error);
  }
};

module.exports = bundleLibraries;
