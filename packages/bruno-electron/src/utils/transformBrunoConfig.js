const path = require('path');
const { isFile, isDirectory } = require('./filesystem');
const { get } = require('lodash');

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
    const proxy = brunoConfig.proxy;

    // Check if this is an old format (has 'enabled' property)
    if ('enabled' in proxy) {
      const enabled = proxy.enabled;

      let newProxy = {
        inherit: true,
        config: {
          protocol: proxy.protocol || 'http',
          hostname: proxy.hostname || '',
          port: proxy.port || null,
          auth: {
            username: get(proxy, 'auth.username', ''),
            password: get(proxy, 'auth.password', '')
          },
          bypassProxy: proxy.bypassProxy || ''
        }
      };

      // Handle old format: enabled (true | false | 'global')
      if (enabled === true) {
        newProxy.disabled = false;
        newProxy.inherit = false;
      } else if (enabled === false) {
        newProxy.disabled = true;
        newProxy.inherit = false;
      } else if (enabled === 'global') {
        newProxy.disabled = false;
        newProxy.inherit = true;
      }

      // Migrate auth.enabled to auth.disabled
      if (get(proxy, 'auth.enabled') === false) {
        newProxy.config.auth.disabled = true;
      }
      // If auth.enabled is true or undefined, omit disabled (defaults to false)

      // Omit disabled: false at top level (optional field)
      if (newProxy.disabled === false) {
        delete newProxy.disabled;
      }
      // Omit auth.disabled: false (optional field)
      if (newProxy.config.auth.disabled === false) {
        delete newProxy.config.auth.disabled;
      }

      brunoConfig.proxy = newProxy;
    }
  }

  return brunoConfig;
}

module.exports = {
  transformBrunoConfigBeforeSave,
  transformBrunoConfigAfterRead
};
