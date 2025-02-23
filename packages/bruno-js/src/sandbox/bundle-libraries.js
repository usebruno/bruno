const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const fs = require('fs');
const { terser } = require('rollup-plugin-terser');

const bundleLibraries = async () => {
  const codeScript = `
    import { expect, assert } from 'chai';
    import { Buffer } from "buffer";
    import moment from "moment";
    import btoa from "btoa";
    import atob from "atob";
    import * as CryptoJS from "@usebruno/crypto-js";
    globalThis.expect = expect;
    globalThis.assert = assert;
    globalThis.moment = moment;
    globalThis.btoa = btoa;
    globalThis.atob = atob;
    globalThis.Buffer = Buffer;
    globalThis.CryptoJS = CryptoJS;
    globalThis.requireObject = {
      ...(globalThis.requireObject || {}),
      'chai': { expect, assert },
      'moment': moment,
      'buffer': { Buffer },
      'btoa': btoa,
      'atob': atob,
      'crypto-js': CryptoJS
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
        nodeResolve({
          preferBuiltins: false,
          browser: false
        }),
        commonjs(),
        terser()
      ]
    },
    output: {
      file: './src/sandbox/bundle-browser-rollup.js',
      format: 'iife',
      name: 'MyBundle'
    }
  };

  try {
    const bundle = await rollup.rollup(config.input);
    const { output } = await bundle.generate(config.output);
    fs.writeFileSync(
      './src/sandbox/bundle-browser-rollup.js',
      `
      const getBundledCode = () => {
        return function(){
          ${output?.map((o) => o.code).join('\n')}
        }()
      }
      module.exports = getBundledCode;
    `
    );
  } catch (error) {
    console.error('Error while bundling:', error);
  }
};

bundleLibraries();

module.exports = bundleLibraries;
