const path = require('path');
const fs = require('fs');
const { marshallToVm } = require('../utils');

/**
 * Creates the host function that loads a collection-local module's source.
 *
 * Returns the handle without placing it on the VM global. require closes over it
 * (see addRequireShimToContext). The caller disposes the handle after require captures it.
 *
 * @param {Object} vm - QuickJS VM context
 * @param {string} collectionPath - Root the loaded module must stay within
 * @returns {Object} The QuickJS function handle
 */
const createLocalModuleLoaderHandle = (vm, collectionPath) => {
  return vm.newFunction('loadLocalModule', function (module) {
    const filename = vm.dump(module);

    // Check if the filename has an extension
    const hasExtension = path.extname(filename) !== '';
    const resolvedFilename = hasExtension ? filename : `${filename}.js`;

    // Resolve the file path and check if it's within the collectionPath
    const filePath = path.resolve(collectionPath, resolvedFilename);
    const relativePath = path.relative(collectionPath, filePath);

    // Ensure the resolved file path is inside the collectionPath
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Access to files outside of the collectionPath is not allowed.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Cannot find module ${filename}`);
    }

    const code = fs.readFileSync(filePath).toString();

    return marshallToVm(code, vm);
  });
};

module.exports = createLocalModuleLoaderHandle;
