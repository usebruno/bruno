const path = require('path');
const fs = require('fs');
const { marshallToVm } = require('../utils');
const { isPathWithinRoot } = require('../../../utils/path-security');
const { isTypeScriptFile, transpileTypeScript } = require('../../../utils/typescript');
const { resolveModuleFile, resolveDirectoryIndex } = require('../../../utils/module-resolution');

const addLocalModuleLoaderShimToContext = (vm, collectionPath) => {
  const loadLocalModuleHandle = vm.newFunction('loadLocalModule', function (module) {
    const filename = vm.dump(module);

    // Ensure the requested path is inside the collectionPath before probing
    // the filesystem for extension candidates
    const basePath = path.resolve(collectionPath, filename);
    if (!isPathWithinRoot(collectionPath, basePath)) {
      throw new Error('Access to files outside of the collectionPath is not allowed.');
    }

    // The safe sandbox does not honor package.json main — directory imports
    // resolve only through index files. Falls back to the raw path so the
    // not-found error below names it
    const filePath = resolveModuleFile(basePath) || resolveDirectoryIndex(basePath) || basePath;

    // Re-check after resolution: extension fallbacks must not escape either
    if (!isPathWithinRoot(collectionPath, filePath)) {
      throw new Error('Access to files outside of the collectionPath is not allowed.');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw new Error(`Cannot find module ${filename}`);
    }

    let code = fs.readFileSync(filePath, 'utf8');
    if (isTypeScriptFile(filePath)) {
      code = transpileTypeScript(code, filePath);
    }

    return marshallToVm({ code, resolvedPath: filePath }, vm);
  });

  vm.setProp(vm.global, '__brunoLoadLocalModule', loadLocalModuleHandle);
  loadLocalModuleHandle.dispose();
};

module.exports = addLocalModuleLoaderShimToContext;
