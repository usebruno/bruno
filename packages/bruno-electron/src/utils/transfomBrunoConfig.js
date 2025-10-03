const path = require('path');
const { isFile, isDirectory } = require('./filesystem');

function transformBrunoConfigBeforeSave(brunoConfig) {
  // remove exists from importPaths and protoFiles
  if (brunoConfig.protobuf?.importPaths) {
    brunoConfig.protobuf.importPaths = brunoConfig.protobuf.importPaths.map((importPath) => {
      delete importPath.exists;
      return importPath;
    });
  }
  if (brunoConfig.protobuf?.protoFiles) {
    brunoConfig.protobuf.protoFiles = brunoConfig.protobuf.protoFiles.map((protoFile) => {
      delete protoFile.exists;
      return protoFile;
    });
  }

  return brunoConfig;
}

async function transformBrunoConfigAfterRead(brunoConfig, collectionPathname) {
  // add exists to importPaths and protoFiles by checking actual file/directory existence
  if (brunoConfig.protobuf?.importPaths) {
    brunoConfig.protobuf.importPaths = await Promise.all(brunoConfig.protobuf.importPaths.map(async (importPath) => {
      try {
        // Resolve the relative path against the collection pathname
        const absolutePath = path.resolve(collectionPathname, importPath.path);
        // Check if it's a directory
        const exists = isDirectory(absolutePath);
        return {
          ...importPath,
          exists
        };
      } catch (error) {
        return {
          ...importPath,
          exists: false
        };
      }
    }));
  }

  if (brunoConfig.protobuf?.protoFiles) {
    brunoConfig.protobuf.protoFiles = await Promise.all(brunoConfig.protobuf.protoFiles.map(async (protoFile) => {
      try {
        // Resolve the relative path against the collection pathname
        const absolutePath = path.resolve(collectionPathname, protoFile.path);
        // Check if it's a file
        const exists = isFile(absolutePath);
        return {
          ...protoFile,
          exists
        };
      } catch (error) {
        return {
          ...protoFile,
          exists: false
        };
      }
    }));
  }

  return brunoConfig;
}

module.exports = {
  transformBrunoConfigBeforeSave,
  transformBrunoConfigAfterRead
};
