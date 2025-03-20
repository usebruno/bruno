import { debounce } from 'lodash';
import QueryResultFilter from './QueryResultFilter';
import { JSONPath } from 'jsonpath-plus';
import React from 'react';
import classnames from 'classnames';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';
import QueryResultPreview from './QueryResultPreview';
import StyledWrapper from './StyledWrapper';
import { useState, useMemo, useEffect } from 'react';
import { useTheme } from 'providers/Theme/index';
import { getEncoding, prettifyJson, uuid } from 'utils/common/index';

const formatResponse = (data, dataRaw, mode, filter) => {
  if (data === undefined || !dataRaw) {
    return '';
  }

  if (mode.includes('json')) {
    try {
      JSON.parse(dataRaw);
    } catch (error) {
      // If the response content-type is JSON and it fails parsing, its an invalid JSON.
      // In that case, just show the response as it is in the preview.
      return dataRaw;
    }

    if (filter) {
      try {
        data = JSONPath({ path: filter, json: data });
        return prettifyJson(JSON.stringify(data));
      } catch (e) {
        console.warn('Could not apply JSONPath filter:', e.message);
      }
    }

    // Prettify the JSON string directly instead of parse->stringify to avoid
    // issues like rounding numbers bigger than Number.MAX_SAFE_INTEGER etc.
    return prettifyJson(dataRaw);
  }

  if (mode.includes('xml')) {
    let parsed = safeParseXML(data, { collapseContent: true });
    if (typeof parsed === 'string') {
      return parsed;
    }
    return safeStringifyJSON(parsed, true);
  }

  if (typeof data === 'string') {
    return data;
  }

  return prettifyJson(dataRaw);
};

const formatErrorMessage = (error) => {
  if (!error) return 'Something went wrong';

  const remoteMethodError = "Error invoking remote method 'send-http-request':";
  
  if (error.includes(remoteMethodError)) {
    const parts = error.split(remoteMethodError);
    return parts[1]?.trim() || error;
  }

  return error;
};

const QueryResult = ({ item, collection, data, dataBuffer, dataRaw, width, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType, data);
  const [filter, setFilter] = useState(null);
  const formattedData = useMemo(
    () => formatResponse(data, dataRaw, mode, filter),
    [data, dataRaw, mode, filter]
  );
  const { displayedTheme } = useTheme();

  const debouncedResultFilterOnChange = debounce((e) => {
    setFilter(e.target.value);
  }, 250);

  const allowedPreviewModes = useMemo(() => {
    // Always show raw
    const allowedPreviewModes = [{ mode: 'raw', name: 'Raw', uid: uuid() }];

    if (mode.includes('html') && typeof data === 'string') {
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
      className="w-full h-full relative"
      style={{ maxWidth: width }}
      queryFilterEnabled={queryFilterEnabled}
    >
      <div className="flex justify-end gap-2 text-xs" role="tablist">
        {tabs}
      </div>
      {error ? (
        <div>
          {hasScriptError ? null : <div className="text-red-500">{formatErrorMessage(error)}</div>}

          {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
            <div className="mt-6 muted text-xs">
              You can disable SSL verification in the Preferences. <br />
              To open the Preferences, click on the gear icon in the bottom left corner.
            </div>
          ) : null}
        </div>
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
