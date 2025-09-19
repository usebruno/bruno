const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');

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
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.json', '.css']
      }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
    external: ['@usebruno/lang', 'lodash', 'worker_threads', 'path']
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
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.json', '.css']
      }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
    external: ['@usebruno/lang', 'lodash', 'worker_threads', 'path']
  }
]; 