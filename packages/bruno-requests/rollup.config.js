const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const dts = require('rollup-plugin-dts');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');
const { builtinModules } = require('module');

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
    external: (id) => {
      const isExternal = id === 'electron' || builtinModules.includes(id) || id.startsWith('node:');
      if (isExternal) console.log('[external]', id);
      return isExternal;
    },
    plugins: [
      peerDepsExternal(),
      nodeResolve({
        extensions: ['.js', '.ts', '.tsx', '.json', '.css']
      }),
      commonjs(),
      json(),
      typescript({ tsconfig: './tsconfig.json', sourceMap: true,  }),
      // terser() //minify only in production
    ]
  }
];
