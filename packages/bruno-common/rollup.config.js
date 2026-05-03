const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const dts = require('rollup-plugin-dts');
const terser = require('@rollup/plugin-terser').default;
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');

function createBuildConfig({ inputDir, input, cjsOutput, esmOutput, dtsOutput, external = [] }) {
  return [
    {
      input,
      external,
      output: [
        {
          file: cjsOutput,
          format: 'cjs',
          sourcemap: true
        },
        {
          file: esmOutput,
          format: 'esm',
          sourcemap: true
        }
      ],
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
    },
    {
      input,
      external,
      output: { file: dtsOutput, format: 'es' },
      plugins: [dts.default({ tsconfig: './tsconfig.json' })]
    }
  ];
}

module.exports = [
  // Main package build
  ...createBuildConfig({
    inputDir: 'src/**/*',
    input: 'src/index.ts',
    cjsOutput: packageJson.main,
    esmOutput: packageJson.module,
    dtsOutput: packageJson.types
  }),
  // reports/html
  ...createBuildConfig({
    inputDir: 'src/runner/**/*',
    input: 'src/runner/index.ts',
    cjsOutput: 'dist/runner/cjs/index.js',
    esmOutput: 'dist/runner/esm/index.js',
    dtsOutput: 'dist/runner/index.d.ts'
  }),
  ...createBuildConfig({
    inputDir: 'src/utils/**/*',
    input: 'src/utils/index.ts',
    cjsOutput: 'dist/utils/cjs/index.js',
    esmOutput: 'dist/utils/esm/index.js',
    dtsOutput: 'dist/utils/index.d.ts'
  }),
];
