const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser').default;
const peerDepsExternal = require('rollup-plugin-peer-deps-external');
const { isBuiltin } = require('module');
const os = require('os');
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
        extensions: ['.js', '.ts', '.tsx', '.json']
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false
      }),
      terser({
        maxWorkers: Math.max(1, os.availableParallelism())
      })
    ],
    external: (id) => isBuiltin(id) || id.startsWith('@usebruno/')
  }
];
