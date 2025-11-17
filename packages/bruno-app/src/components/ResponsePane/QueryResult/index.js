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
import { getEncoding, uuid } from 'utils/common/index';
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

  const remoteMethodError = "Error invoking remote method 'send-http-request':";
  
  if (error?.includes(remoteMethodError)) {
    const parts = error.split(remoteMethodError);
    return parts[1]?.trim() || error;
  }

  return error;
};

const QueryResult = ({ item, collection, data, dataBuffer, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType, data);
  const [filter, setFilter] = useState(null);
  const [showLargeResponse, setShowLargeResponse] = useState(false);
  const responseEncoding = getEncoding(headers);
  const { displayedTheme } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState('raw');
  const [selectedTab, setSelectedTab] = useState('editor');
  const [isInitialRun, setIsInitialRun] = useState(true);

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
  const getInitialFormat = (mode, contentType) => {
    if (mode.includes('html')) return { format: 'html', tab: 'preview' };
    if (mode.includes('json')) return { format: 'json', tab: 'editor' };
    if (mode.includes('xml')) return { format: 'xml', tab: 'editor' };
    if (mode.includes('javascript')) return { format: 'javascript', tab: 'editor' };
    if (mode.includes('image')) return { format: 'base64', tab: 'preview' };
    if (contentType.includes('pdf')) return { format: 'base64', tab: 'preview' };
    if (contentType.includes('audio')) return { format: 'base64', tab: 'preview' };
    if (contentType.includes('video')) return { format: 'base64', tab: 'preview' };

    // for all other content types, return raw
    return { format: 'raw', tab: 'editor' };
  };

  // Initialize format and tab only once when data loads
  useEffect(() => {
    if (isInitialRun && (data || dataBuffer)) {
      const initial = getInitialFormat(mode, contentType);
      setSelectedFormat(initial.format);
      setSelectedTab(initial.tab);
      setIsInitialRun(false);
    }
  }, [mode, contentType, data, dataBuffer, isInitialRun]);

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
      if (contentType.includes('image')) return 'preview-image';
      if (contentType.includes('pdf')) return 'preview-pdf';
      if (contentType.includes('audio')) return 'preview-audio';
      if (contentType.includes('video')) return 'preview-video';

      // for all other content types, return preview-text
      return 'preview-text';
    }
  }, [selectedFormat, contentType]);


  const codeMirrorMode = useMemo(() => {
    return PREVIEW_FORMAT_OPTIONS
      .flatMap((option) => option.options)
      .find((option) => option.value === selectedFormat)?.codeMirrorMode || 'application/text';
  }, [selectedFormat]);

  // User explicitly changes format - switch to editor tab to show the formatted data
  const handleFormatChange = (newFormat) => {
    setSelectedFormat(newFormat);
    setSelectedTab('editor');
  };

  const onPreviewTabSelect = () => {
    setSelectedTab('preview');
  };

  const onEditorTabSelect = () => {
    setSelectedTab('editor');
  };

  const tabs = useMemo(() => {
    return (
      <QueryResultTypeSelector
        formatOptions={PREVIEW_FORMAT_OPTIONS}
        formatValue={selectedFormat}
        onFormatChange={handleFormatChange}
        onPreviewTabSelect={onPreviewTabSelect}
        onEditorTabSelect={onEditorTabSelect}
        selectedTab={selectedTab}
      />
    );
  }, [selectedFormat, selectedTab]);

  const queryFilterEnabled = useMemo(() => mode.includes('json') && selectedFormat === 'json' && selectedTab === 'editor', [mode, selectedFormat, selectedTab]);
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
              <QueryResultFilter filter={filter} onChange={debouncedResultFilterOnChange} mode={mode} />
            )}
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
