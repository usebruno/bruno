import { debounce } from 'lodash';
import { useTheme } from 'providers/Theme/index';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { formatResponse, getContentType, safeParseJSON } from 'utils/common';
import { JSONPath } from 'jsonpath-plus';
import { getDefaultResponseFormat, detectContentTypeFromBase64 } from 'utils/response';
import LargeResponseWarning from '../LargeResponseWarning';
import QueryResultFilter from './QueryResultFilter';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';

// Raw format options (for byte format types)
const RAW_FORMAT_OPTIONS = [
  { id: 'raw', label: 'Raw', type: 'item', codeMirrorMode: 'text/plain' },
  { id: 'hex', label: 'Hex', type: 'item', codeMirrorMode: 'text/plain' },
  { id: 'base64', label: 'Base64', type: 'item', codeMirrorMode: 'text/plain' }
];

// Preview format options
const PREVIEW_FORMAT_OPTIONS = [
  // Structured formats
  { id: 'json', label: 'JSON', type: 'item', codeMirrorMode: 'application/ld+json' },
  { id: 'html', label: 'HTML', type: 'item', codeMirrorMode: 'xml' },
  { id: 'xml', label: 'XML', type: 'item', codeMirrorMode: 'xml' },
  { id: 'javascript', label: 'JavaScript', type: 'item', codeMirrorMode: 'javascript' },
  // Divider
  { type: 'divider', id: 'divider-structured-raw' },
  // Raw formats
  ...RAW_FORMAT_OPTIONS
];

const formatErrorMessage = (error) => {
  if (!error) return 'Something went wrong';

  const remoteMethodError = 'Error invoking remote method \'send-http-request\':';

  if (error?.includes(remoteMethodError)) {
    const parts = error.split(remoteMethodError);
    return parts[1]?.trim() || error;
  }

  return error;
};

// Custom hook to determine the initial format and tab based on the data buffer and headers
export const useInitialResponseFormat = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = detectContentTypeFromBase64(dataBuffer);
    const contentType = getContentType(headers);

    // Wait until both content types are available
    if (detectedContentType === null || contentType === undefined) {
      return { initialFormat: null, initialTab: null, contentType: contentType };
    }

    const initial = getDefaultResponseFormat(contentType);
    return { initialFormat: initial.format, initialTab: initial.tab, contentType: contentType };
  }, [dataBuffer, headers]);
};

// Custom hook to determine preview format options based on content type
export const useResponsePreviewFormatOptions = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = detectContentTypeFromBase64(dataBuffer);
    const contentType = getContentType(headers);

    const byteFormatTypes = ['image', 'video', 'audio', 'pdf', 'zip'];

    const isByteFormatType = (contentType) => {
      if (contentType.toLowerCase().includes('svg')) return false; // SVG is text-based
      return byteFormatTypes.some((type) => contentType.includes(type));
    };

    const getContentTypeToCheck = () => {
      if (detectedContentType) {
        return detectedContentType;
      }
      return contentType;
    };

    const contentTypeToCheck = getContentTypeToCheck();

    if (contentTypeToCheck && isByteFormatType(contentTypeToCheck)) {
      // Return only raw format options (no structured formats)
      return RAW_FORMAT_OPTIONS;
    }

    // Return all format options
    return PREVIEW_FORMAT_OPTIONS;
  }, [dataBuffer, headers]);
};

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

const getBinaryBase64 = (payload, path) => {
  if (!payload) {
    return null;
  }

  if (path) {
    return normalizeBase64String(getJsonPathFirstValue(payload, path));
  }

  return normalizeBase64String(payload.data);
};

const getBinaryMimeType = (payload) => {
  if (!payload) {
    return null;
  }

  return typeof payload.mimeType === 'string' ? payload.mimeType : null;
};

