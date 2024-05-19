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
        file: packageJson.main,
        // dir: packageJson.main,
        format: 'cjs',
        sourcemap: true
        // preserveModules: true
      },
      {
        file: packageJson.module,
        // dir: packageJson.module,
        format: 'esm',
        sourcemap: true
        // preserveModules: true
      }
    ],
    plugins: [
      peerDepsExternal(),
      nodeResolve({
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
