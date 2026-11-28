const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');
const { canonicalPath, exists } = require('../utils/filesystem');

const WSDL_MAX_SCHEMA_FILE_SIZE = 10 * 1024 * 1024;
const WSDL_SCHEMA_EXTENSIONS = ['.xsd', '.wsdl'];
const WSDL_LOCAL_COPY_PROTOCOLS = ['http:', 'https:'];

// WSDL bundles often reference schemas by their published http(s) URL and ship local copies
// alongside. Only the last path segment is used, so the copy always sits next to the base document
// and remote schemas sharing a file name resolve to the same copy. win32.basename strips both
// separator styles, so an encoded backslash resolves the same way on every platform.
const getLocalSchemaCopyPath = (base, target) => {
  const fileName = path.win32.basename(decodeURIComponent(path.posix.basename(target.pathname)));
  return path.join(path.dirname(fileURLToPath(base)), fileName);
};

// Mirrored by resolveLocalWsdlSchemaRef in bruno-cli/src/commands/import.js
const resolveWsdlSchemaRef = async (baseUri, ref) => {
  if (typeof baseUri !== 'string' || !baseUri.length) {
    throw new Error('Invalid base URI for schema resolution');
  }
  if (typeof ref !== 'string' || !ref.length) {
    throw new Error('Invalid schema reference');
  }

  const base = path.isAbsolute(baseUri) ? pathToFileURL(baseUri) : new URL(baseUri);
  const target = new URL(ref, base);

  const isLocalCopy = WSDL_LOCAL_COPY_PROTOCOLS.includes(target.protocol);
  let targetPath;
  if (isLocalCopy) {
    targetPath = getLocalSchemaCopyPath(base, target);
  } else if (target.protocol === 'file:') {
    if (target.host !== base.host) {
      throw new Error(`schema references must stay on the importing document's host (${ref})`);
    }
    targetPath = fileURLToPath(target);
  } else {
    throw new Error(`remote schema references are not supported (${ref})`);
  }

  // Checked before touching the filesystem, so only schema files can be probed for existence
  if (!WSDL_SCHEMA_EXTENSIONS.includes(path.extname(targetPath).toLowerCase())) {
    throw new Error(`schema references must point at a ${WSDL_SCHEMA_EXTENSIONS.join('/')} file (${ref})`);
  }

  if (isLocalCopy && !(await exists(targetPath))) {
    throw new Error(`remote schema references are not supported and no local copy was found at ${targetPath} (${ref})`);
  }

  const stats = await fs.promises.stat(targetPath);
  if (!stats.isFile()) {
    throw new Error(`schema reference is not a file: ${targetPath}`);
  }
  if (stats.size > WSDL_MAX_SCHEMA_FILE_SIZE) {
    throw new Error(`schema file exceeds the ${WSDL_MAX_SCHEMA_FILE_SIZE / (1024 * 1024)}MB limit: ${targetPath}`);
  }

  const text = await fs.promises.readFile(targetPath, 'utf8');
  return { text, uri: pathToFileURL(targetPath).href, key: pathToFileURL(canonicalPath(targetPath)).href };
};

const registerWsdlIpc = () => {
  ipcMain.handle('renderer:resolve-wsdl-schema-ref', (event, baseUri, ref) => resolveWsdlSchemaRef(baseUri, ref));
};

module.exports = { registerWsdlIpc, resolveWsdlSchemaRef };
