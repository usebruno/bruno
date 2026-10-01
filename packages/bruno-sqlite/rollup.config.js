const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser').default;
const dts = require('rollup-plugin-dts').default;
const os = require('os');

const nodeExternal = ['node:sqlite', 'node:crypto', 'crypto', 'fs', 'path'];

const jsPlugins = [
  nodeResolve({ extensions: ['.js', '.ts', '.json'] }),
  json(),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  }),
  terser({
    maxWorkers: Math.max(1, os.availableParallelism())
  })
];

const jsOutputs = (target) => [
  { file: `dist/${target}/cjs/index.js`, format: 'cjs', sourcemap: true, exports: 'named' },
  { file: `dist/${target}/esm/index.js`, format: 'esm', sourcemap: true, exports: 'named' }
];

module.exports = [
  {
    input: 'src/node/index.ts',
    output: jsOutputs('node'),
    plugins: jsPlugins,
    external: nodeExternal
  },
  {
    input: 'src/node/index.ts',
    output: { file: 'dist/node/index.d.ts', format: 'es' },
    plugins: [dts()],
    external: nodeExternal
  }
];
