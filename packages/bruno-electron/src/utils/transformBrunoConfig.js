const path = require('path');
const { isFile, isDirectory, detectCollectionLayout } = require('./filesystem');
const { transformProxyConfig } = require('@usebruno/requests');

function transformBrunoConfigBeforeSave(brunoConfig) {
  // `format` is detected from disk on every read (see transformBrunoConfigAfterRead) and is not
  // part of the on-disk contract — writing it back would persist a derived value.
  if (brunoConfig) {
    delete brunoConfig.format;
  }

  if (brunoConfig && !brunoConfig.opencollection) {
    const userVersion = brunoConfig.version;
    brunoConfig.version = '1'; // bru schema marker
    if (userVersion) {
      brunoConfig.collectionVersion = userVersion;
    } else {
      delete brunoConfig.collectionVersion;
    }
  }

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

  // Clean up proxy config before saving
  if (brunoConfig.proxy) {
    // Remove disabled: false (optional field)
    if (brunoConfig.proxy.disabled === false) {
      delete brunoConfig.proxy.disabled;
    }
    // Remove auth.disabled: false (optional field)
    if (brunoConfig.proxy.config?.auth?.disabled === false) {
      delete brunoConfig.proxy.config.auth.disabled;
    }
  }

  return brunoConfig;
}

async function transformBrunoConfigAfterRead(brunoConfig, collectionPathname) {
  // Stamp the on-disk layout so the renderer knows which extension this collection uses.
  // `opencollection` alone can't tell `.yml` from `.yaml`, and the renderer builds filenames
  // for new requests/folders from this — deriving it there would write the wrong extension.
  const layout = detectCollectionLayout(collectionPathname);
  if (brunoConfig && layout) {
    brunoConfig.format = layout;
  }

  if (brunoConfig && !brunoConfig.opencollection) {
    if (brunoConfig.collectionVersion) {
      brunoConfig.version = brunoConfig.collectionVersion;
    } else {
      delete brunoConfig.version;
    }
    delete brunoConfig.collectionVersion;
  }

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

  // Migrate proxy configuration from old format to new format
  if (brunoConfig.proxy) {
    brunoConfig.proxy = transformProxyConfig(brunoConfig.proxy);
  }

  return brunoConfig;
}

module.exports = {
  transformBrunoConfigBeforeSave,
  transformBrunoConfigAfterRead
};
