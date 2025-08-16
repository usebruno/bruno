const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');

const packageJson = require('./package.json');

function createBuildConfig({ inputDir, input, cjsOutput, esmOutput }) {
  return [
    {
      input,
      output: [
        { file: cjsOutput, format: 'cjs', sourcemap: true },
        { file: esmOutput, format: 'esm', sourcemap: true }
      ],
      plugins: [
        peerDepsExternal(),
        nodeResolve({ preferBuiltins: true }),
        commonjs(),
        typescript({
          tsconfig: './tsconfig.json',
          include: [inputDir]
        })
        // terser intentionally disabled during debugging
      ],
      treeshake: false
    }
  ];
}

module.exports = [
  ...createBuildConfig({
    inputDir: 'src/**/*',
    input: 'src/index.ts',
    cjsOutput: packageJson.main,
    esmOutput: packageJson.module
  }),
  ...createBuildConfig({
    inputDir: 'src/runner/**/*',
    input: 'src/runner/index.ts',
    cjsOutput: 'dist/runner/cjs/index.js',
    esmOutput: 'dist/runner/esm/index.js'
  }),
  ...createBuildConfig({
    inputDir: 'src/utils/**/*',
    input: 'src/utils/index.ts',
    cjsOutput: 'dist/utils/cjs/index.js',
    esmOutput: 'dist/utils/esm/index.js'
  })
];

// todo: configure declarations
module.exports = createBuildConfig({
  input: 'src/index.ts',
  cjsOutput: packageJson.main,
  esmOutput: packageJson.module
});
