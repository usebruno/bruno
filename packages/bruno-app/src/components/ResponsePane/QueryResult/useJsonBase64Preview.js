import { useMemo, useState } from 'react';
import { JSONPath } from 'jsonpath-plus';
import { safeParseJSON } from 'utils/common';
import { detectContentTypeFromBase64 } from 'utils/response';

const parseJsonPayload = (data) => {
  if (data && typeof data === 'object') {
    return data;
  }

  if (typeof data === 'string') {
    const parsed = safeParseJSON(data);
    return typeof parsed === 'object' ? parsed : null;
  }

  return null;
};

const getJsonPathFirstValue = (source, path) => {
  if (!source || !path || typeof path !== 'string') {
    return null;
  }

  try {
    const result = JSONPath({ path: path, json: source });
    return Array.isArray(result) ? result[0] : null;
  } catch (error) {
    return null;
  }
};

const normalizeBase64String = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const dataUrlPrefix = value.match(/^data:[^;]*;base64,/);
  if (dataUrlPrefix) {
    return value.slice(dataUrlPrefix[0].length);
  }

  return value;
};

const isLikelyBase64 = (value) => {
  const normalized = normalizeBase64String(value);
  if (!normalized || normalized.length < 16) {
    return false;
  }

  const cleaned = normalized.replace(/\s+/g, '');
  if (cleaned.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/]+={0,2}$/.test(cleaned);
};

const buildJsonPath = (parentPath, key) => {
  if (typeof key === 'number') {
    return `${parentPath}[${key}]`;
  }

  if (/^[A-Za-z_$][\w$]*$/.test(key)) {
    return `${parentPath}.${key}`;
  }

  const safeKey = String(key).replace(/'/g, '\\\'');
  return `${parentPath}['${safeKey}']`;
};

const findBase64Candidate = (payload) => {
  const stack = [{ value: payload, path: '$', parentMimeType: null }];
  let fallbackCandidate = null;
  let nodes = 0;
  const maxNodes = 2000;

  while (stack.length && nodes < maxNodes) {
    const { value, path, parentMimeType } = stack.pop();
    nodes += 1;

    if (typeof value === 'string' && isLikelyBase64(value)) {
      const normalized = normalizeBase64String(value);
      if (normalized) {
        const detected = detectContentTypeFromBase64(normalized);
        if (detected) {
          return { base64: normalized, path, mimeType: parentMimeType };
        }
        if (!fallbackCandidate) {
          fallbackCandidate = { base64: normalized, path, mimeType: parentMimeType };
        }
      }
    }

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i -= 1) {
        stack.push({ value: value[i], path: buildJsonPath(path, i), parentMimeType });
      }
    } else if (value && typeof value === 'object') {
      const nextParentMimeType = typeof value.mimeType === 'string' ? value.mimeType : parentMimeType;
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i -= 1) {
        const key = keys[i];
        stack.push({ value: value[key], path: buildJsonPath(path, key), parentMimeType: nextParentMimeType });
      }
    }
  }

  return fallbackCandidate;
};

const getBinaryBase64 = (payload, path) => {
  if (!payload) {
    return null;
  }

  if (path) {
    return normalizeBase64String(getJsonPathFirstValue(payload, path));
  }

  const candidate = findBase64Candidate(payload);
  return candidate?.base64 || null;
};

const getJsonPathParent = (path) => {
  if (!path || path === '$') {
    return null;
  }

  const withoutIndex = path.replace(/\[(\d+)\]$/, '');
  if (withoutIndex !== path) {
    return withoutIndex || null;
  }

  const withoutBracketKey = path.replace(/\[['"]((?:\\.|[^'\"])*)['"]\]$/, '');
  if (withoutBracketKey !== path) {
    return withoutBracketKey || null;
  }

  const dotIndex = path.lastIndexOf('.');
  if (dotIndex > 0) {
    return path.slice(0, dotIndex);
  }

  return null;
};

