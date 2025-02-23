const path = require('path');
const fs = require('fs');
const { marshallToVm } = require('../utils');

const addLocalModuleLoaderShimToContext = (vm, collectionPath) => {
  let loadLocalModuleHandle = vm.newFunction('loadLocalModule', function (module) {
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

    let code = fs.readFileSync(filePath).toString();

    return marshallToVm(code, vm);
  });

  vm.setProp(vm.global, '__brunoLoadLocalModule', loadLocalModuleHandle);
  loadLocalModuleHandle.dispose();
};

module.exports = addLocalModuleLoaderShimToContext;
