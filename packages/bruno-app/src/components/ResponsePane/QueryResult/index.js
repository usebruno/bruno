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
import { uuid } from 'utils/common/index';
import { IconAlertCircle } from '@tabler/icons';

const formatResponse = (data, mode, filter) => {
  if (data === undefined) {
    return '';
  }

  if (data === null) {
    return 'null';
  }

  if (mode.includes('json')) {
    let isValidJSON = false;

    try {
      isValidJSON = typeof JSON.parse(JSON.stringify(data)) === 'object'
    } catch (error) {
      console.log('Error parsing JSON: ', error.message);
    }

    if (!isValidJSON && typeof data === 'string') {
      return data;
    }

    if (filter) {
      try {
        data = JSONPath({ path: filter, json: data });
      } catch (e) {
        console.warn('Could not apply JSONPath filter:', e.message);
      }
    }

    return safeStringifyJSON(data, true);
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

  return safeStringifyJSON(data, true);
};

const QueryResult = ({ item, collection, data, dataBuffer, width, disableRunEventListener, headers, error }) => {
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType, data);
  const [filter, setFilter] = useState(null);
  const formattedData = formatResponse(data, mode, filter);
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

  const renderScriptError = () => {
    if (!item?.hasPostResponseError) return null;

    return (
      <div className="absolute bottom-0 left-0 right-0 border-t border-red-500/20 bg-[#2b1619]">
        <div className="px-3 py-2.5">
          <div className="flex items-center text-red-400 mb-1.5">
            <IconAlertCircle size={14} className="stroke-current" />
            <span className="ml-1.5 text-xs font-medium">Post-Response Script Error</span>
          </div>
          <div className="font-mono text-[11px] leading-[16px] text-red-300/90 pl-[22px] whitespace-pre-wrap break-all">
            {item.postResponseErrorMessage}
          </div>
        </div>
      </div>
    );
  };

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
          <div className="text-red-500">{error}</div>

          {error && typeof error === 'string' && error.toLowerCase().includes('self signed certificate') ? (
            <div className="mt-6 muted text-xs">
              You can disable SSL verification in the Preferences. <br />
              To open the Preferences, click on the gear icon in the bottom left corner.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="h-full relative">
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
          {renderScriptError()}
        </div>
      )}
    </StyledWrapper>
  );
};

export default QueryResult;