const QueryResult = ({
  item,
  collection,
  data,
  dataBuffer,
  disableRunEventListener,
  headers,
  error,
  selectedFormat, // one of the options in PREVIEW_FORMAT_OPTIONS
  selectedTab // 'editor' or 'preview'
}) => {
  const contentType = getContentType(headers);
  const [filter, setFilter] = useState(null);
  const [showLargeResponse, setShowLargeResponse] = useState(false);
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const isJsonBase64PreviewEnabled = get(preferences, 'beta.jsonBase64Preview', false);

  const responseSize = useMemo(() => {
    const response = item.response || {};
    if (typeof response.size === 'number') {
      return response.size;
    }

    // Fallback: estimate from base64 length (base64 is ~4/3 of original size)
    if (dataBuffer && typeof dataBuffer === 'string') {
      return Math.floor(dataBuffer.length * 0.75);
    }
    return 0;
  }, [dataBuffer, item.response]);

  const isLargeResponse = responseSize > 10 * 1024 * 1024; // 10 MB

  const [binarySourcePath, setBinarySourcePath] = useState('');
  const jsonPayload = useMemo(() => parseJsonPayload(data), [data]);

  const binaryBase64 = useMemo(() => {
    if (!isJsonBase64PreviewEnabled) {
      return null;
    }

    return getBinaryBase64(jsonPayload, binarySourcePath);
  }, [jsonPayload, binarySourcePath, isJsonBase64PreviewEnabled]);

  const binaryMimeType = useMemo(() => {
    if (!isJsonBase64PreviewEnabled) {
      return null;
    }

    return getBinaryMimeType(jsonPayload);
  }, [jsonPayload, isJsonBase64PreviewEnabled]);

  const effectiveDataBuffer = useMemo(() => {
    if (
      isJsonBase64PreviewEnabled
      && selectedTab === 'preview'
      && (selectedFormat === 'base64' || selectedFormat === 'hex')
      && binaryBase64
    ) {
      return binaryBase64;
    }

    return dataBuffer;
  }, [dataBuffer, selectedFormat, binaryBase64, selectedTab, isJsonBase64PreviewEnabled]);

  const detectedContentType = useMemo(() => {
    return detectContentTypeFromBase64(effectiveDataBuffer);
  }, [effectiveDataBuffer, isLargeResponse]);

  const formattedData = useMemo(
    () => {
      if (isLargeResponse && !showLargeResponse) {
        return '';
      }
      return formatResponse(data, effectiveDataBuffer, selectedFormat, filter);
    },
    [data, effectiveDataBuffer, selectedFormat, filter, isLargeResponse, showLargeResponse]
  );

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const previewMode = useMemo(() => {
    const previewContentType = selectedTab === 'preview'
      ? (binaryMimeType || detectedContentType)
      : detectedContentType;
    // Derive preview mode based on selected format
    if (selectedFormat === 'html') return 'preview-web';
    if (selectedFormat === 'json') return 'preview-json';
    if (selectedFormat === 'xml') return 'preview-xml';
    if (selectedFormat === 'raw') return 'preview-text';
    if (selectedFormat === 'javascript') return 'preview-web';

    // For base64/hex, check content type to determine binary preview type
    if (selectedFormat === 'base64' || selectedFormat === 'hex') {
      if (previewContentType) {
        if (previewContentType.includes('image')) return 'preview-image';
        if (previewContentType.includes('pdf')) return 'preview-pdf';
        if (previewContentType.includes('audio')) return 'preview-audio';
        if (previewContentType.includes('video')) return 'preview-video';
      }
      // for all other content types, return preview-text
      return 'preview-text';
    }
    return 'preview-text';
  }, [selectedFormat, detectedContentType, binaryMimeType]);

  const codeMirrorMode = useMemo(() => {
    // Find the codeMirrorMode from PREVIEW_FORMAT_OPTIONS (contains all format options)
    return PREVIEW_FORMAT_OPTIONS
      .filter((option) => option.type === 'item' || !option.type)
      .find((option) => option.id === selectedFormat)?.codeMirrorMode || 'text/plain';
  }, [selectedFormat]);

  const queryFilterEnabled = useMemo(() => {
    return codeMirrorMode.includes('json') && selectedFormat === 'json' && selectedTab === 'editor';
  }, [codeMirrorMode, selectedFormat, selectedTab]);
  const binarySourceFilterEnabled = useMemo(() => {
    return isJsonBase64PreviewEnabled
      && (selectedFormat === 'base64' || selectedFormat === 'hex')
      && jsonPayload
      && selectedTab === 'preview';
  }, [selectedFormat, jsonPayload, selectedTab, isJsonBase64PreviewEnabled]);
  const hasScriptError = item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage;

  return (
    <StyledWrapper
      className="w-full h-full relative flex"
      queryFilterEnabled={queryFilterEnabled}
    >
      {error ? (
        <div>
          {hasScriptError ? null : (
            <div className="error" style={{ whiteSpace: 'pre-line' }}>{formatErrorMessage(error)}</div>
          )}

          {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
            <div className="mt-6 muted text-xs">
              You can disable SSL verification in the Preferences. <br />
              To open the Preferences, click on the gear icon in the bottom left corner.
            </div>
          ) : null}
        </div>
      ) : isLargeResponse && !showLargeResponse ? (
        <LargeResponseWarning
          item={item}
          responseSize={responseSize}
          onRevealResponse={() => setShowLargeResponse(true)}
        />
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 h-full w-full" data-testid="response-preview-container">
              <QueryResultPreview
                selectedTab={selectedTab}
                data={data}
                dataBuffer={effectiveDataBuffer}
                formattedData={formattedData}
                item={item}
                contentType={binaryMimeType || (detectedContentType ?? contentType)}
                previewMode={previewMode}
                codeMirrorMode={codeMirrorMode}
                collection={collection}
                disableRunEventListener={disableRunEventListener}
                displayedTheme={displayedTheme}
              />
            </div>
            {queryFilterEnabled && (
              <QueryResultFilter filter={filter} onChange={debouncedResultFilterOnChange} mode={codeMirrorMode} />
            )}
            {binarySourceFilterEnabled && (
              <QueryResultFilter
                filter={binarySourcePath}
                onChange={(event) => setBinarySourcePath(event.target.value)}
                mode="application/ld+json"
                placeholderText="$.data"
                infotipText="Binary source JSONPath (defaults to $.data, uses $.mimeType if present)"
                inputId="response-binary-source"
                iconId="response-binary-source-icon"
              />
            )}
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
