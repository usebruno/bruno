const path = require('path');
const fs = require('fs');
const { marshallToVm } = require('../utils');

const OUTSIDE_COLLECTION_ERROR = 'Access to files outside of the collectionPath is not allowed.';
const moduleNotFoundError = (filename) => `Cannot find module ${filename}`;

const addLocalModuleLoaderShimToContext = (vm, collectionPath) => {
  let loadLocalModuleHandle = vm.newFunction('loadLocalModule', function (module) {
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

    let code = fs.readFileSync(filePath).toString();

    return marshallToVm(code, vm);
  });

  vm.setProp(vm.global, '__brunoLoadLocalModule', loadLocalModuleHandle);
  loadLocalModuleHandle.dispose();
};

module.exports = {
  addLocalModuleLoaderShimToContext,
  OUTSIDE_COLLECTION_ERROR,
  moduleNotFoundError
};
