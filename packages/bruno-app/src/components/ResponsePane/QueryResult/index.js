import { debounce } from 'lodash';
import { useTheme } from 'providers/Theme/index';
import React, { useMemo, useCallback } from 'react';
import { formatResponse, getContentType } from 'utils/common';
import { getDefaultResponseFormat, detectContentTypeFromBase64 } from 'utils/response';
import { useResponseBodyWindow, mediaUrlFor } from 'utils/response-body';
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

const LARGE_RESPONSE_BYTES = 10 * 1024 * 1024;

// Custom hook to determine the initial format and tab based on the data buffer and headers
export const useInitialResponseFormat = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = dataBuffer ? detectContentTypeFromBase64(dataBuffer) : null;
    const contentType = getContentType(headers);

    // Wait until content type from headers is available when we have no magic-byte sniff
    if (contentType === undefined) {
      return { initialFormat: null, initialTab: null, contentType: contentType };
    }

    if (detectedContentType === null && dataBuffer) {
      return { initialFormat: null, initialTab: null, contentType: contentType };
    }

    const initial = getDefaultResponseFormat(contentType);
    return { initialFormat: initial.format, initialTab: initial.tab, contentType: contentType };
  }, [dataBuffer, headers]);
};

// Custom hook to determine preview format options based on content type
export const useResponsePreviewFormatOptions = (dataBuffer, headers) => {
  return useMemo(() => {
    const detectedContentType = dataBuffer ? detectContentTypeFromBase64(dataBuffer) : null;
    const contentType = getContentType(headers);

    const byteFormatTypes = ['image', 'video', 'audio', 'pdf', 'zip'];

    const isByteFormatType = (ct) => {
      if (ct.toLowerCase().includes('svg')) return false; // SVG is text-based
      return byteFormatTypes.some((type) => ct.includes(type));
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

const QueryResult = ({
  item,
  collection,
  data,
  dataBuffer,
  disableRunEventListener,
  headers,
  error,
  selectedFormat, // one of the options in PREVIEW_FORMAT_OPTIONS
  selectedTab, // 'editor' or 'preview'
  filter,
  filterExpanded,
  onFilterChange,
  onFilterExpandChange,
  docKey,
  prettifiedOverride
}) => {
  const contentType = getContentType(headers);
  const { displayedTheme } = useTheme();
  const response = item.response || {};
  const bodyRef = response.bodyRef;

  const responseSize = useMemo(() => {
    if (typeof response.size === 'number') {
      return response.size;
    }

    // Fallback: estimate from base64 length (base64 is ~4/3 of original size)
    if (dataBuffer && typeof dataBuffer === 'string') {
      return Math.floor(dataBuffer.length * 0.75);
    }
    return 0;
  }, [dataBuffer, response.size]);

  const needsWindowedText = Boolean(bodyRef) && responseSize > LARGE_RESPONSE_BYTES && !data;
  const mediaSrc = useMemo(() => mediaUrlFor(bodyRef), [bodyRef]);
  const {
    text: windowedText,
    loading: windowLoading,
    error: windowError,
    scrollAnchor,
    loadMore,
    loadPrevious
  } = useResponseBodyWindow(bodyRef, {
    totalSize: responseSize,
    enabled: needsWindowedText
  });

  const handleNearBottomScroll = useCallback(() => {
    if (needsWindowedText) {
      loadMore();
    }
  }, [needsWindowedText, loadMore]);

  const handleNearTopScroll = useCallback(() => {
    if (needsWindowedText) {
      loadPrevious();
    }
  }, [needsWindowedText, loadPrevious]);
  const detectedContentType = useMemo(() => {
    if (dataBuffer) return detectContentTypeFromBase64(dataBuffer);
    return null;
  }, [dataBuffer]);

  const formattedData = useMemo(
    () => {
      if (prettifiedOverride != null && !needsWindowedText) {
        return prettifiedOverride;
      }
      // File-backed windows stay as raw byte slices in a sliding viewport
      if (needsWindowedText) {
        return windowedText || (windowLoading ? 'Loading response…' : '');
      }
      return formatResponse(data, dataBuffer, selectedFormat, filter);
    },
    [data, dataBuffer, selectedFormat, filter, needsWindowedText, windowedText, windowLoading, prettifiedOverride]
  );

  const handleFilterChange = (value) => {
    if (onFilterChange) {
      onFilterChange(value);
    }
  };

  const previewMode = useMemo(() => {
    // Derive preview mode based on selected format
    if (selectedFormat === 'html') return 'preview-web';
    if (selectedFormat === 'json') return 'preview-json';
    if (selectedFormat === 'xml') return 'preview-xml';
    if (selectedFormat === 'raw') return 'preview-text';
    if (selectedFormat === 'javascript') return 'preview-web';

    // For base64/hex, check content type to determine binary preview type
    if (selectedFormat === 'base64' || selectedFormat === 'hex') {
      const ct = detectedContentType || contentType || '';
      if (ct.includes('image')) return 'preview-image';
      if (ct.includes('pdf')) return 'preview-pdf';
      if (ct.includes('audio')) return 'preview-audio';
      if (ct.includes('video')) return 'preview-video';
      return 'preview-text';
    }

    // Auto media preview when content-type is binary and we have bodyRef
    const ct = (contentType || '').toLowerCase();
    if (bodyRef && !data) {
      if (ct.includes('image')) return 'preview-image';
      if (ct.includes('pdf')) return 'preview-pdf';
      if (ct.includes('audio')) return 'preview-audio';
      if (ct.includes('video')) return 'preview-video';
    }

    return 'preview-text';
  }, [selectedFormat, detectedContentType, contentType, bodyRef, data]);

  const codeMirrorMode = useMemo(() => {
    // Find the codeMirrorMode from PREVIEW_FORMAT_OPTIONS (contains all format options)
    return PREVIEW_FORMAT_OPTIONS
      .filter((option) => option.type === 'item' || !option.type)
      .find((option) => option.id === selectedFormat)?.codeMirrorMode || 'text/plain';
  }, [selectedFormat]);

  const queryFilterEnabled = useMemo(() => codeMirrorMode.includes('json') && selectedFormat === 'json' && selectedTab === 'editor', [codeMirrorMode, selectedFormat, selectedTab]);
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
      ) : (
        <div className="h-full flex flex-col">
          {windowError ? (
            <div className="error p-2 text-sm">{windowError}</div>
          ) : null}
          <div className="flex-1 relative">
            <div className="absolute top-0 left-0 h-full w-full" data-testid="response-preview-container">
              <QueryResultPreview
                selectedTab={selectedTab}
                data={data ?? windowedText}
                dataBuffer={dataBuffer}
                formattedData={formattedData}
                item={item}
                contentType={detectedContentType ?? contentType}
                previewMode={previewMode}
                codeMirrorMode={codeMirrorMode}
                collection={collection}
                disableRunEventListener={disableRunEventListener}
                displayedTheme={displayedTheme}
                docKey={docKey}
                mediaSrc={mediaSrc}
                onNearBottomScroll={needsWindowedText ? handleNearBottomScroll : undefined}
                onNearTopScroll={needsWindowedText ? handleNearTopScroll : undefined}
                scrollAnchor={needsWindowedText ? scrollAnchor : undefined}
              />
            </div>
          </div>
          {queryFilterEnabled ? (
            <QueryResultFilter
              filter={filter}
              filterExpanded={filterExpanded}
              onChange={debounce(handleFilterChange, 200)}
              onExpandChange={onFilterExpandChange}
              mode={codeMirrorMode}
            />
          ) : null}
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
