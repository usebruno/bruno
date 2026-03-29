const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');

const externalDeps = [
  '@usebruno/lang',
  '@usebruno/schema-types',
  /@usebruno\/schema-types\/.*/,
  '@opencollection/types',
  /@opencollection\/types\/.*/,
  // Runtime dependencies
  'lodash',
  'yaml',
  'ajv',
  // Node built-ins
  'worker_threads',
  'path',
  'fs'
];

const commonPlugins = [
  peerDepsExternal(),
  nodeResolve({
    extensions: ['.js', '.ts', '.tsx', '.json']
  }),
  json(),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  }),
  terser()
];

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: commonPlugins,
    external: externalDeps
  },
  {
    input: 'src/workers/worker-script.ts',
    output: [
      {
        file: 'dist/cjs/workers/worker-script.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/esm/workers/worker-script.js',
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins: commonPlugins,
    external: externalDeps
  }
];
