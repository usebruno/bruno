const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

const external = [
  '@usebruno/filestore',
  /@usebruno\/filestore\/.*/,
  'workerpool',
  'node:worker_threads',
  'node:path',
  'node:fs',
  'node:crypto',
  'node:os',
  'node:module',
  'worker_threads',
  'path',
  'fs',
  'crypto',
  'os',
  'module'
];

const plugins = [
  nodeResolve({ extensions: ['.js', '.ts', '.json'] }),
  commonjs(),
  typescript({ tsconfig: './tsconfig.json', declaration: false, declarationMap: false })
];

module.exports = {
  input: {
    index: 'src/index.ts',
    worker: 'src/worker.ts'
  },
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: '[name].js',
    chunkFileNames: 'shared/[name].js',
    sourcemap: true,
    exports: 'named'
  },
  plugins,
  external
};
