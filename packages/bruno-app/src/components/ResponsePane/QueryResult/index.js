import { debounce } from 'lodash';
import QueryResultFilter from './QueryResultFilter';
import { JSONPath } from 'jsonpath-plus';
import React from 'react';
import classnames from 'classnames';
import iconv from 'iconv-lite';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';
import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import { getEncoding, uuid } from 'utils/common/index';
import LargeResponseWarning from '../LargeResponseWarning';

// Memory threshold to prevent crashes when decoding large buffers
const LARGE_BUFFER_THRESHOLD = 50 * 1024 * 1024; // 50 MB

const formatResponse = (data, dataBuffer, encoding, mode, filter) => {
  if (data === undefined || !dataBuffer || !mode) {
    return '';
  }

  let bufferSize = 0;
  try {
    bufferSize = Buffer.from(dataBuffer, 'base64').length;
  } catch (error) {
    console.warn('Failed to calculate buffer size:', error);
  }
  
  const isVeryLargeResponse = bufferSize > LARGE_BUFFER_THRESHOLD;

  if (mode.includes('json')) {
    try {
      if (isVeryLargeResponse) {
        if (filter) {
          try {
            const filteredData = JSONPath({ path: filter, json: data });
            return typeof filteredData === 'string' ? filteredData : safeStringifyJSON(filteredData, true);
          } catch (e) {
            console.warn('Could not apply JSONPath filter to large response:', e.message);
          }
        }
        return typeof data === 'string' ? data : safeStringifyJSON(data, false);
      }
      
      let processedData = data;
      
      if (filter) {
        try {
          processedData = JSONPath({ path: filter, json: data });
        } catch (e) {
          console.warn('Could not apply JSONPath filter:', e.message);
        }
      }

      return safeStringifyJSON(processedData, true);
    } catch (error) {
      return typeof data === 'string' ? data : String(data);
    }
  }

  if (mode.includes('xml')) {
    if (isVeryLargeResponse) {
      return typeof data === 'string' ? data : safeStringifyJSON(data, false);
    }
    
    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }
    return safeStringifyJSON(parsed, true);
  }

  if (typeof data === 'string') {
    return data;
  }

  return safeStringifyJSON(data, !isVeryLargeResponse);
};

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
      return formatResponse(data, dataBuffer, responseEncoding, mode, filter);
    },
    [data, dataBuffer, responseEncoding, mode, filter, isLargeResponse, showLargeResponse]
  );

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const allowedPreviewModes = useMemo(() => {
    // Always show raw
    const allowedPreviewModes = [{ mode: 'raw', name: 'Raw', uid: uuid() }];

    if (!mode || !contentType) return allowedPreviewModes;

    if (mode?.includes('html') && typeof data === 'string') {
      allowedPreviewModes.unshift({ mode: 'preview-web', name: 'Web', uid: uuid() });
    } else if (mode.includes('image')) {
      allowedPreviewModes.unshift({ mode: 'preview-image', name: 'Image', uid: uuid() });
    } else if (contentType.includes('pdf')) {
      allowedPreviewModes.unshift({ mode: 'preview-pdf', name: 'PDF', uid: uuid() });
    } else if (contentType.includes('audio')) {
      allowedPreviewModes.unshift({ mode: 'preview-audio', name: 'Audio', uid: uuid() });
    } else if (contentType.includes('video')) {
      allowedPreviewModes.unshift({ mode: 'preview-video', name: 'Video', uid: uuid() });
    }

    return allowedPreviewModes;
  }, [mode, data, formattedData]);

  const [previewTab, setPreviewTab] = useState(allowedPreviewModes[0]);
  // Ensure the active Tab is always allowed
  useEffect(() => {
    if (!allowedPreviewModes.find((previewMode) => previewMode?.uid == previewTab?.uid)) {
      setPreviewTab(allowedPreviewModes[0]);
    }
  }, [previewTab, allowedPreviewModes]);

  const tabs = useMemo(() => {
    if (allowedPreviewModes.length === 1) {
      return null;
    }

    return allowedPreviewModes.map((previewMode) => (
      <div
        className={classnames(
          'select-none capitalize',
          previewMode?.uid === previewTab?.uid ? 'active' : 'cursor-pointer'
        )}
        role="tab"
        onClick={() => setPreviewTab(previewMode)}
        key={previewMode?.uid}
      >
        {previewMode?.name}
      </div>
    ));
  }, [allowedPreviewModes, previewTab]);

  const queryFilterEnabled = useMemo(() => mode.includes('json'), [mode]);
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
            <QueryResultPreview
              previewTab={previewTab}
              data={data}
              dataBuffer={dataBuffer}
              formattedData={formattedData}
              item={item}
              contentType={contentType}
              mode={mode}
              collection={collection}
              allowedPreviewModes={allowedPreviewModes}
              disableRunEventListener={disableRunEventListener}
              displayedTheme={displayedTheme}
            />
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
