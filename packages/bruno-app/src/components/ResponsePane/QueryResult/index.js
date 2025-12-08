import { debounce } from 'lodash';
import { useTheme } from 'providers/Theme/index';
import React, { useMemo, useState } from 'react';
import { formatResponse, getContentType } from 'utils/common';
import { getEncoding } from 'utils/common/index';
import { getDefaultResponseFormat } from 'utils/response';
import LargeResponseWarning from '../LargeResponseWarning';
import QueryResultFilter from './QueryResultFilter';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';
import { detectContentTypeFromBuffer } from 'utils/response/index';

const PREVIEW_FORMAT_OPTIONS = [
  {
    // name: 'Structured',
    options: [
      { label: 'JSON', value: 'json', codeMirrorMode: 'application/ld+json' },
      { label: 'HTML', value: 'html', codeMirrorMode: 'xml' },
      { label: 'XML', value: 'xml', codeMirrorMode: 'xml' },
      { label: 'JavaScript', value: 'javascript', codeMirrorMode: 'javascript' }
    ]
  },
  {
    // name: 'Raw',
    options: [
      { label: 'Raw', value: 'raw', codeMirrorMode: 'text/plain' },
      { label: 'Hex', value: 'hex', codeMirrorMode: 'text/plain' },
      { label: 'Base64', value: 'base64', codeMirrorMode: 'text/plain' }
    ]
  }
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
    let buffer = null;
    try {
      buffer = dataBuffer ? Buffer.from(dataBuffer, 'base64') : null;
    } catch (error) {
      console.error('Error converting dataBuffer to Buffer:', error);
      buffer = null;
    }

    const detectedContentType = detectContentTypeFromBuffer(buffer);
    const contentType = getContentType(headers);

    // Wait until both content types are available
    if (detectedContentType === null || contentType === undefined) {
      return { initialFormat: null, initialTab: null };
    }

    const initial = getDefaultResponseFormat(contentType);
    return { initialFormat: initial.format, initialTab: initial.tab };
  }, [dataBuffer, headers]);
};

// Custom hook to determine preview format options based on content type
export const useResponsePreviewFormatOptions = (dataBuffer, headers) => {
  return useMemo(() => {
    let buffer = null;
    try {
      buffer = dataBuffer ? Buffer.from(dataBuffer, 'base64') : null;
    } catch (error) {
      console.error('Error converting dataBuffer to Buffer:', error);
      buffer = null;
    }

    const detectedContentType = detectContentTypeFromBuffer(buffer);
    const contentType = getContentType(headers);

    const byteFormatTypes = ['image', 'video', 'audio', 'pdf', 'zip'];

    const isByteFormatType = (contentType) => {
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
      return PREVIEW_FORMAT_OPTIONS.slice(1, 2); // Remove structured format options
    }

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
  selectedTab // 'editor' or 'preview'
}) => {
  let buffer = null;
  try {
    buffer = Buffer.from(dataBuffer, 'base64'); // dataBuffer is already a base64 string, convert it to actual Buffer
  } catch (error) {
    console.error('Error converting dataBuffer to Buffer:', error);
    buffer = null;
  }
  const detectedContentType = detectContentTypeFromBuffer(buffer);
  const contentType = getContentType(headers);
  const [filter, setFilter] = useState(null);
  const [showLargeResponse, setShowLargeResponse] = useState(false);
  const responseEncoding = getEncoding(headers);
  const { displayedTheme } = useTheme();

  const responseSize = useMemo(() => {
    const response = item.response || {};
    if (typeof response.size === 'number') {
      return response.size;
    }

    if (!dataBuffer) return 0;

    try {
      // dataBuffer is base64 encoded, so we need to calculate the actual size
      const buffer = Buffer.from(dataBuffer, 'base64');
      return buffer.length;
    } catch (error) {
      return 0;
    }
  }, [dataBuffer, item.response]);

  const isLargeResponse = responseSize > 10 * 1024 * 1024; // 10 MB

  const formattedData = useMemo(
    () => {
      if (isLargeResponse && !showLargeResponse) {
        return '';
      }
      return formatResponse(data, dataBuffer, selectedFormat, filter);
    },
    [data, dataBuffer, responseEncoding, selectedFormat, filter, isLargeResponse, showLargeResponse]
  );

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const previewMode = useMemo(() => {
    // Derive preview mode based on selected format
    if (selectedFormat === 'html') return 'preview-web';
    if (selectedFormat === 'json') return 'preview-json';
    if (selectedFormat === 'xml') return 'preview-xml';
    if (selectedFormat === 'raw') return 'preview-text';
    if (selectedFormat === 'javascript') return 'preview-web';

    // For base64/hex, check content type to determine binary preview type
    if (selectedFormat === 'base64' || selectedFormat === 'hex') {
      if (detectedContentType) {
        if (detectedContentType.includes('image')) return 'preview-image';
        if (detectedContentType.includes('pdf')) return 'preview-pdf';
        if (detectedContentType.includes('audio')) return 'preview-audio';
        if (detectedContentType.includes('video')) return 'preview-video';
      }
      // for all other content types, return preview-text
      return 'preview-text';
    }
    return 'preview-text';
  }, [selectedFormat, detectedContentType]);

  const codeMirrorMode = useMemo(() => {
    return PREVIEW_FORMAT_OPTIONS
      .flatMap((option) => option.options)
      .find((option) => option.value === selectedFormat)?.codeMirrorMode || 'text/plain';
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
            <div className="text-red-500" style={{ whiteSpace: 'pre-line' }}>{formatErrorMessage(error)}</div>
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
                dataBuffer={dataBuffer}
                formattedData={formattedData}
                item={item}
                contentType={contentType}
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
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
