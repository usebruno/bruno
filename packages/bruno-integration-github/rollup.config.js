const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');
const { terser } = require('rollup-plugin-terser');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');

function createBuildConfig({ inputDir, input, cjsOutput, esmOutput }) {
  return [
    {
      input,
      output: [
        cjsOutput && {
          file: cjsOutput,
          format: 'cjs',
          sourcemap: true
        },
        esmOutput && {
          file: esmOutput,
          format: 'esm',
          sourcemap: true
        }
      ].filter(Boolean),
      plugins: [
        peerDepsExternal(),
        nodeResolve(),
        commonjs(),
        typescript({
          tsconfig: './tsconfig.json',
          include: [inputDir]
        }),
        terser()
      ],
      treeshake: {
        moduleSideEffects: false
      }
    }
  ];
}

// todo: configure declarations
module.exports = [
  // Main package build
  ...createBuildConfig({
    inputDir: 'src/**/*',
    input: 'src/index.js',
    cjsOutput: 'dist/index.js'
  }),
  // ipc build
  ...createBuildConfig({
    inputDir: 'src/ipc/**/*',
    input: 'src/ipc/index.js',
    cjsOutput: 'dist/ipc/cjs/index.js'
  })
];