const getBinaryMimeType = (payload, path) => {
  if (!payload) {
    return null;
  }

  if (path) {
    const selectedValue = getJsonPathFirstValue(payload, path);
    if (selectedValue && typeof selectedValue === 'object' && typeof selectedValue.mimeType === 'string') {
      return selectedValue.mimeType;
    }

    if (typeof selectedValue === 'string') {
      const parentPath = getJsonPathParent(path);
      if (parentPath) {
        const parentValue = getJsonPathFirstValue(payload, parentPath);
        if (parentValue && typeof parentValue === 'object' && typeof parentValue.mimeType === 'string') {
          return parentValue.mimeType;
        }
      }
    }

    return null;
  }

  const candidate = findBase64Candidate(payload);
  if (candidate && typeof candidate.mimeType === 'string') {
    return candidate.mimeType;
  }

  return typeof payload.mimeType === 'string' ? payload.mimeType : null;
};

/**
 * Derives base64 preview state and the effective buffer for JSON responses.
 * Automatically detects Base64-encoded binary data within JSON payloads and provides
 * preview rendering support with optional JSONPath override for manual specification.
 *
 * @param {Object} params
 * @param {*} params.data - The JSON response data to analyze
 * @param {string} params.dataBuffer - The original binary data buffer
 * @param {string} params.selectedFormat - Selected display format (e.g., 'base64', 'hex')
 * @param {string} params.selectedTab - Active tab in response view (e.g., 'preview')
 * @param {boolean} params.isEnabled - Whether the feature is enabled via preferences
 *
 * @returns {Object} Preview state and derived values
 * @returns {string} binarySourcePath - JSONPath to binary source (user-settable)
 * @returns {Function} setBinarySourcePath - Setter for binarySourcePath state
 * @returns {boolean} binarySourceFilterEnabled - Whether path filtering is available
 * @returns {string|null} binaryMimeType - Detected MIME type from payload
 * @returns {string} effectiveDataBuffer - Buffer to use for preview rendering
 * @returns {string|null} detectedContentType - Detected content type from magic numbers
 */
const useJsonBase64Preview = ({ data, dataBuffer, selectedFormat, selectedTab, isEnabled }) => {
  const [binarySourcePath, setBinarySourcePath] = useState('');
  const jsonPayload = useMemo(() => parseJsonPayload(data), [data]);

  const binaryBase64 = useMemo(() => {
    if (!isEnabled) {
      return null;
    }

    return getBinaryBase64(jsonPayload, binarySourcePath);
  }, [jsonPayload, binarySourcePath, isEnabled]);

  const binaryMimeType = useMemo(() => {
    if (!isEnabled) {
      return null;
    }

    return getBinaryMimeType(jsonPayload, binarySourcePath);
  }, [jsonPayload, binarySourcePath, isEnabled]);

  const effectiveDataBuffer = useMemo(() => {
    if (
      isEnabled
      && selectedTab === 'preview'
      && (selectedFormat === 'base64' || selectedFormat === 'hex')
      && binaryBase64
    ) {
      return binaryBase64;
    }

    return dataBuffer;
  }, [dataBuffer, selectedFormat, binaryBase64, selectedTab, isEnabled]);

  const detectedContentType = useMemo(() => {
    return detectContentTypeFromBase64(effectiveDataBuffer);
  }, [effectiveDataBuffer]);

  const binarySourceFilterEnabled = useMemo(() => {
    return isEnabled
      && (selectedFormat === 'base64' || selectedFormat === 'hex')
      && jsonPayload
      && selectedTab === 'preview';
  }, [selectedFormat, jsonPayload, selectedTab, isEnabled]);

  return {
    binarySourcePath,
    setBinarySourcePath,
    binarySourceFilterEnabled,
    binaryMimeType,
    effectiveDataBuffer,
    detectedContentType
  };
};

export default useJsonBase64Preview;
