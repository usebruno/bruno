const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');
const { copy } = require('@web/rollup-plugin-copy');
const path = require('path');

const packageJson = require('./package.json');

const externalDeps = [
  '@usebruno/schema',
  '@usebruno/schema-types',
  /@usebruno\/schema-types\/.*/,
  '@opencollection/types',
  /@opencollection\/types\/.*/,
  // Runtime dependencies
  'lodash',
  'lodash/each',
  'lodash/get',
  'lodash/cloneDeep',
  'js-yaml',
  'jscodeshift',
  'nanoid',
  'xml2js',
  // Node built-ins
  'path',
  'fs'
];

module.exports = [
  {
    input: 'src/index.js',
    output: {
      dir: path.dirname(packageJson.main),
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      entryFileNames: 'index.js'
    },
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.json']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        outDir: path.dirname(packageJson.main)
      }),
      terser(),
      copy({
        patterns: 'src/workers/scripts/**/*',
        rootDir: '.'
      })
    ],
    external: externalDeps
  },
  {
    input: 'src/index.js',
    output: {
      dir: path.dirname(packageJson.module),
      format: 'esm',
      sourcemap: true,
      exports: 'named',
      entryFileNames: 'index.js'
    },
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.json']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        outDir: path.dirname(packageJson.module)
      }),
      terser(),
      copy({
        patterns: 'src/workers/scripts/**/*',
        rootDir: '.'
      })
    ],
    external: externalDeps
  }
];
