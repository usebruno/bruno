import { debounce } from 'lodash';
import QueryResultFilter from './QueryResultFilter';
import React from 'react';
import classnames from 'classnames';
import { getContentType, formatResponse } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';
import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import { detectContentTypeFromBuffer, getEncoding } from 'utils/common/index';
import LargeResponseWarning from '../LargeResponseWarning';
import QueryResultTypeSelector from './QueryResultTypeSelector/index';

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

const QueryResult = ({ item, collection, data, dataBuffer, disableRunEventListener, headers, error }) => {
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
  const [selectedFormat, setSelectedFormat] = useState('raw');
  const [selectedTab, setSelectedTab] = useState('editor');
  const [isInitialRun, setIsInitialRun] = useState(true);
  const [previewFormatOptions, setPreviewFormatOptions] = useState(PREVIEW_FORMAT_OPTIONS);

  useEffect(() => {
    const byteFormatTypes = ['image', 'video', 'audio', 'pdf', 'zip'];

    const isByteFormatType = (contentType) => {
      return byteFormatTypes.some((type) => contentType.includes(type));
    };

    const updatePreviewFormatOptionsBasedOnContentType = (contentType) => {
      if (isByteFormatType(contentType)) {
        setPreviewFormatOptions(PREVIEW_FORMAT_OPTIONS.slice(1, 2)); // Remove structured format options
      } else {
        setPreviewFormatOptions(PREVIEW_FORMAT_OPTIONS);
      }
    };

    if (detectedContentType) {
      updatePreviewFormatOptionsBasedOnContentType(detectedContentType);
    } else { // If no detected content type, fallback to content type to determine format options
      updatePreviewFormatOptionsBasedOnContentType(contentType);
    }
  }, [detectedContentType, contentType]);

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

  // Determine initial format based on content type (only runs once)
  const getInitialFormat = (_contentType) => {
    if (_contentType.includes('html')) return { format: 'html', tab: 'preview' };
    if (_contentType.includes('json')) return { format: 'json', tab: 'editor' };
    if (_contentType.includes('xml')) return { format: 'xml', tab: 'editor' };
    if (_contentType.includes('javascript')) return { format: 'javascript', tab: 'editor' };
    if (_contentType.includes('image')) return { format: 'base64', tab: 'preview' };
    if (_contentType.includes('pdf')) return { format: 'base64', tab: 'preview' };
    if (_contentType.includes('audio')) return { format: 'base64', tab: 'preview' };
    if (_contentType.includes('video')) return { format: 'base64', tab: 'preview' };
    if (_contentType.includes('text')) return { format: 'raw', tab: 'editor' };

    // for all other content types, return raw
    return { format: 'raw', tab: 'editor' };
  };

  // Initialize format and tab only once when data loads
  useEffect(() => {
    if (isInitialRun && (detectedContentType !== undefined && contentType !== undefined)) {
      const initial = getInitialFormat(contentType);
      setSelectedFormat(initial.format);
      setSelectedTab(initial.tab);
      setIsInitialRun(false);
    }
  }, [contentType, isInitialRun, detectedContentType]);

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
  }, [selectedFormat, contentType, dataBuffer]);


  const codeMirrorMode = useMemo(() => {
    return previewFormatOptions
      .flatMap((option) => option.options)
      .find((option) => option.value === selectedFormat)?.codeMirrorMode || 'application/text';
  }, [selectedFormat]);

  // User explicitly changes format - switch to editor tab to show the formatted data
  const handleFormatChange = (newFormat) => {
    setSelectedFormat(newFormat);
  };

  const onPreviewTabSelect = () => {
    setSelectedTab((prev) => prev === 'editor' ? 'preview' : 'editor');
  };

  const tabs = useMemo(() => {
    return (
      <QueryResultTypeSelector
        formatOptions={previewFormatOptions}
        formatValue={selectedFormat}
        onFormatChange={handleFormatChange}
        onPreviewTabSelect={onPreviewTabSelect}
        selectedTab={selectedTab}
      />
    );
  }, [selectedFormat, selectedTab]);

  const queryFilterEnabled = useMemo(() => codeMirrorMode.includes('json') && selectedFormat === 'json' && selectedTab === 'editor', [codeMirrorMode, selectedFormat, selectedTab]);
  const hasScriptError = item.preRequestScriptErrorMessage || item.postResponseScriptErrorMessage;

  return (
    <StyledWrapper
      className="w-full h-full relative flex"
      queryFilterEnabled={queryFilterEnabled}
    >
      <div className="flex justify-end gap-2 text-xs" role="tablist">
        {tabs}
      </div>
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
            <div className="absolute top-0 left-0 h-full w-full bg-[#f3f3f3] dark:bg-[#262626]" data-testid="response-preview-container">
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
