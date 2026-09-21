import { sanitizeName, validateName } from 'utils/common/regex';
import path, { normalizePath } from 'utils/common/path';

export const API_SPEC_SOURCE = {
  BLANK: 'blank',
  COLLECTION: 'collection',
  URL: 'url'
};

export const COLLECTION_SOURCE = {
  WORKSPACE: 'workspace',
  FILESYSTEM: 'filesystem'
};

export const COLLECTION_SOURCE_ITEMS = [
  { value: COLLECTION_SOURCE.WORKSPACE, label: 'Select from existing' },
  { value: COLLECTION_SOURCE.FILESYSTEM, label: 'From file system' }
];

export const API_SPEC_NAME_TAKEN_ERROR = 'A spec with this name already exists in this location';

export const INVALID_URL_ERROR = 'Enter a valid http(s) URL';

export const DEFAULT_API_SPEC_EXTENSION = '.yaml';

export const getApiSpecRejectionReason = (data, specType) => {
  if (specType !== 'openapi') {
    return 'That URL does not return an OpenAPI specification.';
  }

  const readVersion = (value) => (typeof value === 'string' ? value.trim().slice(0, 20) : '');

  const swaggerVersion = readVersion(data?.swagger);
  if (swaggerVersion) {
    return `Swagger ${swaggerVersion} is not supported. Provide an OpenAPI 3.x specification.`;
  }

  const version = readVersion(data?.openapi);
  if (!version.startsWith('3.')) {
    return `OpenAPI ${version || 'version'} is not supported. Provide an OpenAPI 3.x specification.`;
  }

  return null;
};

export const detectApiSpecExtension = (rawContent) => {
  try {
    JSON.parse(rawContent);
    return '.json';
  } catch (error) {
    return DEFAULT_API_SPEC_EXTENSION;
  }
};

export const deriveApiSpecNameFromUrl = (data, url) => {
  const title = sanitizeName(String(data?.info?.title || '').trim());
  if (validateName(title)) {
    return title;
  }

  try {
    const fileName = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const withoutExtension = sanitizeName(fileName.replace(/\.(ya?ml|json)$/i, ''));
    return validateName(withoutExtension) ? withoutExtension : '';
  } catch (error) {
    return '';
  }
};

export const isApiSpecNameTaken = ({ apiSpecs = [], apiSpecName, apiSpecLocation }) => {
  if (!apiSpecName || !apiSpecLocation) {
    return false;
  }

  const toKey = (value) => normalizePath(value || '').toLowerCase();
  const targetLocation = toKey(apiSpecLocation);
  const targetName = toKey(apiSpecName);

  return apiSpecs.some((apiSpec) => {
    const pathname = apiSpec.pathname || '';
    return toKey(path.dirname(pathname)) === targetLocation
      && toKey(path.basename(pathname, path.extname(pathname))) === targetName;
  });
};
