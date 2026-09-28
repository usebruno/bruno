const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

const WSDL_MAX_SCHEMA_FILE_SIZE = 10 * 1024 * 1024;
const WSDL_SCHEMA_EXTENSIONS = ['.xsd', '.wsdl'];

const resolveWsdlSchemaRef = async (baseUri, ref) => {
  if (typeof baseUri !== 'string' || !baseUri.length) {
    throw new Error('Invalid base URI for schema resolution');
  }
  if (typeof ref !== 'string' || !ref.length) {
    throw new Error('Invalid schema reference');
  }

  const base = path.isAbsolute(baseUri) ? pathToFileURL(baseUri) : new URL(baseUri);
  const target = new URL(ref, base);

  if (target.protocol !== 'file:') {
    throw new Error(`remote schema references are not supported (${ref})`);
  }

  if (target.host !== base.host) {
    throw new Error(`schema references must stay on the importing document's host (${ref})`);
  }

  const targetPath = fileURLToPath(target);

  if (!WSDL_SCHEMA_EXTENSIONS.includes(path.extname(targetPath).toLowerCase())) {
    throw new Error(`schema references must point at a ${WSDL_SCHEMA_EXTENSIONS.join('/')} file (${ref})`);
  }

  const stats = await fs.promises.stat(targetPath);
  if (!stats.isFile()) {
    throw new Error(`schema reference is not a file: ${targetPath}`);
  }
  if (stats.size > WSDL_MAX_SCHEMA_FILE_SIZE) {
    throw new Error(`schema file exceeds the ${WSDL_MAX_SCHEMA_FILE_SIZE / (1024 * 1024)}MB limit: ${targetPath}`);
  }

  const text = await fs.promises.readFile(targetPath, 'utf8');
  return { text, uri: target.href };
};

const registerWsdlIpc = () => {
  ipcMain.handle('renderer:resolve-wsdl-schema-ref', (event, baseUri, ref) => resolveWsdlSchemaRef(baseUri, ref));
};

module.exports = { registerWsdlIpc, resolveWsdlSchemaRef };
