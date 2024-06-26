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
  import { Buffer } from "buffer";
  import btoa from "btoa";
  import atob from "atob";
  import moment from "moment";

  global.Buffer = Buffer;
  global.btoa = btoa;
  global.atob = atob;
  global.moment = moment;

  global.requireObject = {
    'is-number': isNumber,
    'chai': { expect, assert },
    'buffer': { Buffer },
    'btoa': btoa,
    'atob': atob,
    'moment': moment
  };

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
          browser: false
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
    // fs.writeFileSync('bundle-browser.js', output?.map((o) => o.code).join('\n'));
    return output?.map((o) => o.code).join('\n');
  } catch (error) {
    console.error('Error while bundling:', error);
  }
};

module.exports = bundleLibraries;
