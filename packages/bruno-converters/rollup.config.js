const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');
const alias = require('@rollup/plugin-alias');
const path = require('path');

module.exports = [
  {
    input: 'src/index.js',
    output: [
      {
        dir: path.dirname(packageJson.main),
        format: 'cjs',
        sourcemap: true
      },
      {
        dir: path.dirname(packageJson.module),
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        preferBuiltins: true,
        extensions: ['.js', '.css'] // Resolve .js files
      }),
      commonjs(),
      terser(),
      alias({
        entries: [{ find: 'src', replacement: path.resolve(__dirname, 'src') }]
      })
    ]
  }
];
