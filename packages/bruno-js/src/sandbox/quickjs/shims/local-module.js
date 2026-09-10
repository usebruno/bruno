const path = require('path');
const fs = require('fs');
const { marshallToVm } = require('../utils');

const OUTSIDE_COLLECTION_ERROR = 'Access to files outside of the collectionPath is not allowed.';
const moduleNotFoundError = (filename) => `Cannot find module ${filename}`;

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

    let realCollectionPath;
    let filePath;

    try {
      // Resolve real paths on both sides so the boundary check sees the file that will actually be read
      realCollectionPath = fs.realpathSync(collectionPath);
      filePath = fs.realpathSync(path.resolve(realCollectionPath, resolvedFilename));
    } catch (error) {
      throw new Error(moduleNotFoundError(filename));
    }

    const relativePath = path.relative(realCollectionPath, filePath);

    // Ensure the resolved file path is inside the collectionPath
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(OUTSIDE_COLLECTION_ERROR);
    }

    const code = fs.readFileSync(filePath).toString();

    return marshallToVm(code, vm);
  });
};

module.exports = {
  createLocalModuleLoaderHandle,
  OUTSIDE_COLLECTION_ERROR,
  moduleNotFoundError
};
