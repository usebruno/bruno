const rollup = require('rollup');
const resolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const path = require('path');
const fs = require('fs');

const bundleLibraries = async (libraries) => {
  try {
    const availableModules = Object.keys(libraries)
      .map((module) => {
        if (require.resolve(module)) {
          return module;
        }
        return null;
      })
      .filter((module) => module);
    const entryContent = availableModules.map((lib) => `require('${lib}');`).join('\n');

    const entryPath = path.resolve(__dirname, 'entry.js');
    fs.writeFileSync(entryPath, entryContent);

    const inputOptions = {
      input: entryPath,
      plugins: [
        resolve({
          preferBuiltins: false
        }),
        commonjs(),
        json()
      ]
    };

    const bundle = await rollup.rollup(inputOptions);

    const { output } = await bundle.generate({
      format: 'cjs',
      name: 'externalModules'
    });

    return output[0].code;
  } catch (error) {
    throw error;
  } finally {
    try {
      await fs.unlink(entryPath);
    } catch (unlinkError) {
      if (unlinkError.code !== 'ENOENT') {
        console.error('Error deleting temporary entry file:', unlinkError);
      }
    }
  }
};

module.exports = bundleLibraries;
