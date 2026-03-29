const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');
const postcss = require('rollup-plugin-postcss');
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
        sourcemap: true
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      postcss({
        minimize: true,
        extensions: ['.css'],
        extract: true
      }),
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.css']
      }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser()
    ],
    external: ['react', 'react-dom', 'index.css']
  },
  {
    input: 'dist/esm/index.d.ts',
    external: [/\.css$/],
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts.default()]
  }
];
